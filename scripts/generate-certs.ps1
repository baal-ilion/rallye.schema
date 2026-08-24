param(
  [string]$DnsName = "localhost",
  [string]$KeystorePassword = "changeit",
  [switch]$Force,
  [switch]$InstallCert
)

$ErrorActionPreference = "Stop"

# Accents via codepoints pour eviter les soucis d'encodage dans le fichier
$eAcute  = [char]0x00E9
$eGrave  = [char]0x00E8
$eCirc   = [char]0x00EA
$oCirc   = [char]0x00F4
$aGrave  = [char]0x00E0

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function Require-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name introuvable. Installe-le puis relance. Astuce : $installHint"
  }
}

function Install-OpenSSL {
  Write-Host "openssl absent. Tentative d'installation (winget puis choco)..."
  $installed = $false

  $wingetCandidates = @("ShiningLight.OpenSSL", "ShiningLight.OpenSSL.Light", "openssl")
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    foreach ($pkg in $wingetCandidates) {
      if ($installed) { break }
      try {
        Write-Host ">> winget install $pkg"
        winget install $pkg --accept-package-agreements --accept-source-agreements -h
        $installed = $true
      } catch {
        Write-Warning "Echec via winget ($pkg) : $($_.Exception.Message)"
      }
    }
  }

  if (-not $installed -and (Get-Command choco -ErrorAction SilentlyContinue)) {
    try {
      Write-Host ">> choco install openssl"
      choco install openssl -y
      $installed = $true
    } catch {
      Write-Warning "Echec via choco : $($_.Exception.Message)"
    }
  }

  if (-not $installed) {
    throw "Impossible d'installer openssl automatiquement. Installe-le manuellement (ex : https://slproweb.com/products/Win32OpenSSL.html) puis relance."
  }
}

function Install-DevCert {
  param(
    [string]$CertPath
  )
  if (-not (Test-Path $CertPath)) {
    Write-Warning "Certificat ${eAcute} installer introuvable : $CertPath"
    return
  }
  try {
    Write-Host ">> Import du certificat dans le magasin Racines de confiance (CurrentUser)"
    Import-Certificate -FilePath $CertPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
    Write-Host "Certificat import${eAcute} pour l'utilisateur courant. Red${eAcute}marre le navigateur si besoin."
  } catch {
    Write-Warning "${eAcute}chec de l'import du certificat : $($_.Exception.Message)"
  }
}

$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

$backendLocal     = Join-Path $repoRoot "rallye-core-service\src\main\resources\keystore-local.p12"
$backendDockerDir = Join-Path $repoRoot "rallye-core-service\certs"
$backendDocker    = Join-Path $backendDockerDir "keystore.p12"
$nginxCertDir     = Join-Path $repoRoot "rallye-webapp\certs"
$angularKey       = Join-Path $nginxCertDir "localhost.key"
$angularCrt       = Join-Path $nginxCertDir "localhost.crt"
$nginxPriv        = Join-Path $nginxCertDir "privkey.pem"
$nginxFull        = Join-Path $nginxCertDir "fullchain.pem"
$certToInstall    = $angularCrt
$sanExt           = "SAN=dns:$DnsName"

Ensure-Dir (Split-Path $backendLocal)
Ensure-Dir $backendDockerDir
Ensure-Dir $nginxCertDir

Write-Host "Racine du d${eAcute}p${oCirc}t : $repoRoot"

# keytool obligatoire
Require-Command "keytool" "JDK/JRE fournissant keytool"

# Backend local keystore
if (-not (Test-Path $backendLocal) -or $Force) {
  Write-Host ">> G${eAcute}n${eAcute}ration du keystore local : $backendLocal"
  & keytool -genkeypair -alias rallye-schema -keyalg RSA -keysize 2048 -storetype PKCS12 `
    -keystore $backendLocal -storepass $KeystorePassword -validity 3650 -dname "CN=$DnsName" -ext $sanExt
} else {
  Write-Host "[skip] $backendLocal existe (ajoute -Force pour r${eAcute}g${eAcute}n${eAcute}rer)"
}

# Backend Docker keystore
if (-not (Test-Path $backendDocker) -or $Force) {
  Write-Host ">> G${eAcute}n${eAcute}ration du keystore Docker : $backendDocker"
  & keytool -genkeypair -alias rallye-schema -keyalg RSA -keysize 2048 -storetype PKCS12 `
    -keystore $backendDocker -storepass $KeystorePassword -validity 3650 -dname "CN=$DnsName" -ext $sanExt
} else {
  Write-Host "[skip] $backendDocker existe (ajoute -Force pour r${eAcute}g${eAcute}n${eAcute}rer)"
}

# Certificats pour Angular dev et Nginx (auto-sign${eAcute}). Besoin d'openssl.
$opensslAvailable = $false
try {
  Get-Command openssl -ErrorAction Stop | Out-Null
  $opensslAvailable = $true
} catch {
  Write-Warning "openssl non trouv${eAcute}. Tentative d'installation automatique..."
  try {
    Install-OpenSSL
    Get-Command openssl -ErrorAction Stop | Out-Null
    $opensslAvailable = $true
  } catch {
    Write-Warning "openssl absent apr${eGrave}s tentative d'installation. Installe-le manuellement (winget install ShiningLight.OpenSSL ou choco install openssl) puis relance avec -Force pour r${eAcute}g${eAcute}n${eAcute}rer."
  }
}

if ($opensslAvailable -and ((-not (Test-Path $angularKey) -or -not (Test-Path $angularCrt) -or -not (Test-Path $nginxPriv) -or -not (Test-Path $nginxFull)) -or $Force)) {
  $tmpKey = Join-Path $nginxCertDir "tmp.key"
  $tmpCrt = Join-Path $nginxCertDir "tmp.crt"
  $tmpConf = Join-Path $nginxCertDir "openssl-san.conf"
  Write-Host ">> G${eAcute}n${eAcute}ration certificat auto-sign${eAcute} (Nginx/Angular) via openssl dans $nginxCertDir (SAN DNS:$DnsName, IP:127.0.0.1)"
  @"
[ req ]
default_bits       = 2048
distinguished_name = req_dn
req_extensions     = req_ext
prompt             = no

[ req_dn ]
CN = $DnsName

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = $DnsName
DNS.2 = localhost
IP.1  = 127.0.0.1
"@ | Set-Content -Path $tmpConf -Encoding ASCII

  & openssl req -x509 -nodes -days 825 -newkey rsa:2048 `
    -keyout $tmpKey -out $tmpCrt -config $tmpConf -extensions req_ext

  Copy-Item $tmpKey $angularKey -Force
  Copy-Item $tmpCrt $angularCrt -Force
  Copy-Item $tmpKey $nginxPriv -Force
  Copy-Item $tmpCrt $nginxFull -Force
  Remove-Item $tmpKey, $tmpCrt, $tmpConf -Force
} elseif (-not $opensslAvailable) {
  Write-Warning "Certificats front/Nginx non g${eAcute}n${eAcute}r${eAcute}s (openssl manquant)."
} else {
  Write-Host "[skip] Certificats d${eAcute}j${aGrave} pr${eAcute}sents dans $nginxCertDir (ajoute -Force pour r${eAcute}g${eAcute}n${eAcute}rer)"
}

Write-Host "Termin${eAcute}. Mot de passe keystore : $KeystorePassword"

if ($InstallCert -and $opensslAvailable) {
  Install-DevCert -CertPath $certToInstall
}
