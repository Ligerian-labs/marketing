# Suivi du plan marketing

Le [plan de 90 jours](90-day-plan.md) conserve le brief fourni le 3 novembre 2026, ses neuf volets, les formulations proposées, l'ordre de l'accueil, les pages, les sujets d'articles, les estimations et les décisions J30/J60/J90. Il décrit un travail prévu, pas des faits commerciaux vérifiés. Le site reste destiné aux entreprises francophones autour d'Angers qui commandent un logiciel ou une intégration IA, tout en conservant les offres IA en production et l'identité visuelle.

## Point de départ avant modification

Capture du site public le **2026-11-03 à 14:28:37 UTC**, base Git `9026f4d3111da89c4191ce725b6f44e8289d039d`. Les mesures HTTP sont conservées dans [baseline-2026-11-03.json](baseline-2026-11-03.json). Les réponses HTML intégrales restent dans le dossier privé du run `marketing-20261103`, fichiers `baseline-live-*`. Elles ne contiennent pas de données de prospects soumises.

| Observation vérifiée | Résultat avant modification |
| --- | --- |
| `/` | HTTP 200, 25 464 octets |
| `/ia-angers` et `/ia-angers/` | HTTP 200 tous deux, 20 341 octets chacun |
| `/services` | HTTP 301 vers `/offres` |
| `/contact/` | HTTP 200, 17 907 octets |
| `/sitemap.xml` | HTTP 200, 10 731 octets ; pages sans slash final ; date du build pour toutes les pages statiques |
| Sources sur la base | 45 articles, 11 destinations publiques dans le sitemap ; pages marketing, formations publiques, espace client privé |
| Analytics sur la base | PostHog chargé globalement, autocapture et pages/referrers automatiques ; aucun export de compte fourni |
| Build sur la base | installation npm figée puis build réussis ; scripts dev/build/preview seulement, aucun lint/typecheck/test configuré |
| Mobile | Débordement de l'accueil à 390 px constaté par la coordination avant modification ; correction attribuée à A |

L'inventaire source comprend accueil, offres, approche, à propos, contact, deux pages Angers, blog, formations, kit presse et mentions légales. Les achats, comptes, contenus de formation réservés et tableaux de bord ne sont pas des destinations SEO publiques. `/ia-angers-pme/` est conservée, faute de données permettant une consolidation. Les nouveaux services et projets A sont découverts seulement lorsque leurs fichiers existent dans la branche construite.

## Affirmations existantes, faits à confirmer et accès manquants

Les textes actuels du site sont des affirmations publiées, pas des preuves externes. La fondation en 2021, la précision des coordonnées géographiques et la tranche de prix du schéma n'étaient pas étayées ; elles sont retirées du schéma partagé. Le fondateur nommé et la zone d'Angers reprennent le contenu existant. Les deux identifiants `#organization` et `#business` désignent la même marque publique ; aucun lien de société mère n'est affirmé. Sans adresse vérifiée complète, aucune éligibilité à un résultat enrichi LocalBusiness n'est promise.

| À confirmer par le dirigeant | État et prochaine action |
| --- | --- |
| Nom légal, identifiants et relation avec la marque Ligerian Labs | La page légale dit « raison sociale Ligerian Labs » mais omet les identifiants d'entité. Relation juridique/commerciale non vérifiée ; question en attente |
| Date de création distincte de l'expérience du fondateur | Non vérifiée ; ne pas déduire l'âge de l'entreprise de son parcours |
| Offres réellement disponibles, propriété, hébergement, maintenance, capacité | Confirmer périmètres et disponibilité avant publication |
| Visites clients, accueil physique, zone et horaires réels | Conditionnent l'éligibilité et la configuration Google Business Profile |
| Engagement de réponse sous 48 h ouvrées | Présent sur le site, copié par B ; confirmation du dirigeant demandée, sans réponse à ce stade |
| Base légale, responsable, sous-traitants, durées de conservation | Assertions légales existantes laissées inchangées ; confirmation du propriétaire requise, aucune validation juridique déduite des modifications techniques |
| Noms clients, captures, témoignages, résultats | Autorisations et preuves non fournies ; aucun résultat client inventé |
| Relation entre projets publics et prestations clients | Assistant Export et Contremaitre sont présentés par A comme projets indépendants en développement ; aucune preuve de déploiement client ou résultat mesuré |

Trafic, conversions, demandes qualifiées, impressions/clics, requêtes locales, pages indexées et URL choisies par Google restent **inconnus**. Il faut vérifier l'accès Search Console et exporter les trois derniers mois. L'observation HTTP ne prouve ni l'indexation ni les performances commerciales. Google Business Profile, son contrôleur, son éligibilité, sa vérification et la visibilité Maps restent inconnus sans accès propriétaire. Les objectifs chiffrés attendent le point de départ et la capacité de livraison.

## Mesure et contrat de contact

Le bootstrap global initialise PostHog uniquement sur `ligerianlabs.fr` et `www.ligerianlabs.fr`, pour les pages publiques indexables et les visiteurs non connectés. Aucun chargement sur localhost, aperçu, pages privées ou navigateur ayant `localStorage.ll_analytics_disabled = "1"`. Pour un test interne sur le domaine public, définir cet opt-out puis recharger avant le parcours. Les tests navigateur bloquent aussi les requêtes analytics.

Autocapture, enregistrement de session, profils identifiés, pages automatiques et enquêtes sont désactivés. L'identifiant anonyme est en mémoire seulement. La politique HTML `no-referrer` empêche aussi la query du document de partir dans les en-têtes des requêtes SDK/proxy. Le filtre d'envoi conserve une catégorie de page bornée, le jeton public du projet et les identifiants anonymes au format UUID. Il supprime URL, requêtes, fragments, referrer, titre, coordonnées, saisies et propriétés libres. Les pages sont regroupées par catégorie ; ce réglage ne fournit pas un suivi longitudinal ou une attribution détaillée des campagnes.

