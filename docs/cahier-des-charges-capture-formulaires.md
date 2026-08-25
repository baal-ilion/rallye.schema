# Cahier des charges — Capture photographique des formulaires

## 1. Objectif

Permettre à un organisateur d’utiliser le front Rallye Schéma sur un smartphone ou un ordinateur équipé d’une caméra pour photographier plusieurs pages de formulaires corrigés, puis retrouver ces pages dans le flux existant **Vérification des formulaires**.

Le nouveau parcours ne crée pas une nouvelle étape métier. La correction photographique et l’import de fichiers convergent vers la même file de vérification.

## 2. Parcours cible

Dans le menu **Gestion des corrections** :

1. **Importer des formulaires numérisés**
   - remplace le libellé actuel « Import des formulaires » ;
   - conserve la sélection de plusieurs images présentes sur l’appareil ;
   - son périmètre réel reste à préciser pour les PDF, actuellement refusés par le back.
2. **Photographier des formulaires**
   - ouvre une interface de prise de vue adaptée au smartphone et à la caméra du PC ;
   - permet de conserver plusieurs photos au cours de la même session ;
   - permet de contrôler, recommencer, supprimer et réordonner les pages avant envoi.
3. **Vérification des formulaires**
   - reste l’unique écran de vérification ;
   - reçoit indistinctement les imports numérisés et les photographies traitées.

Flux fonctionnel :

```text
Importer des fichiers ───────┐
                             ├──> Vérification des formulaires
Photographier des pages ─────┘
```

Le redressement et la normalisation des photographies sont des traitements techniques automatiques et non un écran supplémentaire.

## 3. État actuel constaté

### Front

- La route `/formUpload` permet de sélectionner plusieurs fichiers avec `accept="image/*"`.
- Chaque fichier est envoyé séparément à `POST /submittedForms`.
- Trois tentatives sont faites en cas d’échec.
- La route `/listUpload` charge les `SubmittedFormMetadata` non vérifiés (`checked` faux ou absent).
- L’écran de vérification permet notamment :
  - de visualiser l’image et les points détectés ;
  - de déplacer manuellement les quatre repères ;
  - de corriger équipe, épreuve et page ;
  - de valider, remplacer ou supprimer un formulaire.

### Back

- `SubmittedFormController` accepte une image unique sur `POST /submittedForms`.
- Une route `/submittedForms/multiple` existe, mais n’est pas utilisée par le front.
- `SubmittedFormService.addSubmittedForm` :
  1. refuse tout type qui ne commence pas par `image/` ;
  2. décode l’image avec `ImageIO` ;
  3. lance une première reconnaissance pour identifier équipe, épreuve et page ;
  4. recharge le modèle correspondant à l’épreuve et à la page ;
  5. relance la reconnaissance des cases et zones ;
  6. conserve l’image binaire envoyée et les résultats dans MongoDB ;
  7. crée un élément non vérifié.
- Si les repères ou cases ne sont pas détectés, le fichier est tout de même conservé pour correction manuelle.
- L’échec de détection des quatre repères ne bloque jamais l’arrivée dans la vérification :
  des positions indicatives sont proposées dans les angles et restent déplaçables.
- L’utilisateur peut corriger manuellement les numéros d’équipe, d’épreuve et de page,
  puis accepter la feuille « en l’état », même si la reconnaissance est partielle.
- L’acceptation d’une feuille et la validation de sa correction sont deux décisions distinctes.
  Dans « Validation des épreuves », chaque réponse reconnue ou manquante reste modifiable
  manuellement avant la validation finale et le calcul du score.
- La configuration autorise actuellement des fichiers multipart sans limite explicite.

### Limites importantes

- Malgré l’expression « formulaires scannés », le flux actuel accepte des images mais pas les PDF.
- Les erreurs de reconnaissance peuvent aboutir à une réponse HTTP peu explicite : le contrôleur journalise certaines exceptions puis renvoie `null`.
- Le traitement multiple existant peut réussir partiellement sans compte rendu détaillé par fichier.
- L’image originale est conservée telle quelle ; aucune version redressée n’est produite.
- Le service de traitement doit rectifier la perspective d’une photographie avant toute reconnaissance.

