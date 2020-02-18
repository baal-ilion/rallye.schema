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

## install kubernetes
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f .\mongodb-configdb-persistentvolumeclaim.yaml -f .\mongodb-db-persistentvolumeclaim.yaml -f .\mongodb-deployment.yaml -f .\mongodb-service.yaml -f .\rabbitmq-persistentvolumeclaim.yaml -f .\rabbitmq-deployment.yaml -f .\rabbitmq-service.yaml -f .\rallye-schema-response-service-deployment.yaml -f .\rallye-schema-response-service-service.yaml