import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _storage: FirebaseStorage | undefined;
let initialized = false;

function initFirebase() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  
  if (!firebaseConfig.apiKey) {
    console.warn('Firebase config not found. Please set environment variables.');
    return;
  }
  
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    _db = getFirestore(app);
    _auth = getAuth(app);
    _storage = getStorage(app);
    initialized = true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    initFirebase();
    if (!_db) throw new Error('Firebase Firestore not initialized');
    return (_db as unknown as Record<string, unknown>)[prop as string];
  }
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    initFirebase();
    if (!_auth) throw new Error('Firebase Auth not initialized');
    return (_auth as unknown as Record<string, unknown>)[prop as string];
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    initFirebase();
    if (!_storage) throw new Error('Firebase Storage not initialized');
    return (_storage as unknown as Record<string, unknown>)[prop as string];
  }
});

export function getFirebaseApp() {
  initFirebase();
  return app;
}

export default app;
