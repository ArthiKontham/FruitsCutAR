#!/usr/bin/env node
/*
 * Fruits Cut AR — no-build local server (Node).
 *
 * You do not need this if you are using Vite: `npm run dev` is better,
 * with hot reload. This exists so the project also runs with nothing
 * installed at all — no npm install, no node_modules.
 *
 * Run:  node serve.js           serve the source directly
 *       node serve.js --dist    serve the built dist/ folder instead
 *
 * Two listeners, on purpose:
 *   HTTP  on localhost — browsers treat localhost as a secure context even
 *                        without TLS, so the camera works and there is no
 *                        certificate warning. Use this on your own machine.
 *   HTTPS on the LAN   — a phone at 192.168.x.x gets no such exemption and
 *                        genuinely needs TLS. Skipped if certs/ is absent.
 */

// package.json sets "type":"module" for Vite, so this file must be ESM.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HTTP_PORT = 8790;
const HTTPS_PORT = 8791;
const ROOT = __dirname;
const USE_DIST = process.argv.includes('--dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  // Required. A .wasm served as the wrong type refuses to instantiate and
  // hand tracking dies with no obvious error.
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
  '.binarypb': 'application/octet-stream',
};

/* Vite serves public/ from the site root. To run the same index.html with
 * no build step we mimic that: look in the project root first, then public/. */
function searchDirs() {
  if (USE_DIST) {
    const d = path.join(ROOT, 'dist');
    if (!fs.existsSync(path.join(d, 'index.html'))) {
      console.error('\ndist/ has no index.html — run `npm run build` first.\n');
      process.exit(1);
    }
    return [d];
  }
  return [ROOT, path.join(ROOT, 'public')];
}
const DIRS = searchDirs();

function resolve(urlPath) {
  const clean = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  for (const dir of DIRS) {
    const file = path.join(dir, clean);
    if (!file.startsWith(dir)) continue;          // no escaping the folder
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch (e) { /* try the next directory */ }
  }
  return null;
}

function handler(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  const file = resolve(rel);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + rel);
    console.log('  404 ' + rel);
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': fs.statSync(file).size,
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
  console.log('  200 ' + rel);
}

function onError(label, port) {
  return (e) => {
    if (e.code === 'EADDRINUSE')
      console.error(`\n${label} port ${port} is in use. Change it at the top of serve.js.\n`);
    else console.error(e);
    process.exit(1);
  };
}

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal && !out.includes(net.address)) out.push(net.address);
    }
  }
  return out;
}

const plain = http.createServer(handler);
plain.on('error', onError('HTTP', HTTP_PORT));

const cert = path.join(ROOT, 'certs', 'cert.pem');
const key = path.join(ROOT, 'certs', 'key.pem');
const haveCerts = fs.existsSync(cert) && fs.existsSync(key);
let secure = null;
if (haveCerts) {
  secure = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, handler);
  secure.on('error', onError('HTTPS', HTTPS_PORT));
}

plain.listen(HTTP_PORT, '0.0.0.0', () => {
  const bar = '='.repeat(60);
  console.log(`\n${bar}\n  FRUITS CUT AR${USE_DIST ? '  (serving dist/)' : ''}\n${bar}`);
  console.log(`\n  ON THIS COMPUTER  ->  http://localhost:${HTTP_PORT}/`);
  console.log('     No certificate warning. Browsers trust localhost, so the');
  console.log('     camera works over plain http here.');

  if (secure) {
    secure.listen(HTTPS_PORT, '0.0.0.0', () => {
      const ips = lanIPs();
      if (ips.length) {
        console.log('\n  ON YOUR PHONE (same WiFi):');
        ips.forEach((ip) => console.log(`     https://${ip}:${HTTPS_PORT}/`));
        console.log('     A phone needs real https. The certificate is self-signed,');
        console.log('     so you get one warning: Advanced, then Proceed.');
      }
      console.log('\n  Ctrl+C to stop.\n');
    });
  } else {
    console.log('\n  certs/ not found, so the https listener is off.');
    console.log('  That only matters for testing on a phone.');
    console.log('\n  Ctrl+C to stop.\n');
  }
});
