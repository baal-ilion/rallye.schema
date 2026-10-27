# Cahier des charges — Capture photographique des formulaires

> Version mise à jour le 28 octobre 2026. Ce document distingue désormais les fonctions livrées de la cible restant à réaliser. La pile de référence est Java 25 / Spring Boot 4.1, Angular 18 et Python 3.12.

## 1. Objectif

Permettre à un organisateur d’utiliser le front Rallye Schéma sur un smartphone ou un ordinateur équipé d’une caméra pour photographier plusieurs pages de formulaires corrigés, puis retrouver ces pages dans le flux existant **Traitement des formulaires**.

Le nouveau parcours ne crée pas une nouvelle étape métier. La correction photographique et l’import de fichiers convergent vers la même file de vérification.

### Architecture de référence

- `rallye-webapp` : acquisition, import, traitement manuel, validation et consultation ;
- `rallye-core-service` : API métier, stockage MongoDB, files RabbitMQ et orchestration ;
- `form-processing-service` : normalisation, redressement et reconnaissance d’images ;
- `form-designer-webapp` : production des formulaires, images de référence et gabarits ;
- deux instances du moteur de traitement utilisent la même image Docker : une interactive et une batch.

Les contrats métier emploient le terme **épreuve** (`challenge`) et non **étape** (`stage`). Une étape désigne seulement, dans le vocabulaire utilisateur, un type ou un regroupement d’épreuves.

## 2. Parcours cible

Dans le menu **Gestion des corrections** :

1. **Importer des formulaires numérisés**
   - route actuelle : `/forms/import-scans` ;
   - accepte plusieurs images présentes sur l’appareil ou déposées par glisser-déposer ;
   - démarre automatiquement l’envoi, avec au plus deux fichiers simultanés ;
   - n’accepte pas les PDF.
2. **Photographier des formulaires**
   - route actuelle : `/forms/capture` ;
   - ouvre une interface adaptée au smartphone et à la caméra du PC ;
   - permet de conserver plusieurs photos au cours de la même session ;
   - permet de contrôler, recommencer et supprimer les pages.
3. **Traitement des formulaires**
   - route actuelle : `/forms/processing` ;
   - reste l’unique écran de vérification et de résolution des doublons ;
   - reçoit indistinctement les imports numérisés et les photographies traitées.

Flux fonctionnel :

```text
Importer des fichiers ───────┐
                             ├──> Traitement des formulaires ──> Validation des épreuves
Photographier des pages ─────┘
```

Le redressement et la normalisation des photographies sont des traitements techniques automatiques et non un écran supplémentaire.

## 3. État livré

### Front principal

- `/forms/import-scans` accepte plusieurs images avec `accept="image/*"`, le glisser-déposer, la progression et la relance d’un fichier en erreur.
- `/forms/capture` utilise `navigator.mediaDevices.getUserMedia()` et préfère la caméra arrière. Si cette API est indisponible ou refusée, le navigateur ouvre son acquisition native avec `capture="environment"`.
- Les prises de vue sont prévisualisées avant conservation et envoyées automatiquement, avec deux envois simultanés au maximum.
- La galerie permet de consulter, reprendre et supprimer une photographie.
- `/forms/processing` affiche une file paginée avec les états de traitement, des miniatures compactes et un bail de vérification évitant que deux postes modifient simultanément le même formulaire.
- L’écran de traitement permet notamment :
  - de visualiser l’image et les points détectés ;
  - de déplacer manuellement les quatre repères ;
  - de corriger équipe, épreuve et page ;
  - de comparer les doublons ;
  - d’accepter, remplacer ou supprimer un formulaire.

### Service central

- `POST /submittedForms` reçoit une image et un identifiant d’envoi idempotent facultatif dans `X-Upload-Id`.
- L’original est conservé dans MongoDB avant le traitement asynchrone.
- RabbitMQ distribue les traitements entre les consommateurs interactifs et batch.
- Le service central appelle `POST /api/v1/forms/process`, remplace l’image de travail par le PNG normalisé et conserve séparément l’original.
- Les états `READY`, `READY_WITH_WARNINGS`, attente, analyse et erreur alimentent la file de traitement.
- Les coordonnées reconnues sont reconverties dans le repère de l’image affichée afin de rester déplaçables manuellement.
- Si les repères ou cases ne sont pas détectés, le fichier est tout de même conservé pour correction manuelle.
- L’échec de détection des quatre repères ne bloque jamais l’arrivée dans la vérification :
  des positions indicatives sont proposées dans les angles et restent déplaçables.
