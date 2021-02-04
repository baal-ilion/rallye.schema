## Pour utiliser java 11
$env:java_home = "C:\Program Files\AdoptOpenJDK\jdk-11.0.3.7-hotspot\"

## Pour supprimer l'image docker existante :
docker rmi baalilion/rallye-schema-response-service -f

## Pour créer l'image docker manuellement :
mvnw.cmd jib:dockerBuild

## Pour mettre l'image sur dockerhub :
 .\mvnw.cmd jib:build -Dimage=baalilion/rallye-schema-response-service

## docker-compose
docker-compose up -d

## RAZ de la base de donnée
# Suppimer le server de base de donnée
docker rm -f mongodb
# Supprimer les données
docker volume rm --force response-service_mongodb_db response-service_mongodb_configdb
# Re-installer la partie api - se mettre dans le repertoire response-service
docker-compose up -d
# Ou relacer la procedure de mise a jour

## Installation de kubernetes/dashboard
Installation :
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml delete ns kubernetes-dashboard
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.3/aio/deploy/recommended.yaml

Créer un compte de service
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f dashboard-service-account.yml

Créer une liaison de rôles
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f dashboard-cluster-role-binding.yml

Obtenire la clé
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml -n kubernetes-dashboard get secret
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml -n kubernetes-dashboard describe secret admin-user-token-mpbnk

lancer le service :
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml proxy
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

## install kubernetes
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f .\mongodb-configdb-persistentvolumeclaim.yaml -f .\mongodb-db-persistentvolumeclaim.yaml -f .\mongodb-deployment.yaml -f .\mongodb-service.yaml -f .\rabbitmq-persistentvolumeclaim.yaml -f .\rabbitmq-deployment.yaml -f .\rabbitmq-service.yaml -f .\rallye-schema-response-service-deployment.yaml -f .\rallye-schema-response-service-service.yaml