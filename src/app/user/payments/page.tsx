'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuthInstance, getDb, getStorageInstance } from '@/lib/firebase';
import { 
  ArrowLeft, 
  CreditCard,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  Phone,
  Globe,
  Banknote,
  Smartphone,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MERCHANT_CODES, ONLINE_PAYMENT_FEE, Loan, Borrower } from '@/types';

export default function PaymentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'online' | 'manual'>('manual');

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
      const auth = getAuthInstance();
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || '';
      const userPhone = currentUser?.phoneNumber || '';
      
      let borrowerData: Borrower | null = null;
      let borrowerIds: string[] = [uid];
      
      const borrowerDoc = await getDoc(doc(db, 'borrowers', uid));
      if (borrowerDoc.exists()) {
        borrowerData = { id: borrowerDoc.id, ...borrowerDoc.data() } as Borrower;
        setBorrower(borrowerData);
      } else {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          borrowerData = {
            id: uid,
            userId: uid,
            fullName: userData.fullName || 'User',
            phone: userData.phone || '',
            email: userData.email || '',
            location: userData.location || '',
          } as Borrower;
          setBorrower(borrowerData);
        }
      }

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
          if (!borrowerData) {
            borrowerData = { id: doc.id, ...doc.data() } as Borrower;
            setBorrower(borrowerData);
          }
        });
      }

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
          if (!borrowerData) {
            borrowerData = { id: doc.id, ...doc.data() } as Borrower;
            setBorrower(borrowerData);
          }
        });
      }

      let allActiveLoans: Loan[] = [];
      
      for (const borrowerId of borrowerIds) {
        const loansQuery = query(
          collection(db, 'loans'),
          where('borrowerId', '==', borrowerId)
        );
        const loansSnapshot = await getDocs(loansQuery);
        
        if (!loansSnapshot.empty) {
          const loans = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
          const activeLoans = loans.filter(loan => ['active', 'due_soon', 'late', 'approved'].includes(loan.status));
          allActiveLoans = [...allActiveLoans, ...activeLoans];
        }
      }

      if (allActiveLoans.length > 0) {
        allActiveLoans.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt as unknown as string);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt as unknown as string);
          return dateB.getTime() - dateA.getTime();
        });
        
        const loanData = allActiveLoans[0];
        setActiveLoan(loanData);
        if (!borrowerData) {
          setBorrower({
            id: loanData.borrowerId,
            userId: loanData.borrowerId,
            fullName: loanData.borrowerName,
            phone: loanData.borrowerPhone,
            email: '',
            location: '',
          } as Borrower);
        }
        setFormData(prev => ({
          ...prev,
          amount: (loanData.outstandingBalance || 0).toString()
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load loan data');
    }
  };

  const handlePaymentTypeChange = (type: string) => {
    if (!activeLoan) return;
    
    if (type === 'full') {
      const amount = paymentMode === 'online' 
        ? activeLoan.outstandingBalance + ONLINE_PAYMENT_FEE 
        : activeLoan.outstandingBalance;
      setFormData({ ...formData, paymentType: type, amount: amount.toString() });
    } else if (type === 'half') {
      const halfAmount = activeLoan.outstandingBalance / 2;
      const amount = paymentMode === 'online' ? halfAmount + ONLINE_PAYMENT_FEE : halfAmount;
      setFormData({ ...formData, paymentType: type, amount: amount.toString() });
    } else {
      setFormData({ ...formData, paymentType: type, amount: '' });
    }
  };

  const handleModeChange = (mode: 'online' | 'manual') => {
    setPaymentMode(mode);
    if (activeLoan && formData.paymentType !== 'custom') {
      const baseAmount = formData.paymentType === 'full' 
        ? activeLoan.outstandingBalance 
        : activeLoan.outstandingBalance / 2;
      const amount = mode === 'online' ? baseAmount + ONLINE_PAYMENT_FEE : baseAmount;
      setFormData({ ...formData, amount: amount.toString() });
    }
  };

  const handleOnlinePayment = async () => {
    if (!userId || !borrower || !activeLoan) {
      toast.error('No active loan found');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const baseAmount = amount - ONLINE_PAYMENT_FEE;
      
      const paymentRef = await addDoc(collection(db, 'payments'), {
        loanId: activeLoan.id,
        borrowerId: userId,
        borrowerName: borrower.fullName || activeLoan.borrowerName || 'Borrower',
        amount: baseAmount,
        paymentType: formData.paymentType === 'full' ? 'full' : 'partial',
        paymentMode: 'online',
        paymentMethod: 'pesapal',
        onlineFee: ONLINE_PAYMENT_FEE,
        status: 'pending',
        submittedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const response = await fetch('/api/pesapal/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          description: `CLP Loan Payment - ${activeLoan.id}`,
          email: borrower.email,
          phone: borrower.phone,
          firstName: borrower.fullName?.split(' ')[0],
          lastName: borrower.fullName?.split(' ').slice(1).join(' '),
          relatedEntityType: 'payment',
          relatedEntityId: paymentRef.id,
        }),
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error(data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPayment = async (e: React.FormEvent) => {
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

    if (!formData.transactionId && !proofFile) {
      toast.error('Please provide either transaction ID or payment screenshot');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const storage = getStorageInstance();

      let proofUrl = '';
      if (proofFile) {
        const proofRef = ref(storage, `payments/${userId}/${Date.now()}_${proofFile.name}`);
        await uploadBytes(proofRef, proofFile);
        proofUrl = await getDownloadURL(proofRef);
      }

      const borrowerName = borrower.fullName || activeLoan.borrowerName || 'Borrower';
      const borrowerPhone = borrower.phone || activeLoan.borrowerPhone || '';

      await addDoc(collection(db, 'payments'), {
        loanId: activeLoan.id,
        borrowerId: userId,
        borrowerName,
        borrowerPhone,
        amount,
        paymentType: formData.paymentType === 'full' ? 'full' : 'partial',
        paymentMode: 'manual',
        paymentMethod: formData.paymentMethod,
        merchantCode: MERCHANT_CODES[formData.paymentMethod as keyof typeof MERCHANT_CODES],
        transactionId: formData.transactionId || undefined,
        proofImageUrl: proofUrl || undefined,
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
            <p className="text-gray-600 mb-4">
              You don&apos;t have any active loan to make payment for.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700 font-medium mb-2">This could mean:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Your loan application is pending approval</li>
                <li>Your loan has been approved but not yet disbursed</li>
                <li>You haven&apos;t applied for a loan yet</li>
                <li>Your previous loan has been fully paid</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Link href="/user/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">Dashboard</Button>
              </Link>
              <Link href="/user/apply" className="flex-1">
                <Button className="w-full">Apply for Loan</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const basePaymentAmount = formData.paymentType === 'full' 
    ? activeLoan.outstandingBalance 
    : formData.paymentType === 'half' 
      ? activeLoan.outstandingBalance / 2 
      : parseFloat(formData.amount) || 0;
  const onlineFee = paymentMode === 'online' ? ONLINE_PAYMENT_FEE : 0;
  const totalPayment = basePaymentAmount + onlineFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
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

        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Select Payment Method</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleModeChange('online')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                paymentMode === 'online'
                  ? 'border-[#00A86B] bg-[#00A86B]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <p className="font-semibold text-gray-900">Online Payment</p>
              <p className="text-xs text-gray-500 mt-1">Via PesaPal</p>
              <p className="text-xs text-orange-600 mt-1">+{formatCurrency(ONLINE_PAYMENT_FEE)} fee</p>
            </button>
            
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                paymentMode === 'manual'
                  ? 'border-[#00A86B] bg-[#00A86B]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-3">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <p className="font-semibold text-gray-900">Manual Payment</p>
              <p className="text-xs text-gray-500 mt-1">Mobile Money</p>
              <p className="text-xs text-green-600 mt-1">No extra fee</p>
            </button>
          </div>
        </Card>

        {paymentMode === 'manual' && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Mobile Money Codes</h2>
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
        )}

        <form onSubmit={paymentMode === 'manual' ? handleManualPayment : (e) => { e.preventDefault(); handleOnlinePayment(); }} className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Details</h2>
            
            <div className="space-y-4">
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

              {paymentMode === 'online' && (
                <Card className="p-4 bg-blue-50 border border-blue-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Amount</span>
                      <span className="font-medium">{formatCurrency(basePaymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Online Processing Fee</span>
                      <span className="font-medium">+{formatCurrency(ONLINE_PAYMENT_FEE)}</span>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total to Pay</span>
                      <span className="text-[#0A1F44]">{formatCurrency(totalPayment)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {paymentMode === 'manual' && (
                <>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter transaction ID from receipt"
                      value={formData.transactionId}
                      onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Provide transaction ID or screenshot (at least one required)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Proof (Screenshot)
                    </label>
                    <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#00A86B] hover:bg-gray-50 transition-colors">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span>{proofFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Click to upload screenshot of payment</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </Card>

          {paymentMode === 'manual' && (
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
          )}

          {paymentMode === 'online' && (
            <Card className="p-4 bg-green-50 border border-green-200">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Online Payment via PesaPal</p>
                  <p>You will be redirected to PesaPal to complete your payment securely using Mobile Money or Card.</p>
                </div>
              </div>
            </Card>
          )}

          <Button
            type="submit"
            className="w-full bg-[#00A86B] hover:bg-[#008f5b] py-4 text-lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || (paymentMode === 'manual' && !formData.transactionId && !proofFile)}
          >
            {paymentMode === 'online' ? (
              <>
                <Globe className="h-5 w-5 mr-2" />
                Pay {formatCurrency(totalPayment)} Online
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Submit Payment
              </>
            )}
          </Button>
        </form>

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
