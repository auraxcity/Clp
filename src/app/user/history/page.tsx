'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { 
  ArrowLeft, 
  History,
  Wallet,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loan, Payment } from '@/types';

export default function LoanHistoryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'loans' | 'payments'>('loans');

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
      const auth = getAuthInstance();
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || '';
      const userPhone = currentUser?.phoneNumber || '';
      
      let borrowerIds: string[] = [uid];
      
      // Also search borrowers by email
      if (userEmail) {
        const borrowersByEmailQuery = query(
          collection(db, 'borrowers'),
          where('email', '==', userEmail)
        );
        const borrowersByEmail = await getDocs(borrowersByEmailQuery);
        borrowersByEmail.docs.forEach(doc => {
          if (!borrowerIds.includes(doc.id)) {
            borrowerIds.push(doc.id);
          }
        });
      }
      
      // Search borrowers by phone
      if (userPhone) {
        const borrowersByPhoneQuery = query(
          collection(db, 'borrowers'),
          where('phone', '==', userPhone)
        );
        const borrowersByPhone = await getDocs(borrowersByPhoneQuery);
        borrowersByPhone.docs.forEach(doc => {
          if (!borrowerIds.includes(doc.id)) {
            borrowerIds.push(doc.id);
          }
        });
      }

      // Collect all loans and payments for all borrower IDs
      let allLoans: Loan[] = [];
      let allPayments: Payment[] = [];
      
      for (const borrowerId of borrowerIds) {
        const loansQuery = query(
          collection(db, 'loans'),
          where('borrowerId', '==', borrowerId)
        );
        const loansSnapshot = await getDocs(loansQuery);
        const loans = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
        allLoans = [...allLoans, ...loans];

        const paymentsQuery = query(
          collection(db, 'payments'),
          where('borrowerId', '==', borrowerId)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        allPayments = [...allPayments, ...payments];
      }
      
      // Sort by date
      allLoans.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as unknown as string);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as unknown as string);
        return dateB.getTime() - dateA.getTime();
      });
      
      allPayments.sort((a, b) => {
        const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt as unknown as string);
        const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt as unknown as string);
        return dateB.getTime() - dateA.getTime();
      });
      
      setLoans(allLoans);
      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed':
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'late':
      case 'due_soon':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'default':
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'late':
      case 'due_soon':
        return 'bg-orange-100 text-orange-800';
      case 'default':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          <div className="flex items-center h-16">
            <Link href="/user/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
            <h1 className="ml-4 font-bold text-lg">History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'loans'
                ? 'bg-[#0A1F44] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wallet className="h-5 w-5 inline mr-2" />
            Loans ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-[#0A1F44] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="h-5 w-5 inline mr-2" />
            Payments ({payments.length})
          </button>
        </div>

        {/* Loans List */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loans.length === 0 ? (
              <Card className="p-8 text-center">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No loan history yet</p>
                <Link href="/user/apply" className="text-[#00A86B] hover:underline mt-2 inline-block">
                  Apply for your first loan →
                </Link>
              </Card>
            ) : (
              loans.map((loan) => (
                <Card key={loan.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(loan.status)}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(loan.principalAmount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(loan.createdAt)}
                        </p>
                        {loan.purpose && (
                          <p className="text-xs text-gray-400 mt-1">
                            Purpose: {loan.purpose}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1).replace('_', ' ')}
                      </span>
                      {loan.status !== 'closed' && loan.status !== 'rejected' && (
                        <p className="text-sm text-gray-600 mt-2">
                          Balance: {formatCurrency(loan.outstandingBalance)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Interest</p>
                      <p className="font-medium">{loan.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Payable</p>
                      <p className="font-medium">{formatCurrency(loan.totalPayable)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-medium">{formatDate(loan.dueDate)}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Payments List */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {payments.length === 0 ? (
              <Card className="p-8 text-center">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment history yet</p>
              </Card>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(payment.status)}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.submittedAt)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {payment.paymentMethod === 'mtn_momo' ? 'MTN Mobile Money' : 'Airtel Money'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                      <p className="text-xs text-gray-400 mt-2">
                        ID: {payment.transactionId}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