## 4. Acquisition depuis la caméra

### Interface principale

L’interface doit utiliser `navigator.mediaDevices.getUserMedia()` afin de conserver la caméra ouverte pendant une série de prises de vue.

Fonctions attendues :

- demander explicitement l’autorisation d’utiliser la caméra ;
- préférer la caméra arrière (`facingMode: environment`) sur smartphone ;
- afficher un aperçu vidéo ;
- afficher un guide A4 et une zone de sécurité pour les quatre repères ;
- prendre une photographie ;
- afficher la miniature immédiatement ;
- ajouter autant de pages que nécessaire ;
- reprendre une photo ;
- supprimer une photo ;
- réordonner les pages ;
- envoyer la série ;
- fermer proprement la caméra lors de la sortie de l’écran.

### Solution de repli

Lorsque l’accès direct à la caméra est indisponible ou refusé :

- proposer un champ `input type="file"` avec `accept="image/*"` et `capture="environment"` ;
- permettre de répéter la prise de vue ;
- permettre également la sélection dans la photothèque.

L’accès direct à la caméra nécessite HTTPS. Le déploiement actuel du front en HTTPS est compatible avec cette contrainte.

## 5. Traitement automatique d’une photographie

Le but n’est pas de fabriquer artificiellement une « photo 300 DPI ». Le système doit produire une image dont :

- les dimensions en pixels correspondent à la géométrie du modèle de la page ;
- les repères et cases ont une taille exploitable ;
- le document est vu de face ;
- le contraste permet la reconnaissance des cases noircies.

Traitements envisagés :

1. lecture et normalisation de l’orientation EXIF ;
2. contrôle des dimensions minimales ;
3. détection des quatre repères de page ;
4. validation de leur ordre et de la forme quadrilatère obtenue ;
5. calcul d’une homographie ;
6. correction de perspective ;
7. recadrage sur la feuille ;
8. redimensionnement vers les dimensions du modèle de référence ;
9. correction raisonnable de luminosité et de contraste ;
10. conservation des nuances nécessaires pour distinguer une case vide d’une case noircie ;
11. reconnaissance du cartouche et des cases sur l’image normalisée ;
12. calcul d’indicateurs de qualité et de messages exploitables.

Le traitement ne doit pas appliquer un seuillage destructeur avant la reconnaissance sans validation sur des formulaires réels.

## 6. Gestion des fichiers et traçabilité

Pour une photographie, conserver :

- l’original envoyé, utile pour diagnostiquer un traitement ou reprendre manuellement ;
- l’image normalisée, utilisée pour la reconnaissance et affichée dans la vérification ;
- le type de source : `FILE_IMPORT` ou `CAMERA_CAPTURE` ;
- le nom d’origine ;
- la date de capture/import ;
- les dimensions avant et après traitement ;
- les indicateurs et avertissements de qualité.

La stratégie de stockage doit rester compatible avec :

- la sauvegarde de base de données ;
- l’export des paramètres et résultats ;
- la restauration d’un rallye ;
- les formulaires historiques déjà enregistrés.

## 7. Gestion de la qualité

Une photo ne doit pas être silencieusement rejetée.

Exemples de diagnostics :

- photo trop petite ;
- image illisible ou format non pris en charge ;
- document trop flou ;
- document trop sombre ou surexposé ;
- un ou plusieurs repères absents ;
- document partiellement coupé ;
- perspective trop importante ;
- identification équipe/épreuve/page impossible ;
- reconnaissance effectuée avec avertissement.

Une page techniquement exploitable rejoint directement la vérification. Une page imparfaite mais récupérable peut également la rejoindre avec un avertissement visible. Une page inutilisable doit être signalée dans le compte rendu d’envoi et ne pas disparaître silencieusement.

## 8. API cible

