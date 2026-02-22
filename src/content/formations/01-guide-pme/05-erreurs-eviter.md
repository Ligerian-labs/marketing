# Chapitre 5 — Les 10 Erreurs à Éviter avec l'IA

On a accompagné des dizaines de PME dans leur adoption de l'IA. Voici les erreurs qu'on voit revenir systématiquement — et comment les éviter.

---

## Erreur 1 : Vouloir tout automatiser d'un coup

**Le symptôme :** "On va mettre de l'IA partout ! Support, ventes, compta, RH, tout en même temps."

**Pourquoi c'est un problème :** Vous dispersez vos efforts, personne ne maîtrise rien, et au premier bug, tout le monde se décourage.

**La solution :** Un projet à la fois. Maîtrisez-le. Mesurez le ROI. Puis passez au suivant. La tortue bat le lièvre.

---

## Erreur 2 : Faire confiance aveuglément à l'IA

**Le symptôme :** Copier-coller la réponse de ChatGPT dans un email client sans relire.

**Pourquoi c'est un problème :** L'IA hallucine. Elle invente des faits, se trompe dans les chiffres, et peut produire du contenu inapproprié. Un email avec des infos fausses envoyé à un client = crédibilité détruite.

**La solution :** L'IA produit des brouillons. Un humain valide. Toujours. C'est du "Human-in-the-loop", pas du "fire and forget".

**Règle d'or :** Plus les conséquences d'une erreur sont graves, plus la vérification humaine doit être rigoureuse.

---

## Erreur 3 : Négliger le RGPD

**Le symptôme :** Coller des données clients (noms, emails, numéros de téléphone) dans ChatGPT version gratuite.

**Pourquoi c'est un problème :** Vos données peuvent être utilisées pour l'entraînement du modèle. Vous êtes en infraction RGPD. Amende potentielle : jusqu'à 4% du CA.

**La solution :**
- Utilisez les versions entreprise des outils (ChatGPT Enterprise, Claude for Business)
- Anonymisez les données avant de les traiter avec l'IA
- Documentez votre usage dans votre registre de traitement
- Informez vos clients si l'IA traite leurs données

---

## Erreur 4 : Des prompts trop vagues

**Le symptôme :** "Écris-moi un email" → résultat générique et inutile → "L'IA c'est nul"

**Pourquoi c'est un problème :** L'IA fait exactement ce que vous lui demandez. Si votre demande est vague, la réponse sera vague.

**La solution :** Le framework CRISP pour vos prompts :
- **C**ontexte : Qui êtes-vous ? Dans quelle situation ?
- **R**ôle : Quel rôle l'IA doit-elle jouer ?
- **I**nstructions : Que doit-elle faire précisément ?
- **S**pécifications : Format, longueur, ton, contraintes
- **P**références : Exemples de ce que vous attendez

---

## Erreur 5 : Ignorer les coûts cachés

**Le symptôme :** "ChatGPT, c'est 20€/mois, c'est rien !" — 6 mois plus tard, la facture outils est à 500€/mois.

**Pourquoi c'est un problème :** Les abonnements s'empilent. L'API OpenAI facture à l'usage. Le temps de maintenance n'est pas comptabilisé.

**La solution :**
- Tenez un tableau des coûts IA (abonnements + API + temps humain)
- Revoyez chaque trimestre : est-ce que cet outil est toujours utilisé ? Le ROI est-il au rendez-vous ?
- Consolidez quand possible (un outil polyvalent plutôt que 5 outils spécialisés)

---

## Erreur 6 : Oublier la formation de l'équipe

**Le symptôme :** Vous achetez des outils IA, vous les déployez, et personne ne les utilise.

**Pourquoi c'est un problème :** L'outil le plus puissant est inutile si personne ne sait s'en servir. Adoption = 0, ROI = 0.

**La solution :**
- Dédiez 2-4h à la formation initiale (démo live + pratique)
- Identifiez un "champion IA" dans l'équipe (la personne tech-curieuse)
- Créez un document de prompts prêts à l'emploi pour chaque cas d'usage
- Faites un point mensuel : "Qu'est-ce qui marche ? Qu'est-ce qui bloque ?"

---

## Erreur 7 : Chercher la solution IA avant d'avoir le problème

**Le symptôme :** "On devrait utiliser l'IA pour..." sans avoir identifié un vrai problème business.

**Pourquoi c'est un problème :** Vous investissez du temps et de l'argent dans une solution sans problème. C'est du gaspillage.

**La solution :** Partez toujours du problème :
1. Quel processus vous fait perdre du temps/argent ?
2. Est-ce que l'IA peut aider ? (Parfois, un simple tableur suffit)
3. Si oui, quel outil est le plus adapté ?

---

## Erreur 8 : Ne pas mesurer

**Le symptôme :** "On utilise ChatGPT depuis 3 mois." — "Et ça apporte quoi ?" — "... Ben c'est pratique."

**Pourquoi c'est un problème :** Sans mesures, impossible de savoir si votre investissement est rentable. Impossible de justifier l'augmentation du budget. Impossible de prioriser.

**La solution :** Pour chaque projet IA, mesurez :
- Le temps gagné (heures/semaine)
- La qualité (taux d'erreur, satisfaction)
- Le coût total (abonnement + temps humain)
- Le ROI net

Utilisez le template de bilan du chapitre 4.

---

## Erreur 9 : Sous-estimer le temps d'ajustement

**Le symptôme :** "On a testé ChatGPT pendant 2 jours, les résultats sont moyens, on laisse tomber."

**Pourquoi c'est un problème :** L'IA n'est pas plug-and-play. Les premiers résultats sont rarement optimaux. Il faut itérer sur les prompts, ajuster les workflows, former l'équipe.

**La solution :** Donnez-vous **4 semaines minimum** avant de juger. Le cycle typique :
- Semaine 1 : "C'est pas mal" (premiers tests)
- Semaine 2 : "C'est décevant" (on rencontre les limites)
- Semaine 3 : "Ah, si je fais comme ça..." (on apprend à bien s'en servir)
- Semaine 4 : "OK, ça marche vraiment" (les résultats arrivent)

---

## Erreur 10 : Ne pas avoir de plan B

**Le symptôme :** Tout votre processus de support repose sur un chatbot IA. L'API tombe en panne. Plus personne ne peut répondre aux clients.

**Pourquoi c'est un problème :** L'IA est un outil, et les outils tombent en panne. OpenAI a des pannes régulières. Votre workflow Make.com peut bugger.

**La solution :**
- Gardez toujours la possibilité de revenir au processus manuel
- Ne supprimez pas l'ancien processus avant 3 mois de fonctionnement stable
- Ayez un plan de secours documenté : "Si l'IA tombe, voici la procédure manuelle"
- Diversifiez vos fournisseurs IA quand c'est possible (pas tout chez OpenAI)

---

## La méta-erreur : attendre

La plus grande erreur, c'est de ne rien faire. Pendant que vous hésitez, vos concurrents expérimentent. L'IA ne va pas disparaître — elle va devenir plus puissante et moins chère.

Le meilleur moment pour commencer, c'était il y a 6 mois. Le deuxième meilleur moment, c'est maintenant.

Commencez petit. Mesurez. Ajustez. Recommencez.

---

*Chapitre suivant : [Ressources et glossaire →](06-ressources.md)*
