# Logique fonctionnelle — Révélation des résultats

## 1. Objectif

L'application doit transformer l'affichage des résultats en une **séquence de révélation contrôlée**, destinée à créer du suspense avant de donner accès à la consultation libre de l'ensemble des résultats.

La priorité de cette phase est le **fonctionnement** de la séquence. Le design visuel, les couleurs, les effets graphiques détaillés et le choix définitif du framework ne sont pas définis ici.

## 2. Principe général

Lorsqu'un utilisateur arrive sur la page des résultats :

1. la séquence de révélation démarre automatiquement ;
2. les résultats sont révélés **un par un** ;
3. la séquence est **non accélérable et non escamotable** ;
4. les candidats retenus sont révélés dans l'ordre :
   - rang 4 ;
   - rang 3 ;
   - rang 2 ;
   - rang 1 ;
5. les candidats non retenus sont révélés ensuite ;
6. lorsqu'une révélation est terminée, l'application passe automatiquement à la suivante selon le scénario prévu ;
7. tant que la séquence n'est pas terminée, le défilement libre de la page n'est pas autorisé ;
8. à la fin de la séquence, la page redevient une page de résultats normale et l'utilisateur peut faire défiler librement.

## 3. Séquence exacte

### Phase A — Initialisation

À l'ouverture de la page :

- charger les résultats disponibles ;
- déterminer les candidats retenus et non retenus ;
- déterminer l'ordre de révélation des retenus ;
- préparer la séquence ;
- démarrer la musique de suspense ;
- désactiver le défilement libre.

Aucun résultat complet ne doit être affiché avant le début de la révélation.

### Phase B — Révélation des retenus

Les candidats retenus sont révélés dans cet ordre :

```text
4 → 3 → 2 → 1
```

Pour chaque candidat :

1. présenter le candidat dans un état masqué / non révélé ;
2. déclencher l'animation de révélation ;
3. afficher son identité ;
4. afficher son rang ;
5. afficher sa note totale ;
6. afficher le détail des notes :
   - Justesse ;
   - Rythme ;
   - Timbre ;
   - Interprétation ;
7. afficher son statut de retenu ;
8. laisser le temps prévu par la séquence avant de passer au candidat suivant.

L'animation doit rester sous le contrôle de l'application : l'utilisateur ne doit pas pouvoir la réduire à zéro, la faire avancer manuellement ou afficher immédiatement le résultat suivant.

### Phase C — Révélation des non-retenus

Après la révélation du rang 1 :

```text
Rang 4
↓
Rang 3
↓
Rang 2
↓
Rang 1
↓
Non retenus
```

Les candidats non retenus sont alors affichés.

Le système doit conserver une séparation logique claire entre :

- les candidats retenus ;
- les candidats non retenus.

L'ordre exact des non-retenus peut être déterminé par les données disponibles, mais il doit être **stable et déterministe**.

## 4. Blocage du défilement

Le défilement est contrôlé pendant toute la séquence de révélation.

### Pendant la séquence

Le comportement attendu est :

```text
Animation en cours
      ↓
Scroll bloqué
      ↓
Révélation automatique
```

L'utilisateur ne doit pas pouvoir :

- descendre librement dans la page ;
- remonter vers une révélation précédente pour contourner le suspense ;
- faire défiler rapidement vers la fin ;
- utiliser la molette, le touch scroll ou les gestes tactiles pour contourner la séquence.

Les interactions utilisées par l'application elle-même pour gérer l'animation ne doivent pas être considérées comme un contournement utilisateur.

### Après la séquence

Une fois **toutes** les révélations terminées :

```text
Animation terminée
      ↓
Scroll réactivé
      ↓
Consultation libre des résultats
```

À partir de ce moment :

- l'utilisateur peut faire défiler la page ;
- tous les résultats déjà révélés restent consultables ;
- la page fonctionne comme une interface normale de consultation.

## 5. Musique de suspense

Une musique de fond accompagne la séquence.

Elle doit avoir une fonction narrative :

- créer une attente ;
- maintenir la tension ;
- accompagner les transitions ;
- renforcer les moments de révélation ;
- se terminer ou changer d'état lorsque la séquence est terminée.

### Synchronisation logique

Le système doit pouvoir associer des événements de l'application à la musique :

```text
Début séquence
   ↓
Musique démarre
   ↓
Révélation rang 4
   ↓
Transition musicale
   ↓
Révélation rang 3
   ↓
Transition musicale
   ↓
Révélation rang 2
   ↓
Transition musicale
   ↓
Révélation rang 1
   ↓
Révélation des non-retenus
   ↓
Fin de séquence
   ↓
Musique terminée / arrêtée selon le scénario
```

Le choix du fichier audio et son traitement précis seront définis séparément.

## 6. Données utilisées

