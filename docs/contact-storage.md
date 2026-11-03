# Stockage des demandes de contact

Ce document décrit où le formulaire de contact enregistre les demandes, ce que le
serveur garantit, et comment inspecter ou reconstruire l'index à la main. Aucune
réparation n'est faite automatiquement sur un serveur en production.

## Ce qui est écrit, et dans quel ordre

Dossier : `CONTACT_LEADS_DIR`, sinon `./leads` (dans l'image Docker : `/app/leads`, à monter
en volume pour survivre à un redéploiement).

| Fichier | Rôle |
| --- | --- |
| `leads/<id>.json` | **Enregistrement de référence.** Une demande par fichier, écrite en entier avant la réponse HTTP 200. Jamais supprimée ni réécrite par le serveur. |
| `leads/leads.jsonl` | **Index dérivé**, une ligne JSON par demande, ajoutée après le fichier. Best effort : il peut manquer des lignes, il ne contient jamais de ligne sans fichier. |

Garanties du serveur, pour un seul processus qui écrit dans le dossier :

1. Une réponse 200 avec un `id` signifie que `leads/<id>.json` existe en entier.
2. Si l'écriture de l'index échoue, la demande reste acceptée. Le serveur écrit
   `[LEAD] <id> saved, index row not written: …` dans ses logs.
3. Avant chaque ajout, l'index doit se terminer par un retour à la ligne. Une ligne
   à moitié écrite est coupée. Si le serveur ne peut pas lire ou réparer la fin de
   l'index, il n'y écrit rien.
4. Si le fichier de la demande ne peut pas être écrit, la réponse est 500, sans `id`,
   sans email et sans événement analytique.

Limite : **un seul processus serveur** doit écrire dans ce dossier. Deux processus (deux
conteneurs sur le même volume, par exemple) peuvent entrelacer des lignes de l'index.
Les fichiers `<id>.json` restent valides dans ce cas, car les identifiants sont aléatoires.

Les demandes antérieures à ce changement ont un autre format (`message`, `stade`, `role`
à la place de `description`, `projectType`…). Elles restent valables et sont conservées.

## Inspecter et compter

Les fichiers font foi, pas l'index. Depuis le dossier qui contient `leads/` :

```sh
ls leads/lead_*.json | wc -l      # fichiers lead_*.json présents, valides ou non
wc -l < leads/leads.jsonl         # lignes de l'index (peut être plus bas)
```

Ces deux nombres sont bruts. Le premier compte aussi les fichiers mal formés ; il ne donne
donc pas le nombre de demandes valides. Pour ce nombre, lancez le contrôle sans écriture
de la section suivante (`node rebuild-leads-index.mjs leads`) : il lit chaque fichier et
sépare les valides des invalides.

Un index plus court que le nombre de fichiers valides est normal après une erreur
d'écriture. Un index plus long ne doit pas arriver : conservez le dossier tel quel et
regardez les logs avant de toucher à quoi que ce soit.

## Fichiers mal formés

Un fichier est considéré valide s'il se lit comme du JSON, si son `id` correspond à son nom
de fichier, et s'il contient `timestamp`, `name` et `email` sous forme de textes. Un fichier
qui ne remplit pas ces conditions est invalide, sans qu'on sache pourquoi : arrêt brutal
pendant l'écriture, édition manuelle, copie incomplète. Les octets actuels ne disent pas
si le serveur a répondu 200 au visiteur. Les logs et le journal d'accès du serveur, s'ils
existent, permettent de le savoir.

Ne supprimez pas un fichier invalide : déplacez-le dans `leads/quarantine/` pour qu'une
personne l'examine. Il peut contenir le texte d'un visiteur.

## Données personnelles et Git

Tout ce qui se trouve sous `leads/` contient des données de visiteurs : fichiers de demande,
index, copies `leads.jsonl.old` et `.new`, dossier `quarantine/`. Le `.gitignore` du dépôt
ignore tout `leads/` sauf `.gitkeep`, ainsi que les dossiers `leads-backup-*` et
`leads.backup-*` à la racine. Gardez de préférence les sauvegardes hors du dépôt, comme
dans la procédure ci-dessous, avec des droits restreints.

