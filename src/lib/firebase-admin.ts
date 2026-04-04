import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

function getPrivateKey(): string {
  const k = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!k) return '';
  return k.replace(/\\n/g, '\n');
}

function getCredential(): admin.credential.Credential {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonRaw?.trim()) {
    return admin.credential.cert(JSON.parse(jsonRaw) as admin.ServiceAccount);
  }

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const localPath = path.join(process.cwd(), 'firebase-adminsdk.local.json');
  const keyPath =
    gac && fs.existsSync(gac)
      ? gac
      : fs.existsSync(localPath)
        ? localPath
        : null;
  if (keyPath) {
    const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as admin.ServiceAccount;
    return admin.credential.cert(sa);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  throw new Error(
    'Firebase Admin: add firebase-adminsdk.local.json, or FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY (see .env.local.example)'
  );
}

/** Firestore with Admin credentials — bypasses security rules (for API routes only). */
export function getAdminDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: getCredential() });
  }
  return admin.firestore();
}