| Événement | Condition | Propriétés métier autorisées |
| --- | --- | --- |
| `$pageview` | page publique autorisée | `page`, catégorie bornée |
| `email_contact_click` | clic mailto sur page autorisée | `page` ; aucune adresse ou corps du lien |
| `service_enquiry_click` | lien interne vers contact depuis offres, logiciel, intégration IA ou Angers | `page` ; aucune query ou ancre |
| `contact_form_submitted` | B uniquement, après réponse acceptée du serveur | `project_type` parmi `new-application`, `existing-software`, `ai-integration`, `other`, plus catégorie `page` ajoutée globalement |
| `blog_post_viewed` | événement historique conservé | catégorie `page` uniquement, sans titre ni tags libres |

B n'utilise que `window.posthog` et gère son absence/échec. L'acceptation d'un formulaire dépend du serveur, jamais de l'analytics. Aucune mesure réelle de réception PostHog n'est revendiquée par les tests locaux.

Le contrat B final collecte nom, email, entreprise facultative, type de projet, description, délai/budget facultatifs et consentement vrai. Le stockage ajoute identifiant, horodatage, libellé du type de projet et statut `new`. Le honeypot `website` est jeté ; aucun IP/UA n'est stocké par ce code. La notification Resend facultative suit la persistance et sert à répondre à la demande. La liste factuelle des mentions légales est alignée sur ce contrat lors de la composition A/B/C ; les autres assertions légales attendent confirmation.

## Convention et vérification avant mise en ligne

`npm start`, soit `node scripts/server/entry.mjs`, est l'entrée de production, y compris dans Docker. Le serveur importe le handler standalone natif avec son démarrage automatique désactivé. Les pages statiques, le SSR et les sessions passent par ce handler. Les GET/HEAD vers des versions sans slash ou `/index.html` de pages publiques existantes sont redirigés en 301, query intacte. `/services` et `/services/` vont directement vers `/offres/`. Les API, auth, Stripe, ingest, fichiers et routes inconnues ne sont pas normalisés. Les fragments restent gérés par le navigateur ; les identifiants `voir`, `livrer`, `reconstruire`, `automatiser` sont conservés.

Le sitemap découvre les fichiers `.astro` publics sans paramètres et les articles de la collection. Il écarte les pages privées, erreurs, redirections et celles déclarées noindex. Toute nouvelle route publique dynamique hors blog doit fournir une découverte explicite et un test avant publication. `lastmod` utilise le dernier commit du fichier source, non le build. En archive ou Docker sans Git, la date statique est omise et les articles utilisent leur date rédigée. Les changements de composants partagés ne constituent pas automatiquement une nouvelle date de chaque contenu ; vérifier les modifications significatives avant publication.

L'ancien démarrage direct `node dist/server/entry.mjs` et `npm run preview` servent toujours le handler natif mais contournent la normalisation des pages prérendues. Les contrôles de release doivent utiliser `npm start` ou la commande Docker mise à jour. Le couple scripts/dist doit être livré ensemble et reconstruit avec `npm run build` après changement de source.

Voir le README racine pour les commandes de tests. Vérifier les redirections, canonicals/og:url, tous les loc du sitemap, schémas connectés, ancres, assets, parcours auth/Stripe sans création d'achat et suppression des analytics locaux. Les tests n'envoient aucune demande commerciale en production et utilisent des données locales éphémères. Mobile accueil et formulaire relèvent aussi des contrôles A/B ; ne pas transformer la couverture C en validation de toute la release.

Références primaires consultées le 3 novembre 2026 : [canonicals Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [qualité des données structurées Google](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [LocalBusiness Google](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Astro trailingSlash](https://docs.astro.build/en/reference/configuration-reference/#trailingslash), [configuration PostHog](https://posthog.com/docs/libraries/js/config). Le comportement réel de l'adapter a été contrôlé dans les versions installées Astro 5.17.1 / @astrojs/node 9.5.2.

## Journal et décisions mensuelles

- 2026-11-03T14:28:37Z : capture publique avant édition, aucune donnée de compte disponible.
- 2026-11-03T14:30:38Z : runtime C vérifié, modèle demandé/observé gpt-6.1-sol, politique full-access/never.
- 2026-11-03T14:44:34Z : correctifs C en cours dans une branche dédiée ; cinq assertions régressives échouaient sur la base avant édition, un contrôle API sûr passait. Les changements de code ne sont ni fusionnés ni déployés.

Avant de publier une nouvelle date ou un résultat, inscrire l'heure UTC mesurée, le commit/PR, ce qui a changé, les vérifications et la disponibilité réelle. Les corrections A/B/C restent des candidats jusqu'à la revue puis une fusion/diffusion explicitement autorisée.

J30 : revoir indexation, canonicals choisis, suivi et pages livrées. J60 : revoir requêtes pertinentes, pages et qualification des demandes. J90 : décider selon les données, découverte faible → indexation/pertinence/références externes ; impressions en hausse sans clics → titres/descriptions ; visites pertinentes sans demandes → preuves/offres/contact ; demandes qualifiées en hausse → développer les services/projets associés. Ne pas inventer de seuil ni de cible de leads avant les mesures.

Le dirigeant possède les faits, permissions clients, profils externes et suivi commercial. La coordination possède la composition et la validation de release. Le développement fournit des PR et une preuve technique. Search Console, Business Profile, permissions, nouveaux articles de campagne, prise de contact externe, fusion et déploiement restent des actions ultérieures avec leurs autorisations propres.