## Reconstruire l'index (service arrêté)

À faire sur une copie, ou en production seulement après accord du responsable du site.

1. Arrêter le service, pour qu'aucun processus n'écrive dans le dossier.
2. Sauvegarder hors du dépôt, avec des droits restreints :
   ```sh
   BACKUP="$HOME/leads-backup-$(date -u +%Y%m%dT%H%M%SZ)"
   (umask 077; cp -R leads "$BACKUP")
   ls -ld "$BACKUP" "$BACKUP"/* | head -3    # doit afficher drwx------ puis -rw-------
   ```
   N'utilisez pas `cp -a` : il recopie les droits d'origine (souvent 755 et 644) et `umask`
   ne les resserre pas. `cp -R` ne conserve pas les dates de modification ; c'est sans importance
   ici. Si le dossier parent de la sauvegarde est lisible par d'autres comptes, choisissez-en un
   qui ne l'est pas.
3. Enregistrer le script ci-dessous sous `rebuild-leads-index.mjs`, hors du dossier `leads/`.
4. Contrôler sans rien écrire : `node rebuild-leads-index.mjs leads`
5. Appliquer : `node rebuild-leads-index.mjs leads --write`
   Les fichiers invalides vont dans `leads/quarantine/`. Le nouvel index est écrit
   dans `leads/leads.jsonl.new`, puis remplace `leads/leads.jsonl`. L'ancien index est
   gardé sous `leads/leads.jsonl.old`. Si `leads/leads.jsonl.old` ou un fichier du même nom
   existe déjà dans `leads/quarantine/`, le script s'arrête avant de modifier quoi que ce soit :
   déplacez ces fichiers ailleurs (ou renommez-les) et relancez.
6. Redémarrer le service et envoyer une demande de test depuis un environnement de
   préproduction, pas depuis la production.

```js
// rebuild-leads-index.mjs : node rebuild-leads-index.mjs <dossier leads> [--write]
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const write = process.argv.includes("--write");
if (!dir) throw new Error("usage: node rebuild-leads-index.mjs <dossier leads> [--write]");

const valid = [];
const invalid = [];
for (const file of readdirSync(dir).filter((f) => /^lead_.+\.json$/.test(f)).sort()) {
  try {
    const lead = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const ok = ["id", "timestamp", "name", "email"].every((k) => typeof lead[k] === "string");
    if (ok && `${lead.id}.json` === file) valid.push(lead);
    else invalid.push(file);
  } catch {
    invalid.push(file);
  }
}
valid.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));

const indexed = existsSync(join(dir, "leads.jsonl"))
  ? readFileSync(join(dir, "leads.jsonl"), "utf8").split("\n").filter(Boolean).length
  : 0;
console.log(`fichiers valides : ${valid.length}`);
console.log(`fichiers invalides : ${invalid.length}${invalid.length ? " (" + invalid.join(", ") + ")" : ""}`);
console.log(`lignes dans l'index actuel : ${indexed}`);
if (!write) process.exit(0);

const clashes = [...invalid.map((f) => join(dir, "quarantine", f)), join(dir, "leads.jsonl.old")].filter((f) => existsSync(f));
if (clashes.length) {
  console.error(`arrêt, rien n'a été modifié : existe déjà : ${clashes.join(", ")}`);
  process.exit(1);
}
if (invalid.length) {
  mkdirSync(join(dir, "quarantine"), { recursive: true });
  for (const f of invalid) renameSync(join(dir, f), join(dir, "quarantine", f));
}
writeFileSync(join(dir, "leads.jsonl.new"), valid.map((l) => JSON.stringify(l) + "\n").join(""));
if (existsSync(join(dir, "leads.jsonl"))) renameSync(join(dir, "leads.jsonl"), join(dir, "leads.jsonl.old"));
renameSync(join(dir, "leads.jsonl.new"), join(dir, "leads.jsonl"));
console.log(`index reconstruit : ${valid.length} lignes`);
```

Le script ne modifie jamais un fichier `<id>.json` valide. Il ne parle à aucun service
réseau et n'a besoin d'aucune dépendance.
