import * as admin from 'firebase-admin';

function parsePrivateKey(raw: string): string {
  const key = raw.replace(/\\n/g, '\n').trim();
  if (!key.includes('BEGIN')) {
    throw new Error(
      'FIREBASE_ADMIN_PRIVATE_KEY must be the full PEM private key from your service account JSON (including BEGIN/END lines).'
    );
  }
  return key;
}

export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      'Missing Firebase Admin configuration. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  const privateKey = parsePrivateKey(privateKeyRaw);

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}
