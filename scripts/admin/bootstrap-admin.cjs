'use strict';

const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value);
}

function parseBool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizePrivateKey(raw) {
  let k = String(raw || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).replace(/\\"/g, '"');
  }
  return k.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
}

async function main() {
  const email = required('ADMIN_EMAIL').toLowerCase();
  const projectId = required('FIREBASE_PROJECT_ID');
  const clientEmail = required('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(required('FIREBASE_PRIVATE_KEY'));
  const mongoUri = required('MONGODB_URI');
  const dbName = process.env.MONGODB_DB || 'hiremebharat';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';
  const createIfMissing = parseBool(process.env.CREATE_IF_MISSING, true);
  const tempPassword = process.env.ADMIN_TEMP_PASSWORD || '';

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (!createIfMissing) throw err;
    if (!tempPassword) {
      throw new Error(
        'ADMIN_TEMP_PASSWORD is required when CREATE_IF_MISSING=true and user does not exist.'
      );
    }
    userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName,
    });
    console.log(`Created Firebase user: uid=${userRecord.uid}`);
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');
  const now = new Date();
  const provider = (userRecord.providerData && userRecord.providerData[0] && userRecord.providerData[0].providerId) || 'password';

  await users.updateOne(
    { uid: userRecord.uid },
    {
      $set: {
        email: userRecord.email || email,
        displayName: userRecord.displayName || displayName,
        role: 'ADMIN',
        photoURL: userRecord.photoURL || null,
        provider,
        updatedAt: now,
      },
      $setOnInsert: {
        uid: userRecord.uid,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'ADMIN' });
  await client.close();

  const fingerprint = crypto.createHash('sha256').update(userRecord.uid).digest('hex').slice(0, 12);
  console.log(`ADMIN READY email=${email} uid_fingerprint=${fingerprint} db=${dbName}`);
}

main().catch((err) => {
  console.error('Admin bootstrap failed:', err.message || err);
  process.exit(1);
});

