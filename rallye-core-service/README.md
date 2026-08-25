## Pour utiliser java 11
$env:java_home = "C:\Program Files\AdoptOpenJDK\jdk-11.0.3.7-hotspot\"

## Configuration commune du rallye et formulaires du designer

Une base contient la configuration d'un seul rallye. Le back expose les données communes au front de correction et au designer :

- `GET /api/rally` : charge les paramètres globaux et crée les valeurs par défaut sur une base vierge ;
- `PUT /api/rally` : enregistre les paramètres globaux ;
- `GET /api/formDesigns/challenges` : liste les projets graphiques rattachés aux épreuves ;
- `GET /api/formDesigns/challenges/{challengeConfigurationId}` : charge le projet graphique facultatif d'une épreuve ;
- `PUT /api/formDesigns/challenges/{challengeConfigurationId}` : crée ou remplace son projet graphique ;
- `DELETE /api/formDesigns/challenges/{challengeConfigurationId}` : supprime uniquement le formulaire, sans supprimer l'épreuve ;
- `GET|PUT|DELETE /api/formDesigns/reference` : gère le formulaire de référence global.

Une suppression via `DELETE /challengeConfigurations/{id}` supprime aussi le projet graphique rattaché. Les collections `rallyConfiguration` et `formDesign` sont incluses dans la sauvegarde et la restauration de la base.

## Pour supprimer l'image docker existante :
docker rmi baalilion/rallye-core-service -f

## Pour créer l'image docker manuellement :
mvnw.cmd jib:dockerBuild

## Pour mettre l'image sur dockerhub :
 .\mvnw.cmd jib:build -Dimage=baalilion/rallye-core-service

## docker-compose
docker-compose up -d

## RAZ de la base de donnée
# Suppimer le server de base de donnée
docker rm -f mongodb
# Supprimer les données
docker volume rm --force rallye-core-service_rallye_mongodb_data rallye-core-service_rallye_mongodb_config
# Réinstaller l'API depuis le répertoire rallye-core-service
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
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f .\mongodb-configdb-persistentvolumeclaim.yaml -f .\mongodb-db-persistentvolumeclaim.yaml -f .\mongodb-deployment.yaml -f .\mongodb-service.yaml -f .\rabbitmq-persistentvolumeclaim.yaml -f .\rabbitmq-deployment.yaml -f .\rabbitmq-service.yaml -f .\rallye-core-service-deployment.yaml -f .\rallye-core-service-service.yaml
