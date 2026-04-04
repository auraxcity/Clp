'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { Shield, Check, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupPage() {
  const router = useRouter();
  const [setupKey, setSetupKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (setupKey !== 'CLP_SETUP_2024') {
      toast.error('Invalid setup key');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuthInstance();
      const db = getDb();
      
      const admins = [
        { 
          email: 'agatwitechnologies@gmail.com', 
          password: 'mama48@nitah', 
          fullName: 'Super Admin', 
          phone: '+256700000000', 
          role: 'super_admin' as const,
          permissions: ['full_access'],
        },
        { 
          email: 'twinemugabe@gmail.com', 
          password: 'admin123', 
          fullName: 'Admin User', 
          phone: '+256773416453', 
          role: 'admin' as const,
          permissions: ['manage_users', 'manage_loans', 'manage_payments', 'view_reports'],
        },
      ];

      for (const admin of admins) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, admin.email, admin.password);
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: admin.email,
            phone: admin.phone || '',
            fullName: admin.fullName,
            role: admin.role,
            permissions: admin.permissions,
            isActive: true,
            kycVerified: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (!msg.includes('email-already-in-use')) throw err;
        }
      }

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
        totalActiveInvestments: 0,
        totalInvestmentValue: 0,
        totalPendingWithdrawals: 0,
        updatedAt: Timestamp.now(),
      });

      toast.success('Admin accounts and system stats ready!');
      setIsComplete(true);
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: unknown) {
      console.error('Setup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Setup failed';
      
      if (errorMessage.includes('email-already-in-use')) {
        toast.success('Admin(s) already exist. System stats updated. Redirecting...');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        toast.error(`Setup failed: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0A1F44] to-[#0A1F44]/90 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
              <Shield className="h-8 w-8 text-[#0A1F44]" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#0A1F44]">Initial Setup</h1>
            <p className="text-gray-500 mt-2">Configure super admin account</p>
          </div>

          {isComplete ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Complete!</h2>
              <p className="text-gray-600 mb-4">Redirecting to login...</p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
                <p className="text-sm font-medium text-gray-700">Admin logins:</p>
                <p className="text-sm text-gray-600">
                  <strong>Super Admin:</strong><br />
                  agatwitechnologies@gmail.com
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">One-time setup</p>
                    <p className="text-xs text-amber-700 mt-1">
                      This will create the super admin account and initialize the system.
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSetup} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setup Key
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter setup key"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    className="w-full"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Key: CLP_SETUP_2024
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">This will create:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Super Admin: agatwitechnologies@gmail.com</li>
                    <li>• Admin: twinemugabe@gmail.com</li>
                    <li>• Initialize system statistics (Firestore)</li>
                  </ul>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Initialize System
                </Button>
              </form>
            </>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              CLP - Creso&apos;s Loan Plug
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
