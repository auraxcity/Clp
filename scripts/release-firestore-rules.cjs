/**
 * Publishes ./firestore.rules to the Firebase project using the Admin SDK
 * (same credentials as server-side Firestore — no separate `firebase login`).
 *
 * Credentials (first match wins):
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON — full service account JSON string
 * 2. GOOGLE_APPLICATION_CREDENTIALS — path to service account .json file
 * 3. ./firebase-adminsdk.local.json in repo root
 * 4. FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
      val = val.replace(/\\n/g, '\n');
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function getCredential() {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonRaw && jsonRaw.trim()) {
    return admin.credential.cert(JSON.parse(jsonRaw));
  }

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const localPath = path.join(root, 'firebase-adminsdk.local.json');
  const keyPath =
    gac && fs.existsSync(gac)
      ? gac
      : fs.existsSync(localPath)
        ? localPath
        : null;
  if (keyPath) {
    const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    return admin.credential.cert(sa);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  throw new Error(
    'No Firebase admin credentials found.\n\n' +
      'Do one of the following, then run: npm run deploy:firestore-rules\n\n' +
      'A) In Firebase Console → Project settings → Service accounts → Generate new private key.\n' +
      '   Save the file as: firebase-adminsdk.local.json (project root). It is gitignored.\n\n' +
      'B) Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local to the entire JSON on one line.\n\n' +
      'C) Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local.'
  );
}

async function main() {
  loadEnvLocal();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: getCredential() });
  }

  const source = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  const result = await admin.securityRules().releaseFirestoreRulesetFromSource(source);
  console.log('Firestore rules published.', result.name || '');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
