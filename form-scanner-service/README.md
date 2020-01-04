## Pour supprimer l'image docker existante :
docker rmi form-scanner-service:0.0.1-SNAPSHOT -f

## Pour créer l'image docker manuellement :
mvnw.cmd jib:dockerBuild

## docker-compose
docker-compose up -d
