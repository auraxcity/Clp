'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuthInstance, getDb, getStorageInstance } from '@/lib/firebase';
import { 
  ArrowLeft, 
  Wallet,
  Calculator,
  Upload,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { LOAN_PRODUCTS, Borrower, LoanProduct } from '@/types';

export default function ApplyForLoanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasPendingApplication, setHasPendingApplication] = useState(false);

  const [formData, setFormData] = useState({
    loanProduct: 'quick_cash' as LoanProduct,
    amount: '',
    purpose: '',
    occupation: '',
    monthlyIncome: '',
  });

  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

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
        where('status', 'in', ['active', 'due_soon', 'late', 'approved'])
      );
      const loansSnapshot = await getDocs(loansQuery);
      setHasActiveLoan(!loansSnapshot.empty);

      const pendingQuery = query(
        collection(db, 'loans'),
        where('borrowerId', '==', uid),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      setHasPendingApplication(!pendingSnapshot.empty);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const selectedProduct = LOAN_PRODUCTS[formData.loanProduct];
  const amount = parseFloat(formData.amount) || 0;
  const processingFee = amount * (selectedProduct.processingFee / 100);
  const interest = amount * (selectedProduct.interestRate / 100);
  const totalPayable = amount + interest;
  const disbursementAmount = amount - processingFee;

  const isAmountValid = amount >= selectedProduct.minAmount && amount <= selectedProduct.maxAmount;
  const needsCollateral = 'collateralThreshold' in selectedProduct && 
    selectedProduct.collateralThreshold && 
    amount > selectedProduct.collateralThreshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !borrower) {
      toast.error('Please login to apply');
      return;
    }

    if (hasActiveLoan) {
      toast.error('You already have an active loan');
      return;
    }

    if (hasPendingApplication) {
      toast.error('You already have a pending application');
      return;
    }

    if (!isAmountValid) {
      toast.error(`Amount must be between ${formatCurrency(selectedProduct.minAmount)} and ${formatCurrency(selectedProduct.maxAmount)}`);
      return;
    }

    if (!nationalIdFile) {
      toast.error('Please upload your National ID');
      return;
    }

    if (!selfieFile) {
      toast.error('Please upload a selfie');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDb();
      const storage = getStorageInstance();

      let nationalIdUrl = borrower.nationalIdImageUrl || '';
      let selfieUrl = borrower.selfieUrl || '';

      if (nationalIdFile) {
        const nationalIdRef = ref(storage, `kyc/${userId}/national_id_${Date.now()}`);
        await uploadBytes(nationalIdRef, nationalIdFile);
        nationalIdUrl = await getDownloadURL(nationalIdRef);
      }

      if (selfieFile) {
        const selfieRef = ref(storage, `kyc/${userId}/selfie_${Date.now()}`);
        await uploadBytes(selfieRef, selfieFile);
        selfieUrl = await getDownloadURL(selfieRef);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + selectedProduct.repaymentDays);

      await addDoc(collection(db, 'loans'), {
        borrowerId: userId,
        borrowerName: borrower.fullName,
        borrowerPhone: borrower.phone,
        loanProduct: formData.loanProduct,
        principalAmount: amount,
        interestRate: selectedProduct.interestRate,
        interestAmount: interest,
        processingFee: processingFee,
        totalPayable: totalPayable,
        outstandingBalance: totalPayable,
        disbursementAmount: disbursementAmount,
        loanDate: Timestamp.now(),
        dueDate: Timestamp.fromDate(dueDate),
        status: 'pending',
        purpose: formData.purpose,
        occupation: formData.occupation,
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        nationalIdImageUrl: nationalIdUrl,
        selfieUrl: selfieUrl,
        collateralRequired: needsCollateral,
        weeksLate: 0,
        penaltyAmount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Loan application submitted successfully!');
      router.push('/user/dashboard');
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Failed to submit application. Please try again.');
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

  if (hasActiveLoan) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Toaster position="top-right" />
        <div className="max-w-md mx-auto mt-20">
          <Card className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Active Loan Exists</h2>
            <p className="text-gray-600 mb-6">
              You already have an active loan. Please repay your current loan before applying for a new one.
            </p>
            <Link href="/user/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (hasPendingApplication) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Toaster position="top-right" />
        <div className="max-w-md mx-auto mt-20">
          <Card className="p-8 text-center">
            <Info className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Pending</h2>
            <p className="text-gray-600 mb-6">
              You already have a pending loan application. Please wait for it to be reviewed.
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
            <h1 className="ml-4 font-bold text-lg">Apply for Loan</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Product Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Loan Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(LOAN_PRODUCTS).map(([key, product]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, loanProduct: key as LoanProduct, amount: '' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.loanProduct === key
                      ? 'border-[#00A86B] bg-[#00A86B]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Wallet className={`h-6 w-6 mb-2 ${formData.loanProduct === key ? 'text-[#00A86B]' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{product.interestRate}% interest</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Loan Amount */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount (UGX) *
                </label>
                <Input
                  type="number"
                  placeholder={`${formatCurrency(selectedProduct.minAmount)} - ${formatCurrency(selectedProduct.maxAmount)}`}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  min={selectedProduct.minAmount}
                  max={selectedProduct.maxAmount}
                />
                {formData.amount && !isAmountValid && (
                  <p className="text-sm text-red-500 mt-1">
                    Amount must be between {formatCurrency(selectedProduct.minAmount)} and {formatCurrency(selectedProduct.maxAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Loan *
                </label>
                <Select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                >
                  <option value="">Select purpose</option>
                  <option value="business">Business</option>
                  <option value="education">Education</option>
                  <option value="medical">Medical</option>
                  <option value="emergency">Emergency</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Business Owner, Teacher"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Income (UGX)
                </label>
                <Input
                  type="number"
                  placeholder="Enter your monthly income"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Loan Summary */}
          {amount > 0 && isAmountValid && (
            <Card className="p-6 bg-[#0A1F44] text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Loan Summary</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Principal Amount</span>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Processing Fee ({selectedProduct.processingFee}%)</span>
                  <span className="font-semibold text-red-300">-{formatCurrency(processingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">You Will Receive</span>
                  <span className="font-semibold text-[#00A86B]">{formatCurrency(disbursementAmount)}</span>
                </div>
                <hr className="border-white/20" />
                <div className="flex justify-between">
                  <span className="text-gray-300">Interest ({selectedProduct.interestRate}%)</span>
                  <span className="font-semibold">{formatCurrency(interest)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total to Repay</span>
                  <span className="font-bold text-[#D4AF37]">{formatCurrency(totalPayable)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Repayment Period</span>
                  <span>{selectedProduct.repaymentDays} days</span>
                </div>
              </div>
            </Card>
          )}

          {/* Collateral Warning */}
          {needsCollateral && (
            <Card className="p-4 bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Collateral Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Loans above UGX 1,000,000 require collateral. Acceptable items: Logbook, Land agreement, Electronics, Business inventory.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* KYC Documents */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC Documents</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  National ID (Front) *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {nationalIdFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>{nationalIdFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNationalIdFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ position: 'relative' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selfie Photo *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {selfieFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>{selfieFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ position: 'relative' }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Terms */}
          <Card className="p-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              By submitting this application, you agree to our Terms & Conditions including:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• 5% non-refundable processing fee</li>
              <li>• {selectedProduct.interestRate}% interest rate for {selectedProduct.repaymentDays} days</li>
              <li>• 10% weekly penalty for late payments</li>
              <li>• Your data may be shared with recovery partners if default occurs</li>
            </ul>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#00A86B] hover:bg-[#008f5b] py-4 text-lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !isAmountValid || !nationalIdFile || !selfieFile || !formData.purpose}
          >
            Submit Application
          </Button>
        </form>
      </main>
    </div>
  );
}
