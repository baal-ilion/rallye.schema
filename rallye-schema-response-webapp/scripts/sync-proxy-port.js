const fs = require('fs');
const path = require('path');

const appYamlPath = path.resolve(__dirname, '../response-service/src/main/resources/application.yml');
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

function updateProxyTarget(port) {
  if (!fs.existsSync(proxyPath)) {
    throw new Error(`proxy.conf.json introuvable: ${proxyPath}`);
  }
  const proxy = JSON.parse(fs.readFileSync(proxyPath, 'utf8'));
  proxy['/api'] = proxy['/api'] || {};
  const nextTarget = `http://localhost:${port}`;

  if (proxy['/api'].target !== nextTarget) {
    proxy['/api'].target = nextTarget;
    fs.writeFileSync(proxyPath, JSON.stringify(proxy, null, 2));
    console.log(`proxy.conf.json mis a jour avec le port ${port}`);
  }
}

(() => {
  const port = readBackendPort();
  updateProxyTarget(port);
})();
