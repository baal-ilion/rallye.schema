# Installation de l’environnement de développement

Cette notice décrit l’installation complète du projet Rallye Schéma sur un PC Windows neuf.
Elle correspond à la pile utilisée par la branche `develop` au 28 octobre 2026.

## 1. Pile technique de référence

| Élément | Version du projet | Installation locale |
| --- | --- | --- |
| Système | Windows 11 64 bits | Recommandé |
| Git | Version récente | Obligatoire |
| Visual Studio Code | Version récente | Recommandé |
| Java | JDK 25 LTS | Obligatoire pour le back local |
| Spring Boot | 4.1.2 | Fourni par Maven |
| Maven | 3.9.16 | Fourni par `mvnw.cmd` |
| Node.js | 20.x | Obligatoire pour les fronts locaux |
| Angular | 18.2 | Fourni par `npm ci` |
| Python | 3.12 recommandé, 3.11 minimum | Obligatoire pour le moteur local |
| Docker Desktop | Version récente avec Docker Compose v2 | Obligatoire pour la pile conteneurisée |
| MongoDB | Image Docker `mongo` | Ne pas installer localement |
| RabbitMQ | Image Docker `rabbitmq:management` | Ne pas installer localement |
| OpenSSL | Version récente | Nécessaire pour les certificats HTTPS |

Le projet ne contient aucun JDK, Maven, Node.js ou Python embarqué. Les dépendances applicatives sont restaurées par Maven, npm et pip. Les images Docker possèdent leurs propres runtimes isolés.

## 2. Configuration recommandée du PC

- processeur 64 bits avec virtualisation activée dans l’UEFI/BIOS ;
- 16 Go de mémoire vive recommandés, 8 Go au strict minimum ;
- au moins 20 Go libres pour les sources, dépendances et images Docker ;
- compte Windows autorisé à installer des logiciels ;
- connexion Internet pour la première installation et les premiers builds.

## 3. Installer les outils système

Ouvrir **PowerShell en tant qu’administrateur**.

### 3.1 Git et Visual Studio Code

```powershell
winget install --exact --id Git.Git
winget install --exact --id Microsoft.VisualStudioCode
```

Fermer puis rouvrir le terminal et vérifier :

```powershell
git --version
code --version
```

Git for Windows apporte également Git Bash, utile pour les scripts shell du dépôt.

### 3.2 JDK 25

Le projet exige Java 25 : Maven refuse volontairement Java 24 ou une version antérieure.

```powershell
winget install --exact --id EclipseAdoptium.Temurin.25.JDK
```

L’installateur doit définir `JAVA_HOME` et ajouter Java au `PATH`. Après réouverture du terminal :

```powershell
java -version
javac -version
keytool -help
$env:JAVA_HOME
```

Les commandes doivent indiquer Java 25. Sur le poste de référence, le chemin est de la forme :

```text
C:\Program Files\Eclipse Adoptium\jdk-25.x.x.x-hotspot
```

Ne pas installer Maven séparément : les scripts `mvnw` et `mvnw.cmd` téléchargent automatiquement Maven 3.9.16 dans le profil utilisateur.

### 3.3 Node.js 20

Les deux images de construction utilisent Node.js 20. Installer la dernière version 20.x disponible depuis le site officiel Node.js, ou utiliser nvm-windows pour pouvoir conserver plusieurs versions de Node.

Avec nvm-windows :

```powershell
winget install --exact --id CoreyButler.NVMforWindows
```

Après réouverture du terminal, installer une version 20.x disponible puis l’activer :

```powershell
nvm list available
nvm install <version-20.x>
nvm use <version-20.x>
node --version
npm --version
```

Il n’est pas nécessaire d’installer Angular CLI globalement : chaque front utilise sa version locale via les scripts npm.

### 3.4 Python 3.12

```powershell
winget install --exact --id Python.Python.3.12
```

Vérifier l’installation :

```powershell
py -3.12 --version
```

Le projet accepte Python 3.11 ou supérieur, mais Python 3.12 est la version des images Docker et la version recommandée pour reproduire le même environnement.

### 3.5 Docker Desktop et WSL 2

Installer WSL 2 si le PC ne le possède pas encore :

```powershell
wsl --install
```

Redémarrer Windows si demandé, puis installer Docker Desktop :

```powershell
winget install --exact --id Docker.DockerDesktop
```

