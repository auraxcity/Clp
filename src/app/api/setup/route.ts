import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/firebase-admin-app';

const DEFAULT_SETUP_KEY = 'CLP_SETUP_2024';
const SUPER_ADMIN_EMAIL = 'twinemugabe@gmail.com';
const SUPER_ADMIN_PASSWORD = 'admin123';

function getSetupKey(): string {
  return process.env.CLP_SETUP_KEY?.trim() || DEFAULT_SETUP_KEY;
}

export async function GET() {
  return NextResponse.json({
    message: 'Setup endpoint. Use POST with setup_key to create the super admin via Firebase Admin.',
    instructions: [
      '1. Set all variables from .env.local.example in Vercel (and use the real PEM for FIREBASE_ADMIN_PRIVATE_KEY).',
      '2. Enable Email/Password in Firebase Authentication.',
      '3. POST JSON: { "setup_key": "<CLP_SETUP_KEY or CLP_SETUP_2024>" }',
      'Optionally set CLP_SETUP_KEY in production so the default key is not used.',
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { setup_key: setupKey } = body as { setup_key?: string };

    if (!setupKey || setupKey !== getSetupKey()) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 });
    }

    getFirebaseAdminApp();
    const auth = admin.auth();
    const db = admin.firestore();

    let uid: string;
    let createdAuthUser = false;

    try {
      const userRecord = await auth.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        emailVerified: true,
      });
      uid = userRecord.uid;
      createdAuthUser = true;
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
        uid = existing.uid;
      } else {
        throw err;
      }
    }

    const userRef = db.doc(`users/${uid}`);
    await userRef.set(
      {
        email: SUPER_ADMIN_EMAIL,
        phone: '+256773416453',
        fullName: 'Super Admin',
        role: 'super_admin',
        isActive: true,
        kycVerified: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const statsRef = db.doc('system/stats');
    const statsSnap = await statsRef.get();
    if (!statsSnap.exists) {
      await statsRef.set({
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
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      uid,
      authUserCreated: createdAuthUser,
      message: createdAuthUser
        ? 'Super admin created in Firebase Auth and Firestore.'
        : 'Super admin Auth user already existed; Firestore profile and system stats were ensured.',
    });
  } catch (error) {
    console.error('Setup error:', error);
    const message = error instanceof Error ? error.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
