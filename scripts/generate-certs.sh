#!/usr/bin/env bash
set -euo pipefail

DNS_NAME="localhost"
KEYSTORE_PASSWORD="changeit"
FORCE=0
INSTALL_CERT=0

usage() {
  cat <<'EOF'
Usage: ./scripts/generate-certs.sh [options]

Options:
  -d, --dns-name <name>             DNS name for generated certificates (default: localhost)
  -p, --keystore-password <value>   Keystore password (default: changeit)
  -f, --force                       Regenerate files even if they already exist
  -i, --install-cert                Install the generated certificate in the Linux system trust store
  -h, --help                        Show this help

Examples:
  ./scripts/generate-certs.sh
  ./scripts/generate-certs.sh --force
  ./scripts/generate-certs.sh --dns-name localhost --install-cert
EOF
}

require_value() {
  local option="$1"
  local value="${2:-}"

  if [[ -z "$value" ]]; then
    echo "Option $option requires a value." >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dns-name)
      require_value "$1" "${2:-}"
      DNS_NAME="$2"
      shift 2
      ;;
    -p|--keystore-password)
      require_value "$1" "${2:-}"
      KEYSTORE_PASSWORD="$2"
      shift 2
      ;;
    -f|--force)
      FORCE=1
      shift
      ;;
    -i|--install-cert)
      INSTALL_CERT=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command() {
  local name="$1"
  local install_hint="$2"

  if ! command -v "$name" >/dev/null 2>&1; then
    echo "$name not found. Install it and rerun this script. Hint: $install_hint" >&2
    exit 1
  fi
}

run_as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    require_command "sudo" "install sudo or run this script as root for --install-cert"
    sudo "$@"
  fi
}

install_dev_cert() {
  local cert_path="$1"

  if [[ ! -f "$cert_path" ]]; then
    echo "Certificate to install not found: $cert_path" >&2
    return 0
  fi

  echo ">> Installing certificate in the Linux system trust store"

  if command -v update-ca-certificates >/dev/null 2>&1; then
    run_as_root mkdir -p "/usr/local/share/ca-certificates"
    run_as_root cp "$cert_path" "/usr/local/share/ca-certificates/rallye-schema-local.crt"
    run_as_root update-ca-certificates
  elif command -v update-ca-trust >/dev/null 2>&1; then
    run_as_root mkdir -p "/etc/pki/ca-trust/source/anchors"
    run_as_root cp "$cert_path" "/etc/pki/ca-trust/source/anchors/rallye-schema-local.crt"
    run_as_root update-ca-trust extract
  elif command -v trust >/dev/null 2>&1; then
    run_as_root trust anchor --store "$cert_path"
  else
    echo "No supported Linux trust-store command found." >&2
    echo "Install manually, or use update-ca-certificates/update-ca-trust/p11-kit trust." >&2
    return 0
  fi

  echo "Certificate installed. Restart browsers or containers if needed."
  echo "Note: Firefox may use its own certificate store depending on your distribution/profile."
}

generate_keystore() {
  local target="$1"
  local label="$2"
  local san_ext="SAN=dns:$DNS_NAME"

  if [[ ! -f "$target" || "$FORCE" -eq 1 ]]; then
    echo ">> Generating $label keystore: $target"
    if [[ "$FORCE" -eq 1 && -f "$target" ]]; then
      rm -f -- "$target"
    fi

    keytool -genkeypair \
      -alias rallye-schema \
      -keyalg RSA \
      -keysize 2048 \
      -storetype PKCS12 \
      -keystore "$target" \
      -storepass "$KEYSTORE_PASSWORD" \
      -validity 3650 \
      -dname "CN=$DNS_NAME" \
      -ext "$san_ext"
  else
    echo "[skip] $target already exists (add --force to regenerate)"
  fi
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"

BACKEND_LOCAL="$REPO_ROOT/response-service/src/main/resources/keystore-local.p12"
BACKEND_DOCKER_DIR="$REPO_ROOT/response-service/certs"
BACKEND_DOCKER="$BACKEND_DOCKER_DIR/keystore.p12"
NGINX_CERT_DIR="$REPO_ROOT/rallye-schema-response-webapp/certs"
ANGULAR_KEY="$NGINX_CERT_DIR/localhost.key"
ANGULAR_CRT="$NGINX_CERT_DIR/localhost.crt"
NGINX_PRIV="$NGINX_CERT_DIR/privkey.pem"
NGINX_FULL="$NGINX_CERT_DIR/fullchain.pem"
CERT_TO_INSTALL="$ANGULAR_CRT"

mkdir -p "$(dirname "$BACKEND_LOCAL")" "$BACKEND_DOCKER_DIR" "$NGINX_CERT_DIR"

echo "Repository root: $REPO_ROOT"

require_command "keytool" "install a JDK/JRE that provides keytool"
require_command "openssl" "Debian/Ubuntu: sudo apt install openssl; Fedora: sudo dnf install openssl; Arch: sudo pacman -S openssl"

generate_keystore "$BACKEND_LOCAL" "backend local"
generate_keystore "$BACKEND_DOCKER" "backend Docker"

if [[ ! -f "$ANGULAR_KEY" || ! -f "$ANGULAR_CRT" || ! -f "$NGINX_PRIV" || ! -f "$NGINX_FULL" || "$FORCE" -eq 1 ]]; then
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  TMP_KEY="$TMP_DIR/tmp.key"
  TMP_CRT="$TMP_DIR/tmp.crt"
  TMP_CONF="$TMP_DIR/openssl-san.conf"

  echo ">> Generating self-signed certificate via openssl in $NGINX_CERT_DIR (SAN DNS:$DNS_NAME, IP:127.0.0.1)"

  cat > "$TMP_CONF" <<EOF
[ req ]
default_bits       = 2048
distinguished_name = req_dn
req_extensions     = req_ext
prompt             = no

[ req_dn ]
CN = $DNS_NAME

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = $DNS_NAME
DNS.2 = localhost
IP.1  = 127.0.0.1
EOF

  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout "$TMP_KEY" \
    -out "$TMP_CRT" \
    -config "$TMP_CONF" \
    -extensions req_ext

  cp "$TMP_KEY" "$ANGULAR_KEY"
  cp "$TMP_CRT" "$ANGULAR_CRT"
  cp "$TMP_KEY" "$NGINX_PRIV"
  cp "$TMP_CRT" "$NGINX_FULL"
  chmod 600 "$ANGULAR_KEY" "$NGINX_PRIV"
  chmod 644 "$ANGULAR_CRT" "$NGINX_FULL"
else
  echo "[skip] Certificates already exist in $NGINX_CERT_DIR (add --force to regenerate)"
fi

echo "Done. Keystore password: $KEYSTORE_PASSWORD"

if [[ "$INSTALL_CERT" -eq 1 ]]; then
  install_dev_cert "$CERT_TO_INSTALL"
fi