Dans Docker Desktop :

1. utiliser le moteur WSL 2 ;
2. activer l’intégration avec la distribution WSL utilisée ;
3. allouer au moins 4 Go de mémoire à Docker si le réglage est disponible ;
4. attendre que Docker Desktop affiche que le moteur est démarré.

Vérifier :

```powershell
docker version
docker compose version
docker run --rm hello-world
```

### 3.6 OpenSSL

Le script de certificats tente de l’installer automatiquement. Pour l’installer à l’avance :

```powershell
winget install --exact --id ShiningLight.OpenSSL.Light
```

Après réouverture du terminal :

```powershell
openssl version
```

## 4. Installer les extensions Visual Studio Code

Extensions nécessaires ou fortement recommandées :

```powershell
code --install-extension vscjava.vscode-java-pack
code --install-extension redhat.java
code --install-extension angular.ng-template
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode.powershell
```

Extensions utiles mais facultatives :

```powershell
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension mongodb.mongodb-vscode
code --install-extension redhat.vscode-yaml
code --install-extension mhutchie.git-graph
```

Le serveur de langage de l’extension Java peut utiliser son propre runtime interne. Cela ne change pas le JDK employé par Maven pour compiler le projet.

## 5. Récupérer le dépôt

Dans un répertoire de développement :

```powershell
git clone https://github.com/baal-ilion/rallye.schema.git
Set-Location rallye.schema
git switch develop
git pull --ff-only origin develop
code .
```

Éviter un chemin synchronisé par OneDrive pour limiter les verrouillages de fichiers pendant les builds Angular et Maven.

## 6. Générer les certificats HTTPS

Depuis la racine du dépôt :

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\generate-certs.ps1 -InstallCert
```

Le script utilise `keytool` du JDK 25 et OpenSSL. Il génère :

- le keystore du back local ;
- le keystore du back Docker ;
- les certificats du front Angular et de Nginx ;
- la copie de certificat utilisable par le designer.

Pour accéder à l’application depuis un autre appareil du réseau, générer un certificat contenant aussi l’adresse IP du PC :

```powershell
.\scripts\generate-certs.ps1 -DnsName 192.168.1.100 -Force -InstallCert
```

Remplacer l’adresse par celle du PC. Les certificats et clés générés sont ignorés par Git et ne doivent jamais être commités.

## 7. Restaurer les dépendances

### 7.1 Back Java

Depuis la racine :

```powershell
.\mvnw.cmd -version
.\mvnw.cmd clean verify
```

La première commande doit afficher Maven 3.9.16 et Java 25. La seconde compile le service et exécute les tests.

### 7.2 Front principal

```powershell
Set-Location rallye-webapp
npm ci
npm run build -- --configuration=production
Set-Location ..
```

### 7.3 Designer de formulaires

```powershell
Set-Location form-designer-webapp
npm ci
npm run build:production
Set-Location ..
```

### 7.4 Service Python de traitement

```powershell
Set-Location form-processing-service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[test]"
python -m pytest -q
deactivate
Set-Location ..
```

Visual Studio Code est déjà configuré pour rechercher cet environnement dans `form-processing-service/.venv`.

## 8. Lancer l’environnement de développement local

Cette méthode garde MongoDB, RabbitMQ et le moteur de traitement dans Docker, tout en lançant le back et les deux fronts depuis les sources.

### 8.1 Démarrer les dépendances

Depuis la racine du dépôt :

```powershell
docker compose -f rallye-core-service/docker-compose.yml up -d mongodb rabbitmq
docker compose -f form-processing-service/docker-compose.yml up -d --build
```

Le service Python est alors disponible sur `http://localhost:8085`.

### 8.2 Démarrer le back

Dans un premier terminal PowerShell, à la racine :

```powershell
$env:SPRING_RABBITMQ_USERNAME = "rallyeschema"
$env:SPRING_RABBITMQ_PASSWORD = "rallyeschema"
.\mvnw.cmd -pl rallye-core-service spring-boot:run
```

Le back est disponible sur `https://localhost:8443`. Son état peut être contrôlé sur :

```text
https://localhost:8443/actuator/health
```

### 8.3 Démarrer le front principal

Dans un deuxième terminal :

```powershell
Set-Location rallye-webapp
npm start
```

Ouvrir `http://localhost:4200`.

