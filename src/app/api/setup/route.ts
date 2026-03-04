import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Setup endpoint. Use POST with setup_key to initialize super admin.',
    instructions: [
      '1. Make sure Firebase is configured in your project',
      '2. Enable Email/Password authentication in Firebase Console',
      '3. Create the super admin user manually in Firebase Console or use this endpoint'
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { setup_key } = body;

    if (setup_key !== 'CLP_SETUP_2024') {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin account should be created directly in Firebase Console',
      steps: [
        '1. Go to Firebase Console > Authentication',
        '2. Click "Add user"',
        '3. Email: twinemugabe@gmail.com',
        '4. Password: admin123',
        '5. Then create corresponding user document in Firestore'
      ]
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
