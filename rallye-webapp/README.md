# Application principale Rallye Schéma

Ce répertoire contient le front des organisateurs, développé avec Angular 18.2.

## Prérequis

- Node.js 20.x ;
- npm ;
- API Rallye Schéma disponible pour utiliser les fonctions métier.

La procédure d’installation complète se trouve dans la [notice de développement](../docs/installation-environnement-developpement.md).

## Installer les dépendances

```powershell
npm ci
```

Angular CLI est installé localement par npm : aucune installation globale n’est nécessaire.

## Lancer en développement

```powershell
npm start
```

Le script synchronise la configuration du proxy puis ouvre le serveur Angular sur `http://localhost:4200`.

## Construire et tester

```powershell
npm run build -- --configuration=production
npm test
```

Les artefacts sont écrits dans `dist/`.

## Lancer avec Docker

Depuis la racine du dépôt, après génération des certificats :

```powershell
docker compose -f rallye-webapp/docker-compose.yml up -d --build
```

L’application est alors disponible sur `https://localhost`.
