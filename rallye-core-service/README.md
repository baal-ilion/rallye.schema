# Service métier Rallye Schéma

Ce module contient l’API centrale du rallye. Il utilise Java 25, Spring Boot 4.1, MongoDB et RabbitMQ.

## Prérequis

- JDK 25 ;
- Docker Desktop pour MongoDB, RabbitMQ et le moteur de traitement ;
- certificats générés par les scripts du dépôt.

Maven 3.9.16 est fourni par le wrapper à la racine. La procédure d’installation complète se trouve dans la [notice de développement](../docs/installation-environnement-developpement.md).

## Compiler et tester

Depuis la racine du dépôt :

```powershell
.\mvnw.cmd -version
.\mvnw.cmd clean verify
```

La première commande doit indiquer Java 25.

## Lancer depuis les sources

Démarrer d’abord MongoDB, RabbitMQ et le moteur de traitement comme indiqué dans la notice, puis :

```powershell
$env:SPRING_RABBITMQ_USERNAME = "rallyeschema"
$env:SPRING_RABBITMQ_PASSWORD = "rallyeschema"
.\mvnw.cmd -pl rallye-core-service spring-boot:run
```

L’API est disponible sur `https://localhost:8443`. Son état est exposé par `https://localhost:8443/actuator/health`.

## Lancer avec Docker

Depuis la racine du dépôt :

```powershell
docker compose -f rallye-core-service/docker-compose.yml up -d --build
```

Cette composition démarre :

- MongoDB ;
- RabbitMQ et sa console de gestion ;
- le traitement interactif des formulaires ;
- le traitement batch des formulaires ;
- le service métier.

Les données sont conservées dans des volumes Docker. Ne pas utiliser `down -v` sauf pour une remise à zéro volontaire et irréversible de la base de développement.

## Contrats du designer

Le service expose notamment :

- `GET` et `PUT /api/rally` pour les paramètres globaux ;
- `GET /api/formDesigns/challenges` pour les projets graphiques d’épreuve ;
- `GET`, `PUT` et `DELETE /api/formDesigns/challenges/{challengeConfigurationId}` pour le projet graphique d’une épreuve ;
- `GET`, `PUT` et `DELETE /api/formDesigns/reference` pour le formulaire de référence global.

Le formulaire de référence reste géré par le designer. Les formulaires d’épreuve conservent leur indicateur `designerManaged` lors des imports et exports de paramètres.