### 8.4 Démarrer le designer

Dans un troisième terminal :

```powershell
Set-Location form-designer-webapp
npm start
```

Ouvrir `http://localhost:4300`.

## 9. Lancer toute la pile avec Docker

Après génération des certificats :

```powershell
docker compose -f rallye-core-service/docker-compose.yml up -d --build
docker compose -f rallye-webapp/docker-compose.yml up -d --build
docker compose -f form-designer-webapp/docker-compose.yml up -d --build
```

Accès principaux :

- application : `https://localhost` ;
- designer : `https://localhost:4300` ;
- back : `https://localhost:8443` ;
- console RabbitMQ : `http://localhost:15672`, utilisateur et mot de passe `rallyeschema`.

Afficher l’état des conteneurs :

```powershell
docker ps
docker compose -f rallye-core-service/docker-compose.yml logs -f rallye-core-service
```

Arrêter la pile sans supprimer les données :

```powershell
docker compose -f form-designer-webapp/docker-compose.yml down
docker compose -f rallye-webapp/docker-compose.yml down
docker compose -f rallye-core-service/docker-compose.yml down
```

Ne pas ajouter `-v` à la dernière commande sauf si la suppression des données MongoDB et RabbitMQ est réellement souhaitée.

## 10. Reconstruire toutes les images sans cache

```powershell
docker build --no-cache -t form-processing-service:local form-processing-service
docker build --no-cache -t rallye-core-service:local rallye-core-service
docker build --no-cache -f rallye-webapp/Dockerfile-prod -t rallye-webapp:local rallye-webapp
docker build --no-cache -f form-designer-webapp/Dockerfile-prod -t form-designer-webapp:local form-designer-webapp
```

Les deux conteneurs de traitement, interactif et batch, utilisent volontairement la même image `form-processing-service:local` avec des instances distinctes.

## 11. Vérifications finales

```powershell
java -version
.\mvnw.cmd -version
node --version
npm --version
py -3.12 --version
docker version
docker compose version
git status
```

Résultat attendu :

- Java 25 et Maven 3.9.16 ;
- compilation Maven réussie avec tous les tests ;
- builds Angular de production réussis ;
- tests Python réussis ;
- Docker opérationnel ;
- aucune modification Git créée par l’installation.

## 12. Dépannage courant

### Visual Studio Code prétend encore que le projet utilise Java 11

1. vérifier `java -version` et `$env:JAVA_HOME` ;
2. ouvrir la palette avec `Ctrl+Maj+P` ;
3. exécuter **Java: Clean Java Language Server Workspace** ;
4. accepter le redémarrage de la fenêtre ;
5. vérifier que le projet Maven est importé en `JavaSE-25`.

### `cv2`, `numpy` ou `form_processing` sont introuvables dans Pylance

```powershell
Set-Location form-processing-service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
```

Puis utiliser **Python: Select Interpreter** et choisir `form-processing-service/.venv/Scripts/python.exe`.

### Page blanche ou « Whitelabel Error Page » pendant une recompilation

Le back redémarre pendant une compilation Spring Boot. Attendre le message indiquant que Tomcat est démarré, puis recharger la page. Si l’erreur persiste, consulter les logs du back et vérifier MongoDB, RabbitMQ et le service Python.

### Un port est déjà occupé

Ports utilisés : `443`, `4200`, `4300`, `8443`, `8085`, `27017`, `5672` et `15672`.

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 443,4200,4300,8443,8085,27017,5672,15672
```

### Erreur de certificat dans le navigateur

Relancer :

```powershell
.\scripts\generate-certs.ps1 -Force -InstallCert
```

Fermer entièrement le navigateur puis le rouvrir. Pour un smartphone ou un autre PC, le certificat doit contenir l’adresse IP utilisée et être approuvé sur l’appareil concerné.

### Docker ne répond pas

Vérifier que Docker Desktop est démarré, puis :

```powershell
wsl --status
docker context show
docker version
```

## 13. Ce qu’il ne faut pas installer ou versionner

- pas de Maven global ;
- pas d’Angular CLI global ;
- pas de MongoDB ni RabbitMQ local si Docker est utilisé ;
- ne pas versionner `node_modules`, `dist`, `target`, `.venv`, les certificats ou les données MongoDB ;
- ne pas utiliser `npm audit fix --force` sans branche dédiée et campagne complète de tests.
