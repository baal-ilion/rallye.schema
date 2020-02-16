## Pour utiliser java 11
$env:java_home = "C:\Program Files\AdoptOpenJDK\jdk-11.0.3.7-hotspot\"

## Pour supprimer l'image docker existante :
docker rmi rallye-schema-response-service:0.0.1-SNAPSHOT -f

## Pour créer l'image docker manuellement :
mvnw.cmd jib:dockerBuild

## Pour mettre l'image sur dockerhub :
 .\mvnw.cmd jib:build -Dimage=baalilion/rallye-schema-response-service

## docker-compose
docker-compose up -d
