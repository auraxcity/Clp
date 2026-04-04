// Script to create super admin account directly via Firebase
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDqn_rTiwad-gNeaiAAI_NMpjGEL3eQo2w",
  authDomain: "clpx-e5c07.firebaseapp.com",
  projectId: "clpx-e5c07",
  storageBucket: "clpx-e5c07.firebasestorage.app",
  messagingSenderId: "455730564653",
  appId: "1:455730564653:web:73acd323aedecbc0d5b2a4",
  measurementId: "G-EBHRJTNNV0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUserAndProfile(admin) {
  let userCredential;
  
  try {
    // Try to create the user
    userCredential = await createUserWithEmailAndPassword(auth, admin.email, admin.password);
    console.log(`✓ Created auth user: ${admin.email}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`User ${admin.email} already exists in Auth, signing in...`);
      try {
        userCredential = await signInWithEmailAndPassword(auth, admin.email, admin.password);
        console.log(`✓ Signed in as: ${admin.email}`);
      } catch (signInErr) {
        console.error(`✗ Could not sign in ${admin.email}:`, signInErr.message);
        return null;
      }
    } else {
      console.error(`✗ Error creating ${admin.email}:`, err.message);
      return null;
    }
  }

  // Now write the user document (user is authenticated)
  try {
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const existingDoc = await getDoc(userDocRef);
    
    if (!existingDoc.exists()) {
      await setDoc(userDocRef, {
        email: admin.email,
        phone: admin.phone || '',
        fullName: admin.fullName,
        role: admin.role,
        isActive: true,
        kycVerified: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`✓ Created Firestore profile for: ${admin.email} (role: ${admin.role})`);
    } else {
      console.log(`✓ Firestore profile already exists for: ${admin.email}`);
    }
  } catch (err) {
    console.error(`✗ Error creating Firestore profile for ${admin.email}:`, err.message);
  }

  return userCredential;
}

async function setup() {
  console.log('Starting Firebase setup...\n');
  
  const admins = [
    { email: 'twinemugabe@gmail.com', password: 'admin123', fullName: 'Super Admin', phone: '+256773416453', role: 'super_admin' },
    { email: 'cresosloanplug@gmail.com', password: '#Creso20@', fullName: 'Admin', phone: '', role: 'admin' },
  ];

  let lastCredential = null;
  for (const admin of admins) {
    console.log(`--- Processing: ${admin.email} ---`);
    const cred = await createUserAndProfile(admin);
    if (cred) lastCredential = cred;
    console.log('');
  }

  // Initialize system stats
  console.log('Initializing system stats...');
  try {
    await setDoc(doc(db, 'system', 'stats'), {
      totalActiveLoans: 0,
      totalCapitalDeployed: 0,
      totalCapitalAvailable: 0,
      totalExpectedInterest: 0,
      loansDueToday: 0,
      loansDueTodayValue: 0,
      loansDueThisWeek: 0,
      loansDueThisWeekValue: 0,
      totalLateLoans: 0,
      totalLateLoansValue: 0,
      portfolioAtRisk: 0,
      defaultRate: 0,
      reserveBalance: 0,
      investorProfitThisMonth: 0,
      clpNetProfitThisMonth: 0,
      totalBorrowers: 0,
      totalInvestors: 0,
      totalLoansEverIssued: 0,
      totalAmountEverDisbursed: 0,
      totalAmountEverRepaid: 0,
      updatedAt: Timestamp.now(),
    });
    console.log('✓ System stats initialized');
  } catch (err) {
    console.error('✗ Error initializing stats:', err.message);
  }

  await setDoc(doc(db, 'systemStats', 'current'), {
    totalActiveLoans: 0,
    totalCapitalDeployed: 0,
    totalCapitalAvailable: 0,
    totalExpectedInterest: 0,
    loansDueToday: 0,
    loansDueTodayValue: 0,
    loansDueThisWeek: 0,
    loansDueThisWeekValue: 0,
    totalLateLoans: 0,
    portfolioAtRisk: 0,
    defaultRate: 0,
    reserveBalance: 0,
    investorProfitThisMonth: 0,
    clpNetProfitThisMonth: 0,
    totalBorrowers: 0,
    totalInvestors: 0,
    totalLoansIssued: 0,
    totalAmountDisbursed: 0,
    totalAmountRepaid: 0,
    par7: 0,
    par30: 0,
    recoveryRatio: 0,
    capitalUtilizationRate: 0,
    liquidityRatio: 0,
    reserveCoverage: 0,
    updatedAt: Timestamp.now(),
  });

  console.log('\n=== Setup Complete ===');
  console.log('Admin logins:');
  console.log('1. twinemugabe@gmail.com / admin123 (super_admin)');
  console.log('2. cresosloanplug@gmail.com / #Creso20@ (admin)');

  // Test login
  console.log('\nTesting login with super admin...');
  try {
    const testLogin = await signInWithEmailAndPassword(auth, 'twinemugabe@gmail.com', 'admin123');
    console.log('✓ Login successful! UID:', testLogin.user.uid);
  } catch (err) {
    console.error('✗ Login test failed:', err.message);
  }

  process.exit(0);
}

setup().catch(console.error);
