# Rallye Schéma

Rallye Schéma est le système de gestion d’un rallye : équipes, épreuves, formulaires de réponses, correction, validation, calcul des points et classements.

## Documentation

- [Installer l’environnement de développement](docs/installation-environnement-developpement.md)
- [Cahier des charges — capture et traitement des formulaires](docs/cahier-des-charges-capture-formulaires.md)
- [Guide du designer de formulaires](form-designer-webapp/README.md)
- [Service de traitement d’images](form-processing-service/README.md)

## Architecture

| Répertoire | Rôle | Technologie principale |
| --- | --- | --- |
| `rallye-core-service` | API métier, persistance, temps réel et orchestration du traitement | Java 25, Spring Boot 4.1, MongoDB, RabbitMQ |
| `rallye-webapp` | Application principale des organisateurs | Angular 18.2 |
| `form-designer-webapp` | Conception des formulaires de référence et d’épreuve | Angular 18.2 |
| `form-processing-service` | Détection, redressement et lecture des formulaires | Python 3.12, OpenCV |
| `scripts` | Génération des certificats et opérations de maintenance | PowerShell, Bash |

Le vocabulaire technique utilise `challenge` pour une **épreuve**. Le terme `stage` n’est plus un contrat métier du système.

## Vérification rapide du projet

Depuis la racine du dépôt :

```powershell
java -version
.\mvnw.cmd -version
.\mvnw.cmd clean verify

Set-Location rallye-webapp
npm ci
npm run build -- --configuration=production
Set-Location ..\form-designer-webapp
npm ci
npm run build:production
Set-Location ..
```

Java et Maven doivent respectivement indiquer Java 25 et Maven 3.9.16. Pour l’installation initiale de tous les outils, des extensions Visual Studio Code et des dépendances, suivre la [notice complète](docs/installation-environnement-developpement.md).

## Lancement avec Docker

Générer d’abord les certificats :

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\generate-certs.ps1 -InstallCert
```

Puis démarrer les services :

```powershell
docker compose -f rallye-core-service/docker-compose.yml up -d --build
docker compose -f rallye-webapp/docker-compose.yml up -d --build
docker compose -f form-designer-webapp/docker-compose.yml up -d --build
```

Accès principaux :

- application : `https://localhost` ;
- designer : `https://localhost:4300` ;
- API : `https://localhost:8443` ;
- RabbitMQ : `http://localhost:15672`.

Les données MongoDB et RabbitMQ résident dans des volumes Docker. Une commande `down -v` les supprime irréversiblement et ne doit être utilisée que pour réinitialiser volontairement l’environnement.
