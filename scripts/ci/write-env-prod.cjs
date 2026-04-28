'use strict';
/**
 * Writes .env.prod for the VM without shell-quoting bugs (multiline PEM breaks echo).
 * Values are JSON-string-encoded per dotenv rules so Docker Compose parses them correctly.
 */
const fs = require('fs');
const path = require('path');

function main() {
  const outPath = path.join(process.cwd(), '.env.prod');
  const mongo = process.env.MONGODB_URI ?? '';
  const fid = process.env.FIREBASE_PROJECT_ID ?? '';
  const email = process.env.FIREBASE_CLIENT_EMAIL ?? '';
  const pk = process.env.FIREBASE_PRIVATE_KEY ?? '';
  const nodeEnv = process.env.NODE_ENV_WRITER ?? 'production';

  const lines = [
    `MONGODB_URI=${JSON.stringify(mongo)}`,
    `FIREBASE_PROJECT_ID=${JSON.stringify(fid)}`,
    `FIREBASE_CLIENT_EMAIL=${JSON.stringify(email)}`,
    `FIREBASE_PRIVATE_KEY=${JSON.stringify(pk)}`,
    `NODE_ENV=${JSON.stringify(nodeEnv)}`,
  ];

  if (process.env.EMIT_REGISTRY === '1') {
    const ru = process.env.REGISTRY_USER || 'hiremeregistry';
    const rp = process.env.REGISTRY_PASSWORD || 'hiremeregistry';
    lines.push(`REGISTRY_USER=${JSON.stringify(ru)}`);
    lines.push(`REGISTRY_PASSWORD=${JSON.stringify(rp)}`);
  }

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  FIREBASE_PROJECT_ID length: ${fid.length}`);
  console.log(`  FIREBASE_PRIVATE_KEY chars: ${pk.length}`);
}

main();
