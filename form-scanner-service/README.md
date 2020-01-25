## Pour supprimer l'image docker existante :
docker rmi form-scanner-service:0.0.1-SNAPSHOT -f

## Pour créer l'image docker manuellement :
mvnw.cmd jib:dockerBuild

## Pour mettre l'image sur dockerhub :
 .\mvnw.cmd jib:build -Dimage=baalilion/form-scanner-service

## docker-compose
docker-compose up -d
