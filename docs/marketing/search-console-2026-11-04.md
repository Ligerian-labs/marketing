# Point de départ Search Console au 4 novembre 2026

Du 3 août au 2 novembre 2026, la propriété exportée totalise **17 clics et 1 493 impressions**, soit un taux de clic de **1,14 %**. La visibilité observée reste faible. Ces données précèdent la mise en ligne des modifications proposées dans les PR #97 à #100 et serviront de point de comparaison après publication.

L'export inclut `ligerianlabs.fr` et le sous-domaine personnel `valentin.ligerianlabs.fr`. Les 17 clics ne représentent donc pas uniquement le site commercial. Le type exact de propriété et les droits du compte ne sont pas établis par les CSV.

## Période et mesures

Source fournie par le dirigeant : dossier `ligerianlabs.fr-Performance-on-Search-2026-11-04`, recherche « Web (textuel) », filtre « Les 3 derniers mois ». Les 92 dates quotidiennes sont continues. Les [mesures et empreintes SHA-256 des sept CSV](search-console-2026-11-04.json) permettent de retrouver les calculs ; les fichiers bruts restent dans le dossier privé d'import.

| Mesure au niveau de la propriété | Résultat |
| --- | ---: |
| Clics | 17 |
| Impressions | 1 493 |
| Taux de clic, clics divisés par impressions | 1,14 % |
| Position moyenne reconstruite depuis les lignes quotidiennes arrondies | Environ 36,93 |
| France | 15 clics, 1 390 impressions |
| Ordinateur | 14 clics, 1 262 impressions |
| Mobile | 3 clics, 228 impressions |
| Tablette | 0 clic, 3 impressions |

La position reconstruite pondère chaque position quotidienne par ses impressions. Elle reste approximative, car les valeurs source sont arrondies. Elle ne décrit pas un classement fixe. [Google définit les métriques et leurs regroupements](https://support.google.com/webmasters/answer/7576553?hl=en).

| Période | Jours | Clics | Impressions | Taux de clic |
| --- | ---: | ---: | ---: | ---: |
| 3 au 31 août | 29 | 5 | 659 | 0,76 % |
| Septembre | 30 | 8 | 434 | 1,84 % |
| Octobre | 31 | 3 | 369 | 0,81 % |
| 1 et 2 novembre | 2 | 1 | 31 | 3,23 % |

Les 28 derniers jours, du 6 octobre au 2 novembre, comptent 2 clics et 344 impressions. Les 28 jours précédents, du 8 septembre au 5 octobre, comptent 9 clics et 348 impressions. Les impressions sont proches ; le faible nombre de clics ne suffit pas à établir une baisse durable ni sa cause. Les mois incomplets ne doivent pas être comparés comme des mois complets.

## Pages et recherches locales

| URL dans la table Pages | Clics | Impressions | Position moyenne de la ligne |
| --- | ---: | ---: | ---: |
| `https://ligerianlabs.fr/` | 9 | 54 | 16,11 |
| `https://ligerianlabs.fr/a-propos/` | 2 | 25 | 7,68 |
| `https://ligerianlabs.fr/ia-angers/` | 1 | 292 | 35,76 |
| `https://ligerianlabs.fr/offres/` | 0 | 43 | 5,91 |
| `https://ligerianlabs.fr/contact/` | 0 | 14 | 3,43 |
| `https://ligerianlabs.fr/blog/memoire-ia-pourquoi-votre-assistant-oublie-tout/` | 0 | 704 | 46,37 |
| `https://valentin.ligerianlabs.fr/fr/` | 2 | 29 | 12,69 |

Le site commercial compte 15 clics dans les lignes Pages ; le sous-domaine personnel en compte 2. Il s'agit de regroupements par URL, pas de nouveaux totaux calculés au niveau de chaque propriété.

La requête visible « agence ia angers » compte 90 impressions, 1 clic et une position moyenne de 28,81. « meilleure agence ia angers » compte 11 impressions sans clic, position 22,73. « agence ia cholet » compte 140 impressions sans clic, position 47,12. Les tables fournies ne croisent pas requête et page : elles ne permettent pas d'attribuer ces recherches à une URL précise.

L'article sur la mémoire IA reçoit le plus d'impressions parmi les URL exportées, sans clic. Ce volume ne démontre pas une intention d'achat. Pour le prochain suivi, examiner séparément les pages de services et les articles, puis relier les demandes qualifiées à leur origine lorsque la mesure le permet.

## Limites qui changent la lecture

La table Pages compte 33 URL et 1 625 impressions, alors que le graphique compte 1 493 impressions. Les pages et la propriété utilisent des agrégations différentes ; leurs impressions ne s'additionnent pas. [Google explique la différence entre regroupement par propriété et par page](https://support.google.com/webmasters/answer/17011364?hl=en).

Les 57 requêtes visibles ne totalisent que 1 clic et 1 115 impressions. Les 16 autres clics ne peuvent pas être classés en marque ou hors marque à partir de cet export. Google omet notamment les requêtes anonymisées dans la table tout en les incluant dans le graphique. [Explication des écarts de données](https://support.google.com/webmasters/answer/17010575?hl=en).

Les 33 URL observées ne constituent pas un inventaire des pages actuellement indexées. Les variantes avec et sans slash apparaissant dans l'export ne prouvent pas un défaut de canonicalisation actuel. Le rapport Indexation et l'inspection des URL restent nécessaires pour connaître les exclusions et les URL canoniques choisies par Google.

## Prochain suivi avant et après publication

1. Exporter Indexation → Pages et inspecter l'accueil, `/ia-angers/`, `/offres/` et `/contact/`, puis les nouvelles pages de services après publication. Conserver les motifs d'exclusion et les URL canoniques choisies.
2. Obtenir les rapports PostHog agrégés sur la même période, ainsi que le lien et l'état de propriété du Google Business Profile. Ce fichier ne mesure ni Maps, ni les demandes, ni leur qualification commerciale.
3. Revoir l'aperçu après rapprochement de l'offre confirmée à 2 000 € par mois de construction, avec maintenance sur devis distinct. Les réalisations restent des prototypes indépendants tant qu'aucune preuve client n'est disponible.
4. À la publication autorisée, enregistrer date et commit, vérifier le parcours de contact et la réception des événements. Comparer ensuite des périodes complètes de même durée avec le même périmètre de propriété. Fixer les objectifs de demandes après rapprochement avec la capacité de livraison et les demandes réellement qualifiées.

Le [suivi de la première vague](https://github.com/Ligerian-labs/marketing/issues/93) conserve les preuves techniques et les limites de livraison. Cette analyse ne change pas les verdicts de revue, n'autorise aucune fusion et ne constitue pas une mesure de résultat des modifications proposées.
