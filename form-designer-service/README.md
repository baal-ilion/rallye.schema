# Form Designer Service

Application indépendante de conception des formulaires de correction Rallye Schéma.

## Prototype actuel

- import du classeur Excel de réponses et barème ;
- organisation graphique des questions par sections ;
- déplacement des questions par glisser-déposer ;
- aperçu candidat et correcteur issu du même modèle ;
- impression/export PDF des deux versions.

## Exécution

```bash
npm install
npm start
```

L'application est servie par défaut sur `http://localhost:4300`.

Les prochaines étapes sont la pagination réelle, la génération des images et `.xtmpl`, puis la publication vers l'API Rallye Schéma.
