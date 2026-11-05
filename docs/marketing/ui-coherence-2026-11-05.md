# Revue de cohérence UI et UX du 5 novembre 2026

Base examinée : `1f42b1c`, après intégration de l'offre confirmée.

## Causes et critères de validation

La composition des nouvelles pages et des anciens modèles laisse plusieurs
conventions concurrentes : titres de page, bordures de grilles, noms des offres
et liens de contact. Les filtres du blog ne traitent que la grille, alors que
l'article à la une appartient au même ensemble. Les couleurs de métadonnées,
liens et focus restent insuffisantes sur certains fonds sombres.

- Conserver l'identité Cobalt, les tarifs confirmés, les anciennes ancres et le
  contrat de contact.
- Partager la typographie des titres, fermer les grilles en retrait et garder
  des boutons complets quand ils passent à la ligne.
- Conserver le type de projet entre le service et le contact. Éviter les liens
  du hero vers la page déjà affichée.
- Aligner les libellés sur les offres commerciales et l'expertise IA.
- Filtrer aussi l'article à la une, annoncer le nombre exact de résultats et
  exposer l'état sélectionné des boutons.
- Rendre les métadonnées, liens, placeholders et focus lisibles sur leur fond.
- Vérifier les pages publiques à 1 440, 1 024, 390 et 320 px, ainsi que les
  parcours de contact et les conventions SEO existantes.

## Reproduction avant correction

Les trois tests de `tests/ui-coherence-browser.test.ts` échouent sur le build de
la base : 44 articles filtrables pour 45 articles affichés, lien de service sans
catégorie de contact et bord gauche manquant sur un bouton à 1 024 px.

Les changements de hiérarchie typographique et de bordures sont également
comparés par captures du navigateur. Ces contrôles visuels ne constituent pas
une mesure de conversion.

Le crawl complet a également reproduit un dépassement de 4 px des encarts du
kit presse à 390 et 320 px, ainsi qu'un tableau de comparaison qui élargissait
la page à 347 px sur un écran de 320 px. Le quatrième test couvre ces deux
cas. Les tableaux Markdown gardent leurs colonnes et leur sémantique dans une
région nommée, navigable au clavier et rendue sans JavaScript côté client.

## Vérifications et avis du conseil

Vérifications terminées le 2026-11-05 à 05:20 UTC dans la branche
`fix/marketing-ui-coherence`.

- Build Astro réussi.
- 88 tests TypeScript réussis, dont les contrôles contact et les quatre
  régressions UI. Aucun test ignoré.
- 17 tests SEO réussis. Le contrôle navigateur SEO valide 51 assertions.
- Parcours marketing validés dans 44 couples page et largeur, à 1 440,
  1 024, 390 et 320 px.
- Crawl des 61 pages marketing du sitemap et de la page 404 à 1 440, 390
  et 320 px : 186 contrôles, aucun dépassement horizontal.
- Lien du catalogue public de formations vers l'expertise IA vérifié sur une
  réponse SSR HTTP 200.
- Revue indépendante du défilement des tableaux et de leur sémantique avec
  JavaScript désactivé. Focus, navigation au clavier et filtres également vérifiés.

Les trois avis du conseil sont favorables : cohérence visuelle, parcours et
accessibilité. Les dernières corrections des encarts et des tableaux ont reçu
une nouvelle validation visuelle et d'accessibilité. Le vocabulaire du kit
presse et du lien public des formations a reçu une validation des parcours.

Les métadonnées sur fond sombre mesurent 7,77:1 de contraste, les placeholders
4,98:1. Aucun lint ni typecheck n'est configuré dans ce dépôt. Les captures et
journaux locaux sont dans `/tmp/marketing-ui-coherence/`. Ces résultats portent
sur le candidat local, avant fusion et déploiement.
