// Setup Super Admin Script
// Run with: node scripts/setup-super-admin.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
// You need to download your service account key from Firebase Console
// and save it as serviceAccountKey.json in the root directory

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function setupSuperAdmin() {
  const email = 'agatwitechnologies@gmail.com';
  const password = 'mama48@nitah';
  const fullName = 'Super Admin';
  const phone = '+256700000000';

  try {
    // Check if user already exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('User already exists:', user.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user
        user = await auth.createUser({
          email,
          password,
          displayName: fullName,
        });
        console.log('Created user:', user.uid);
      } else {
        throw error;
      }
    }

    // Create or update user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email,
      phone,
      fullName,
      role: 'super_admin',
      permissions: ['full_access'],
      isActive: true,
      kycVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('Super admin setup complete!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', user.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up super admin:', error);
    process.exit(1);
  }
}

setupSuperAdmin();
