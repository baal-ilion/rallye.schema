# Form Designer Service

Application indépendante de conception des formulaires de correction Rallye Schéma.

## Fonctions actuelles

- import du classeur Excel de réponses et barème ;
- organisation graphique des questions par sections ;
- déplacement des questions par glisser-déposer ;
- aperçu candidat et correcteur issu du même modèle ;
- impression/export PDF des deux versions.
- lecture des paramètres du Rallye et des épreuves depuis le back commun ;
- création, modification et suppression d’épreuves partagées avec le front ;
- formulaire graphique facultatif pour chaque épreuve ;
- enregistrement individuel ou global directement dans la base commune.
- publication des labels et points des cases de correction dans les questions et
  barèmes utilisés par le front de correction ;
- préservation des groupes, performances et questions créées hors designer ;
- validation des labels vides, dupliqués ou incompatibles avec une performance.
- génération automatique d’une image PNG et d’un gabarit de reconnaissance
  pour chaque page A4 enregistrée ;
- calcul des coordonnées des repères, grilles d’identification et cases de
  correction directement depuis le rendu du designer ;
- publication d’un modèle de référence global indépendant de l’épreuve 1.

## Exécution

```bash
npm install
npm start
```

L'application est servie par défaut sur `http://localhost:4300`.

Le serveur de développement transmet les appels `/api` au back disponible sur
`https://localhost:8443`. Le back doit donc être démarré pour charger et enregistrer
la configuration. Les projets ne sont plus stockés dans des fichiers JSON locaux.

Les modèles publiés restent consultables et modifiables dans le front de correction.

## Exécution Docker

Avec le back et ses certificats déjà démarrés :

```bash
docker compose up -d --build
```

Le designer de production est alors accessible sur `https://localhost:4300`.
Il est servi par son propre conteneur et transmet ses appels `/api` au même back
que l'application de correction.
