const fs = require('fs');
const path = require('path');

// Remonte à la racine du repo pour trouver le backend
const appYamlPath = path.resolve(__dirname, '../../rallye-core-service/src/main/resources/application.yml');
const proxyPath = path.resolve(__dirname, '../proxy.conf.json');

function readBackendPort() {
  if (!fs.existsSync(appYamlPath)) {
    throw new Error(`application.yml introuvable: ${appYamlPath}`);
  }
  const content = fs.readFileSync(appYamlPath, 'utf8');
  const match = content.match(/^\s*server:\s*\n(?:[^\n]*\n)*?\s*port:\s*(\d+)/m);
  if (!match) {
    throw new Error('Port introuvable dans application.yml');
  }
  return match[1];
}

function updateProxyTargets(port) {
  if (!fs.existsSync(proxyPath)) {
    throw new Error(`proxy.conf.json introuvable: ${proxyPath}`);
  }
  const proxy = JSON.parse(fs.readFileSync(proxyPath, 'utf8'));
  const nextTarget = `https://localhost:${port}`;

  proxy['/api'] = proxy['/api'] || {};
  proxy['/ws-ranking'] = proxy['/ws-ranking'] || {};

  proxy['/api'].target = nextTarget;
  proxy['/api'].secure = false;

  proxy['/ws-ranking'].target = nextTarget;
  proxy['/ws-ranking'].secure = false;

  fs.writeFileSync(proxyPath, JSON.stringify(proxy, null, 2));
  console.log(`proxy.conf.json mis à jour avec le port ${port} (HTTPS)`);
}

function main() {
  const port = readBackendPort();
  updateProxyTargets(port);
}

main();
