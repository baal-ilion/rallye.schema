# FormScannerWebapp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.15.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).


## Build docker image dev
docker build -t rallye-schema-response-webapp:dev .

## run docker image dev
docker run -it -v ${PWD}:/app -v /app/node_modules -p 4201:4200 --rm rallye-schema-response-webapp:dev

## docker-compose install image prod and run
docker-compose up -d

## docker-compose build image prod and run
docker-compose -f docker-compose-prod.yml up -d --build

## Pour mettre l'image sur dockerhub :
docker push baalilion/rallye-schema-response-webapp

## Install kubernetes :
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml apply -f .\rallye-schema-response-webapp-app-persistentvolumeclaim.yaml -f .\rallye-schema-response-webapp-claim2-persistentvolumeclaim.yaml -f .\rallye-schema-response-webapp-config-persistentvolumeclaim.yaml -f .\rallye-schema-response-webapp-service.yaml -f .\rallye-schema-response-webapp-deployment.yaml 

## Modifier le fichier de config dans kubernetes:
# Obtenir l'adresse externe du service
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml get services
# Obtenir le nom du pod
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml get pods
# Obtient un TTY interactif et exécute /bin/bash depuis le pod <nom-pod>. Par défaut, la sortie se fait depuis le premier conteneur.
kubectl --kubeconfig=$HOME/.kube/kubeconfig.yml exec -ti rallye-schema-response-webapp-6b5468d5d6-x8dmm -- /bin/sh
/ # cd usr/share/nginx/html/config/
/ # vi config.json