- L’utilisateur peut corriger manuellement les numéros d’équipe, d’épreuve et de page,
  puis accepter la feuille « en l’état », même si la reconnaissance est partielle.
- L’acceptation d’une feuille et la validation de sa correction sont deux décisions distinctes.
  Dans « Validation des épreuves », chaque réponse reconnue ou manquante reste modifiable
  manuellement avant la validation finale et le calcul du score.
- La configuration autorise actuellement des fichiers multipart sans limite explicite.

### Moteur de traitement

- Python 3.12, FastAPI, OpenCV, NumPy et Pillow ;
- détection des quatre repères, homographie et normalisation ;
- utilisation facultative de l’image de référence et du gabarit XML produits par le designer ;
- alignement local des zones et reconnaissance des marques de correction ;
- retour de l’image normalisée, des transformations, corrections, métriques et avertissements ;
- API de santé sur `GET /health` et traitement sur `POST /api/v1/forms/process`.

### Limites importantes

- Le flux accepte des images mais pas les PDF.
- L’API historique `/submittedForms/multiple` ne fournit pas encore un compte rendu détaillé par fichier et n’est pas utilisée par le front.
- L’API d’import principale reste unitaire : le front orchestre le lot et affiche le résultat de chaque envoi.
- Le réordonnancement manuel des photos avant envoi n’est pas encore proposé.
- Les limites maximales de taille par fichier et par lot restent à formaliser et à appliquer uniformément.
- Certaines exceptions historiques du contrôleur d’import sont encore journalisées avant une réponse vide ; elles devront devenir des erreurs HTTP structurées.

## 4. Acquisition depuis la caméra

### Interface principale livrée

L’interface utilise `navigator.mediaDevices.getUserMedia()` afin de conserver la caméra ouverte pendant une série de prises de vue.

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
- réordonner les pages (reste à réaliser) ;
- envoyer automatiquement chaque page conservée ;
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

## 9. Architecture retenue

Le traitement d’image et la reconnaissance sont assurés par le service indépendant
`form-processing-service`. Le front assure l’acquisition et la vérification,
tandis que `SubmittedFormService` orchestre la file, l’appel au service, le stockage et la publication.

Cette séparation permet :

- une consommation CPU ou mémoire incompatible avec le back ;
- un besoin de traitements asynchrones massifs ;
- un besoin de montée en charge indépendante ;
- l’emploi d’une pile technique impossible à intégrer proprement au service Java.

Pile d’exécution :

- Java 25 LTS, Maven 3.9.16 et Spring Boot 4.1.2 pour le service central ;
- Angular 18 et Node.js 20 pour les deux fronts ;
- Python 3.12 pour le traitement d’image ;
- MongoDB pour les données et images ;
- RabbitMQ pour le traitement asynchrone ;
- Docker Compose pour la pile locale et de production.

La procédure complète d’installation est décrite dans [installation-environnement-developpement.md](installation-environnement-developpement.md).

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

### Suivi au 28 octobre 2026

- Incrément 1 : livré, hors réordonnancement manuel des pages.
- Incrément 2 : livré pour la normalisation, la perspective, les images de référence et les diagnostics ; les campagnes sur formulaires réels restent continues.
- Incrément 3 : livré sous forme d’envois unitaires concurrents et suivis individuellement ; une API transactionnelle de lot n’est pas retenue à ce stade.
- Incrément 4 : livré pour la correction des repères, l’acceptation, les doublons et la validation manuelle.
- Incrément 5 : partiellement livré ; les limites de taille, tests de charge et validations multi-appareils restent à consolider.

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
- Les pages acceptées apparaissent dans **Traitement des formulaires** sans action intermédiaire.
- Une photo prise avec une perspective raisonnable est redressée et reconnue.
- Les coordonnées affichées dans la vérification correspondent à l’image normalisée.
- La validation produit les mêmes réponses et points qu’un scan équivalent.
- Les sauvegardes/restaurations conservent les formulaires photographiés et leurs résultats.
