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

## Exécution

```bash
npm install
npm start
```

L'application est servie par défaut sur `http://localhost:4300`.

Le serveur de développement transmet les appels `/api` au back disponible sur
`https://localhost:8443`. Le back doit donc être démarré pour charger et enregistrer
la configuration. Les projets ne sont plus stockés dans des fichiers JSON locaux.

La génération des données de reconnaissance et leur publication vers le service
de correction constituent l’incrément suivant.
