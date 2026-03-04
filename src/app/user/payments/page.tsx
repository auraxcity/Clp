'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, addDoc, collection, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuthInstance, getDb, getStorageInstance } from '@/lib/firebase';
import { 
  ArrowLeft, 
  CreditCard,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  Phone
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MERCHANT_CODES, Loan, Borrower } from '@/types';

export default function PaymentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    paymentType: 'full',
    amount: '',
    paymentMethod: 'mtn_momo',
    transactionId: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);

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
        where('status', 'in', ['active', 'due_soon', 'late']),
        orderBy('createdAt', 'desc')
      );
      const loansSnapshot = await getDocs(loansQuery);
      if (!loansSnapshot.empty) {
        const loanData = { id: loansSnapshot.docs[0].id, ...loansSnapshot.docs[0].data() } as Loan;
        setActiveLoan(loanData);
        setFormData(prev => ({
          ...prev,
          amount: loanData.outstandingBalance.toString()
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePaymentTypeChange = (type: string) => {
    if (!activeLoan) return;
    
    if (type === 'full') {
      setFormData({ ...formData, paymentType: type, amount: activeLoan.outstandingBalance.toString() });
    } else if (type === 'half') {
      setFormData({ ...formData, paymentType: type, amount: (activeLoan.outstandingBalance / 2).toString() });
    } else {
      setFormData({ ...formData, paymentType: type, amount: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !borrower || !activeLoan) {
      toast.error('No active loan found');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > activeLoan.outstandingBalance) {
      toast.error('Amount cannot exceed outstanding balance');
      return;
    }

    if (!formData.transactionId) {
      toast.error('Please enter the transaction ID');
      return;
    }

    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const storage = getStorageInstance();

      const proofRef = ref(storage, `payments/${userId}/${Date.now()}_${proofFile.name}`);
      await uploadBytes(proofRef, proofFile);
      const proofUrl = await getDownloadURL(proofRef);

      await addDoc(collection(db, 'payments'), {
        loanId: activeLoan.id,
        borrowerId: userId,
        borrowerName: borrower.fullName,
        borrowerPhone: borrower.phone,
        amount: amount,
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        proofImageUrl: proofUrl,
        status: 'pending',
        submittedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Payment submitted for approval!');
      router.push('/user/dashboard');
    } catch (error) {
      console.error('Payment submission error:', error);
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]"></div>
      </div>
    );
  }

  if (!activeLoan) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Toaster position="top-right" />
        <div className="max-w-md mx-auto mt-20">
          <Card className="p-8 text-center">
            <Info className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Loan</h2>
            <p className="text-gray-600 mb-6">
              You don&apos;t have any active loan to make payment for.
            </p>
            <Link href="/user/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </div>
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
            <h1 className="ml-4 font-bold text-lg">Make Payment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loan Summary */}
        <Card className={`p-6 mb-6 border-l-4 ${
          activeLoan.status === 'late' ? 'border-l-red-500 bg-red-50' :
          activeLoan.status === 'due_soon' ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-green-500 bg-green-50'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Outstanding Balance</h2>
              <p className="text-3xl font-bold text-[#0A1F44]">
                {formatCurrency(activeLoan.outstandingBalance)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Due: {formatDate(activeLoan.dueDate)}
              </p>
            </div>
            {activeLoan.status === 'late' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Methods</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl text-center">
              <div className="h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center mx-auto mb-2">
                <span className="text-black font-bold text-sm">MTN</span>
              </div>
              <p className="text-sm font-medium text-yellow-900">MTN Mobile Money</p>
              <p className="text-2xl font-bold text-yellow-800 mt-1">{MERCHANT_CODES.mtn_momo}</p>
              <p className="text-xs text-yellow-700 mt-1">Merchant Code</p>
            </div>
            
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-center">
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold text-xs">Airtel</span>
              </div>
              <p className="text-sm font-medium text-red-900">Airtel Money</p>
              <p className="text-2xl font-bold text-red-800 mt-1">{MERCHANT_CODES.airtel_money}</p>
              <p className="text-xs text-red-700 mt-1">*185*9# → Kule Crescent</p>
            </div>
          </div>
        </Card>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Details</h2>
            
            <div className="space-y-4">
              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('full')}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.paymentType === 'full'
                        ? 'border-[#00A86B] bg-[#00A86B]/10 text-[#00A86B]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500">Full Amount</p>
                    <p className="font-bold">{formatCurrency(activeLoan.outstandingBalance)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('half')}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.paymentType === 'half'
                        ? 'border-[#00A86B] bg-[#00A86B]/10 text-[#00A86B]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500">Half</p>
                    <p className="font-bold">{formatCurrency(activeLoan.outstandingBalance / 2)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('custom')}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.paymentType === 'custom'
                        ? 'border-[#00A86B] bg-[#00A86B]/10 text-[#00A86B]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500">Custom</p>
                    <p className="font-bold">Other</p>
                  </button>
                </div>
                
                {formData.paymentType === 'custom' && (
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    max={activeLoan.outstandingBalance}
                  />
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="airtel_money">Airtel Money</option>
                </Select>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID *
                </label>
                <Input
                  type="text"
                  placeholder="Enter transaction ID from receipt"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                />
              </div>

              {/* Payment Proof */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof (Screenshot) *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>{proofFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Upload screenshot of payment</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ position: 'relative' }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Info */}
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to pay:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your mobile money menu</li>
                  <li>Select &quot;Pay Merchant&quot; or &quot;Pay Bill&quot;</li>
                  <li>Enter the merchant code above</li>
                  <li>Enter the amount and confirm</li>
                  <li>Take a screenshot and upload here</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#00A86B] hover:bg-[#008f5b] py-4 text-lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !formData.transactionId || !proofFile}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Submit Payment
          </Button>
        </form>

        {/* Contact Support */}
        <Card className="p-4 mt-6">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Need help? Contact us:</p>
              <p className="font-medium text-gray-900">+256 773416453 | WhatsApp: +256 740532008</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