La séquence doit utiliser les données déjà disponibles dans le dépôt.

Les éléments nécessaires pour chaque candidat sont notamment :

- `id`
- `name`
- `total`
- `status`
- `scores.justesse`
- `scores.rythme`
- `scores.timbre`
- `scores.interpretation`

Le système ne doit **pas utiliser les images des candidats** pour cette expérience.

Les champs déjà présents dans les données doivent être privilégiés plutôt que de dupliquer l'information dans le code.

## 7. Gestion du classement

La séquence des retenus dépend d'un classement explicite :

```text
rang 1
rang 2
rang 3
rang 4
```

L'affichage doit ensuite parcourir ce classement dans le sens inverse :

```text
4 → 3 → 2 → 1
```

### Important

La règle métier utilisée pour déterminer le classement doit être claire et déterministe avant l'exécution de la séquence.

L'interface de révélation ne doit pas inventer silencieusement un classement en cas d'égalité.

Si deux candidats ont la même note et qu'une règle de départage est nécessaire, cette règle devra être définie dans les données ou dans la logique métier dédiée.

## 8. États fonctionnels

La logique peut être représentée par les états suivants :

```text
IDLE
  ↓
LOADING
  ↓
REVEALING_RANK_4
  ↓
REVEALING_RANK_3
  ↓
REVEALING_RANK_2
  ↓
REVEALING_RANK_1
  ↓
REVEALING_NON_RETAINED
  ↓
COMPLETED
  ↓
NORMAL_BROWSING
```

### `IDLE`

La page vient d'être ouverte.

### `LOADING`

Les résultats et les paramètres nécessaires sont chargés.

### `REVEALING_RANK_X`

Une révélation de candidat retenu est en cours.

Pendant cet état :

- défilement bloqué ;
- progression automatique ;
- pas d'accélération utilisateur.

### `REVEALING_NON_RETAINED`

Les candidats non retenus sont affichés après tous les retenus.

### `COMPLETED`

Toutes les révélations sont terminées.

Le verrouillage de la séquence est levé.

### `NORMAL_BROWSING`

L'utilisateur peut désormais consulter la page librement.

## 9. Contraintes fonctionnelles

### Non-skippable

La séquence ne doit pas proposer de :

- bouton « passer » ;
- bouton « révéler tout » ;
- bouton « suivant » destiné à l'utilisateur ;
- raccourci clavier permettant de sauter la séquence.

### Non-accélérable

L'utilisateur ne doit pas pouvoir modifier la vitesse de l'animation depuis l'interface.

Les durées de la séquence sont déterminées par l'application.

### Révélation séquentielle

Un résultat ne doit être considéré comme révélé qu'après la fin de l'étape d'animation correspondante.

### Cohérence des données

Chaque candidat affiché doit provenir des données chargées par l'application.

Aucun résultat fictif ou texte de démonstration ne doit apparaître à la place d'un candidat réel.

## 10. Comportement en cas de problème de données

Si les résultats ne sont pas disponibles ou si les données nécessaires sont invalides :

- ne pas lancer une séquence incohérente ;
- afficher un état d'information approprié ;
- éviter de produire un faux classement.

Si le nombre de retenus n'est pas exactement 4, la logique doit rester robuste et ne pas provoquer d'erreur JavaScript.

## 11. Fin de l'expérience

La fin de la séquence constitue une transition importante :

```text
Révélation contrôlée
        ↓
Tous les résultats ont été présentés
        ↓
Fin de la musique / transition
        ↓
Déverrouillage du scroll
        ↓
Mode consultation libre
```

La consultation normale doit être possible sans recharger la page.

## 12. Critères d'acceptation

La fonctionnalité sera considérée comme conforme lorsque :

- l'ouverture du site déclenche automatiquement la séquence ;
- aucun résultat complet n'est visible avant sa révélation ;
- le premier retenu révélé est le rang 4 ;
- la séquence continue avec les rangs 3, 2 puis 1 ;
- les non-retenus apparaissent après les retenus ;
- le nom, le rang, la note totale et le détail des notes sont affichés pour chaque candidat ;
- aucune image de candidat n'est utilisée ;
- le défilement est bloqué pendant la révélation ;
- l'utilisateur ne peut ni sauter ni accélérer la séquence ;
- la musique accompagne la séquence ;
- le défilement est réactivé uniquement après la fin de toutes les révélations ;
- après la séquence, tous les résultats restent consultables normalement.

## 13. Hors périmètre de ce document

Ce document ne fixe pas encore :

- le design visuel final ;
- les couleurs ;
- les typographies ;
- les animations graphiques détaillées ;
- le framework définitif (React ou autre) ;
- le choix définitif de la musique ;
- les contrôles administratifs ;
- les mécanismes de publication des résultats.

Il fixe uniquement le **comportement fonctionnel de la révélation des résultats**.
