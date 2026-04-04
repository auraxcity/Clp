'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  onSnapshot,
  Timestamp,
  orderBy 
} from 'firebase/firestore';
import { Investor, Investment, Loan, WithdrawalRequest, INVESTMENT_TERMS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  PiggyBank,
  Wallet,
  TrendingUp,
  DollarSign,
  LogOut,
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowDownCircle,
  Calendar,
  Target,
  RefreshCw,
  Banknote,
  CreditCard,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function AnimatedBalance({ value, label, prefix = 'UGX ' }: { value: number; label: string; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const diff = value - displayValue;
      const steps = 50;
      const stepValue = diff / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(value);
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          setDisplayValue(prev => Math.round(prev + stepValue));
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [value, displayValue]);

  return (
    <div className={`transition-all duration-300 ${isAnimating ? 'scale-105' : ''}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${isAnimating ? 'text-[#00A86B]' : 'text-gray-900'}`}>
        {prefix}{displayValue.toLocaleString()}
      </p>
    </div>
  );
}

function InvestorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentDuration, setInvestmentDuration] = useState<3 | 6>(3);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'loans' | 'withdrawals'>('overview');

  const loadInvestorData = useCallback(async (authUserId: string) => {
    try {
      const db = getDb();
      
      const investorQuery = query(
        collection(db, 'investors'),
        where('authUserId', '==', authUserId)
      );
      const investorSnapshot = await getDocs(investorQuery);
      
      if (investorSnapshot.empty) {
        router.push('/investor/login');
        return;
      }

      const investorDoc = investorSnapshot.docs[0];
      const investorData = { id: investorDoc.id, ...investorDoc.data() } as Investor;
      setInvestor(investorData);

      const investmentsQuery = query(
        collection(db, 'investments'),
        where('investorId', '==', investorDoc.id),
        orderBy('createdAt', 'desc')
      );
      const investmentsSnapshot = await getDocs(investmentsQuery);
      setInvestments(investmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Investment)));

      const loansQuery = query(
        collection(db, 'loans'),
        where('investorId', '==', investorDoc.id)
      );
      const loansSnapshot = await getDocs(loansQuery);
      setLoans(loansSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Loan)));

      const withdrawalsQuery = query(
        collection(db, 'withdrawalRequests'),
        where('investorId', '==', investorDoc.id),
        orderBy('requestedAt', 'desc')
      );
      const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
      setWithdrawals(withdrawalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));

      const unsubscribe = onSnapshot(doc(db, 'investors', investorDoc.id), (snapshot) => {
        if (snapshot.exists()) {
          const updatedData = { id: snapshot.id, ...snapshot.data() } as Investor;
          setInvestor(updatedData);
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load investor data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/investor/login');
        return;
      }
      loadInvestorData(user.uid);
    });
    return () => unsubscribe();
  }, [router, loadInvestorData]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const investmentStatus = searchParams.get('investment');
    
    if (paymentStatus === 'success' || investmentStatus === 'success') {
      toast.success('Payment successful! Your investment is now active.');
    } else if (paymentStatus === 'pending') {
      toast.loading('Payment is being processed...');
    } else if (paymentStatus === 'error') {
      toast.error('Payment failed. Please try again.');
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await signOut(getAuthInstance());
      toast.success('Logged out');
      router.push('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleMakeInvestment = async () => {
    if (!investor) return;

    const amount = parseFloat(investmentAmount);
    if (!amount || amount < 100000) {
      toast.error('Minimum investment is UGX 100,000');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const term = INVESTMENT_TERMS[investmentDuration];
      const expectedReturn = amount * (1 + term.interestRate / 100);
      const startDate = new Date();
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + investmentDuration);

      const investmentRef = await addDoc(collection(db, 'investments'), {
        investorId: investor.id,
        investorName: investor.name,
        amount: amount,
        duration: investmentDuration,
        interestRate: term.interestRate,
        expectedReturn: expectedReturn,
        status: 'pending',
        startDate: Timestamp.fromDate(startDate),
        maturityDate: Timestamp.fromDate(maturityDate),
        paymentMethod: 'pesapal',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const response = await fetch('/api/pesapal/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          description: `CLP Investment - ${investmentDuration} months at ${term.interestRate}%`,
          email: investor.email,
          phone: investor.phone,
          firstName: investor.name.split(' ')[0],
          lastName: investor.name.split(' ').slice(1).join(' '),
          relatedEntityType: 'investment',
          relatedEntityId: investmentRef.id,
        }),
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        await updateDoc(doc(db, 'investments', investmentRef.id), { status: 'failed' });
        toast.error(data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Investment error:', error);
      toast.error('Failed to process investment');
    } finally {
      setIsSubmitting(false);
      setShowInvestModal(false);
    }
  };

  const handleWithdraw = async () => {
    if (!investor) return;

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > investor.capitalAvailable) {
      toast.error('Insufficient available balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      
      await addDoc(collection(db, 'withdrawalRequests'), {
        investorId: investor.id,
        investorName: investor.name,
        amount: amount,
        status: 'pending',
        requestedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, 'investors', investor.id), {
        capitalAvailable: investor.capitalAvailable - amount,
        updatedAt: Timestamp.now(),
      });

      toast.success('Withdrawal request submitted! Processing takes up to 24 hours.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      
      const auth = getAuthInstance();
      if (auth.currentUser) {
        loadInvestorData(auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeInvestments = investments.filter(i => i.status === 'active');
  const maturedInvestments = investments.filter(i => i.status === 'matured');
  const totalExpectedReturn = activeInvestments.reduce((sum, i) => sum + i.expectedReturn, 0);
  const nextMaturity = activeInvestments.length > 0 
    ? activeInvestments.reduce((earliest, i) => 
        new Date(i.maturityDate) < new Date(earliest.maturityDate) ? i : earliest
      )
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]" />
      </div>
    );
  }

  if (!investor) return null;

  const selectedTerm = INVESTMENT_TERMS[investmentDuration];
  const investAmount = parseFloat(investmentAmount) || 0;
  const expectedReturn = investAmount * (1 + selectedTerm.interestRate / 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <header className="bg-[#0A1F44] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-[#0A1F44]" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Investor Portal</h1>
                <p className="text-xs text-gray-300">{investor.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Investment Overview</h2>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {investor.name.split(' ')[0]}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowInvestModal(true)}
              className="bg-[#00A86B] hover:bg-[#008f5b]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Make Investment
            </Button>
            <Button 
              onClick={() => setShowWithdrawModal(true)}
              variant="outline"
              disabled={investor.capitalAvailable <= 0}
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0A1F44]/5 rounded-full -mr-8 -mt-8" />
            <div className="flex items-start gap-3 relative">
              <div className="h-12 w-12 rounded-xl bg-[#0A1F44] flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <AnimatedBalance 
                value={investor.capitalCommitted} 
                label="Total Invested" 
              />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mr-8 -mt-8" />
            <div className="flex items-start gap-3 relative">
              <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center">
                <Banknote className="h-6 w-6 text-white" />
              </div>
              <AnimatedBalance 
                value={investor.capitalAvailable} 
                label="Available Balance" 
              />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-full -mr-8 -mt-8" />
            <div className="flex items-start gap-3 relative">
              <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#0A1F44]" />
              </div>
              <AnimatedBalance 
                value={investor.totalProfitEarned + (investor.accruedInterest || 0)} 
                label="Total Earnings" 
              />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full -mr-8 -mt-8" />
            <div className="flex items-start gap-3 relative">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ROI</p>
                <p className="text-2xl font-bold text-gray-900">{investor.roi.toFixed(2)}%</p>
              </div>
            </div>
          </Card>
        </div>

        {investor.accruedInterest > 0 && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-[#00A86B]/10 to-[#D4AF37]/10 border-[#00A86B]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#00A86B] flex items-center justify-center animate-pulse">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accrued Interest (Updated Daily)</p>
                <p className="text-xl font-bold text-[#00A86B]">
                  +{formatCurrency(investor.accruedInterest)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'investments', 'loans', 'withdrawals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-[#0A1F44] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Active Investments
              </h3>
              {activeInvestments.length === 0 ? (
                <div className="text-center py-8">
                  <PiggyBank className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active investments</p>
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setShowInvestModal(true)}
                  >
                    Make Your First Investment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeInvestments.map((investment) => (
                    <div
                      key={investment.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(investment.amount)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          {investment.duration} months @ {investment.interestRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Matures: {formatDate(investment.maturityDate)}
                        </span>
                        <span className="text-[#00A86B] font-medium">
                          +{formatCurrency(investment.expectedReturn - investment.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Funded Loans
              </h3>
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No loans funded yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Admin will allocate your capital to loans
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.slice(0, 5).map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{loan.borrowerName}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(loan.principalAmount)} · {loan.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Due {formatDate(loan.dueDate)}</p>
                        <p className="text-sm font-medium">
                          {formatCurrency(loan.outstandingBalance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {nextMaturity && (
              <Card className="p-6 lg:col-span-2 bg-gradient-to-r from-[#0A1F44] to-[#0A1F44]/90 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
                      <Calendar className="h-7 w-7 text-[#0A1F44]" />
                    </div>
                    <div>
                      <p className="text-gray-300">Next Payout</p>
                      <p className="text-2xl font-bold">{formatDate(nextMaturity.maturityDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300">Expected Amount</p>
                    <p className="text-2xl font-bold text-[#D4AF37]">
                      {formatCurrency(nextMaturity.expectedReturn)}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'investments' && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">All Investments</h3>
            {investments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No investments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Maturity</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Return</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">{formatDate(inv.createdAt)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{formatCurrency(inv.amount)}</td>
                        <td className="py-3 px-4 text-sm">{inv.duration} months</td>
                        <td className="py-3 px-4 text-sm">{inv.interestRate}%</td>
                        <td className="py-3 px-4 text-sm">{formatDate(inv.maturityDate)}</td>
                        <td className="py-3 px-4 text-sm text-[#00A86B] font-medium">
                          {formatCurrency(inv.expectedReturn)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            inv.status === 'active' ? 'bg-green-100 text-green-700' :
                            inv.status === 'matured' ? 'bg-blue-100 text-blue-700' :
                            inv.status === 'withdrawn' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'loans' && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Funded Loans</h3>
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No loans funded yet</p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{loan.borrowerName}</p>
                        <p className="text-sm text-gray-500">{loan.borrowerPhone}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        loan.status === 'active' ? 'bg-green-100 text-green-700' :
                        loan.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        loan.status === 'late' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Principal</p>
                        <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Outstanding</p>
                        <p className="font-medium">{formatCurrency(loan.outstandingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium">{formatDate(loan.dueDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'withdrawals' && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Withdrawal History</h3>
            {withdrawals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No withdrawal requests yet</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {w.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : w.status === 'pending' || w.status === 'processing' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(w.amount)}</p>
                        <p className="text-sm text-gray-500">{formatDate(w.requestedAt)}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      w.status === 'completed' ? 'bg-green-100 text-green-700' :
                      w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>

      <Modal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
        title="Make Investment"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Amount (UGX)
            </label>
            <Input
              type="number"
              placeholder="Minimum 100,000"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              min={100000}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum investment: UGX 100,000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([3, 6] as const).map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setInvestmentDuration(months)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    investmentDuration === months
                      ? 'border-[#00A86B] bg-[#00A86B]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-gray-900">{months} Months</p>
                  <p className="text-sm text-[#00A86B]">{INVESTMENT_TERMS[months].interestRate}% Return</p>
                </button>
              ))}
            </div>
          </div>

          {investAmount > 0 && (
            <Card className="p-4 bg-[#0A1F44] text-white">
              <h4 className="font-medium mb-3">Investment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Principal</span>
                  <span>{formatCurrency(investAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Duration</span>
                  <span>{investmentDuration} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Interest Rate</span>
                  <span>{selectedTerm.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Interest Earned</span>
                  <span className="text-[#00A86B]">+{formatCurrency(expectedReturn - investAmount)}</span>
                </div>
                <hr className="border-white/20" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Payout</span>
                  <span className="text-[#D4AF37]">{formatCurrency(expectedReturn)}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Payment via PesaPal (Mobile Money / Card)</span>
          </div>

          <Button
            onClick={handleMakeInvestment}
            className="w-full bg-[#00A86B] hover:bg-[#008f5b]"
            isLoading={isSubmitting}
            disabled={isSubmitting || investAmount < 100000}
          >
            Proceed to Payment
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw Funds"
      >
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(investor.capitalAvailable)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount (UGX)
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              max={investor.capitalAvailable}
            />
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Processing Time</p>
                <p className="text-yellow-700 mt-1">
                  Withdrawal requests are processed within 24 hours. You will receive your funds via mobile money.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowWithdrawModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              className="flex-1"
              isLoading={isSubmitting}
              disabled={isSubmitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function InvestorDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]" />
      </div>
    }>
      <InvestorDashboardContent />
    </Suspense>
  );
}