L’API doit accepter un lot et retourner un résultat individuel pour chaque page.

Exemple conceptuel :

```json
{
  "batchId": "…",
  "items": [
    {
      "clientId": "photo-1",
      "status": "READY_FOR_VERIFICATION",
      "submittedFormId": "…",
      "warnings": []
    },
    {
      "clientId": "photo-2",
      "status": "REJECTED",
      "errors": ["Le repère inférieur droit est absent."]
    }
  ]
}
```

Le lot n’a pas besoin d’être transactionnel : une mauvaise photo ne doit pas empêcher les autres pages d’être importées. Le résultat doit toutefois être explicite pour chaque fichier.

## 9. Architecture recommandée

Le traitement d’image et la reconnaissance sont assurés par le service indépendant
`form-processing-service`. Le front existant assure l’acquisition et la vérification,
tandis que `SubmittedFormService` orchestre l’appel au service, le stockage et la publication.

Cette séparation permet :

- une consommation CPU ou mémoire incompatible avec le back ;
- un besoin de traitements asynchrones massifs ;
- un besoin de montée en charge indépendante ;
- l’emploi d’une pile technique impossible à intégrer proprement au service Java.

## 10. Contraintes non fonctionnelles

- Interface utilisable à une main sur smartphone.
- Aucun rechargement de page pendant une session photo.
- Arrêt de la caméra dès que l’utilisateur quitte l’écran.
- Aucune capture sans action explicite.
- Communication HTTPS obligatoire.
- Temps et progression visibles pour chaque page.
- Possibilité de reprendre après l’échec d’un seul fichier.
- Taille maximale de fichier et de lot à définir et appliquer dans le front, le proxy et le back.
- Compression éventuelle sans dégrader les petites cases.
- Tests sur Android/Chrome, iPhone/Safari et PC/Chrome ou Edge.

## 11. Découpage proposé

### Incrément 1 — Acquisition et convergence

- Renommer « Import des formulaires » en « Importer des formulaires numérisés ».
- Ajouter « Photographier des formulaires ».
- Construire la session de capture multipage.
- Ajouter miniatures, reprise, suppression et réordonnancement.
- Envoyer les photographies au flux actuel.
- Vérifier qu’elles arrivent dans la file existante.

Cet incrément valide l’ergonomie et les navigateurs, sans prétendre encore fiabiliser les photographies inclinées.

### Incrément 2 — Redressement et qualité

- Introduire `FormImagePreparationService`.
- Corriger orientation et perspective.
- Normaliser les dimensions.
- Ajouter diagnostics et tests unitaires sur un jeu de photographies.
- Comparer les détections avec celles obtenues à partir d’un scan.

### Incrément 3 — Import par lot robuste

- Remplacer les envois indépendants par une API de lot avec résultat par page.
- Afficher progression, succès, avertissement et échec.
- Conserver original, image normalisée et métadonnées de source.

### Incrément 4 — Vérification assistée

- Afficher les avertissements de qualité dans l’écran existant.
- Permettre de consulter l’original si nécessaire.
- Améliorer les messages de correction manuelle des repères.
- Valider le parcours complet jusqu’au calcul du score.

### Incrément 5 — Durcissement

- Tests sur appareils réels.
- Tests de charge et de mémoire.
- Limites de taille et sécurité.
- Sauvegarde/restauration.
- Documentation utilisateur.

## 12. Critères d’acceptation globaux

- Un utilisateur peut prendre au moins dix photos successives sans quitter la session.
- Il peut les visualiser, supprimer et réordonner avant envoi.
- Chaque page envoyée reçoit un résultat compréhensible.
- Les pages acceptées apparaissent dans **Vérification des formulaires** sans étape intermédiaire.
- Une photo prise avec une perspective raisonnable est redressée et reconnue.
- Les coordonnées affichées dans la vérification correspondent à l’image normalisée.
- La validation produit les mêmes réponses et points qu’un scan équivalent.
- Les sauvegardes/restaurations conservent les formulaires photographiés et leurs résultats.
