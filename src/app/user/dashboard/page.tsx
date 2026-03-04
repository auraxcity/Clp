'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { 
  Wallet, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  History,
  CreditCard,
  LogOut,
  User,
  Copy,
  Gift,
  TrendingUp
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loan, Borrower } from '@/types';

export default function UserDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadUserData(user.uid);
      } else {
        router.push('/user/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUserData = async (uid: string) => {
    try {
      const db = getDb();
      
      const borrowerDoc = await getDoc(doc(db, 'borrowers', uid));
      if (borrowerDoc.exists()) {
        setBorrower({ id: borrowerDoc.id, ...borrowerDoc.data() } as Borrower);
      }

      const loansQuery = query(
        collection(db, 'loans'),
        where('borrowerId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const loansSnapshot = await getDocs(loansQuery);
      const loansData = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
      setLoans(loansData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const copyReferralCode = () => {
    if (borrower?.referralCode) {
      navigator.clipboard.writeText(borrower.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const activeLoan = loans.find(l => ['active', 'due_soon', 'late', 'approved'].includes(l.status));
  const pendingApplications = loans.filter(l => l.status === 'pending');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-[#0A1F44] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#0A1F44] font-bold">CLP</span>
              </div>
              <div>
                <h1 className="font-bold text-lg">CLP</h1>
                <p className="text-xs text-gray-300">My Account</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{borrower?.fullName || 'User'}</p>
                <p className="text-xs text-gray-300">{borrower?.phone}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {borrower?.fullName?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-600 mt-1">Manage your loans and payments</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Balance</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(borrower?.currentActiveLoanBalance || 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Repaid</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(borrower?.totalAmountRepaid || 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Loans Taken</p>
                <p className="text-lg font-bold text-gray-900">
                  {borrower?.totalLoansTaken || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Gift className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Referral Earnings</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(borrower?.referralEarnings || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Loan Alert */}
        {activeLoan && (
          <Card className={`p-6 mb-8 border-l-4 ${
            activeLoan.status === 'late' ? 'border-l-red-500 bg-red-50' :
            activeLoan.status === 'due_soon' ? 'border-l-yellow-500 bg-yellow-50' :
            'border-l-green-500 bg-green-50'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {activeLoan.status === 'late' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : activeLoan.status === 'due_soon' ? (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {activeLoan.status === 'late' ? 'Payment Overdue!' :
                     activeLoan.status === 'due_soon' ? 'Payment Due Soon' :
                     'Active Loan'}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  Outstanding: <span className="font-bold">{formatCurrency(activeLoan.outstandingBalance)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Due Date: <span className="font-medium">{formatDate(activeLoan.dueDate)}</span>
                </p>
              </div>
              <Link href="/user/payments">
                <Button className="bg-[#00A86B] hover:bg-[#008f5b]">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Make Payment
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Card className="p-6 mb-8 border-l-4 border-l-blue-500 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Pending Application</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your loan application for {formatCurrency(pendingApplications[0].principalAmount)} is under review.
            </p>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/user/apply">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Apply for Loan</h3>
                  <p className="text-sm text-gray-500">Get funds in 24 hours</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/user/payments">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Make Payment</h3>
                  <p className="text-sm text-gray-500">Pay via Mobile Money</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/user/history">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#0A1F44] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Loan History</h3>
                  <p className="text-sm text-gray-500">View all transactions</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Referral Section */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Your Referral Code</h3>
              <p className="text-sm text-gray-500 mb-3">
                Earn UGX 5,000 for every friend who signs up!
              </p>
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-gray-100 rounded-lg font-mono font-bold text-lg">
                  {borrower?.referralCode || 'Loading...'}
                </div>
                <button
                  onClick={copyReferralCode}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Copy code"
                >
                  <Copy className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-[#00A86B]">
                {formatCurrency(borrower?.referralEarnings || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Loans */}
        {loans.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Loans</h3>
            <div className="space-y-3">
              {loans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(loan.principalAmount)}</p>
                    <p className="text-sm text-gray-500">{formatDate(loan.createdAt)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    loan.status === 'closed' ? 'bg-green-100 text-green-800' :
                    loan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    loan.status === 'late' ? 'bg-red-100 text-red-800' :
                    loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    loan.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            {loans.length > 5 && (
              <Link href="/user/history" className="block text-center mt-4 text-sm text-[#00A86B] hover:underline">
                View all loans →
              </Link>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
