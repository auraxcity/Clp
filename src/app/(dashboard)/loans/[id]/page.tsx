'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getLoan, getInvestors, approveLoan, disburseLoan, getPaymentsByLoan, getBorrower, getUserById } from '@/lib/firebase-service';
import { Loan, Investor, Payment, LOAN_PRODUCTS, Borrower, type User as AppUser } from '@/types';
import { formatCurrency, formatDate, getLoanStatusColor, resolvePersonDisplayName } from '@/lib/utils';
import { 
  ArrowLeft,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [loanData, investorsData] = await Promise.all([
          getLoan(loanId),
          getInvestors(),
        ]);
        
        if (loanData) {
          setLoan(loanData);
          const paymentsData = await getPaymentsByLoan(loanId);
          setPayments(paymentsData);
          const b = await getBorrower(loanData.borrowerId);
          setBorrower(b);
          const uid = b?.userId || loanData.borrowerId;
          const u = await getUserById(uid);
          setProfileUser(u);
        }
        setInvestors(investorsData);
      } catch (error) {
        console.error('Failed to load loan:', error);
        toast.error('Failed to load loan details');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (loanId) {
      loadData();
    }
  }, [loanId]);

  const handleApprove = async () => {
    if (!loan) return;
    const companyFunded = loan.fundingSource === 'company';
    if (!companyFunded && !selectedInvestor) {
      toast.error('Please select an investor');
      return;
    }

    setIsProcessing(true);
    try {
      await approveLoan(loan.id, companyFunded ? null : selectedInvestor, 'admin', 'Admin User');
      const updatedLoan = await getLoan(loanId);
      setLoan(updatedLoan);
      setShowApproveModal(false);
      toast.success('Loan approved successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve loan';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisburse = async () => {
    if (!loan) return;

    setIsProcessing(true);
    try {
      await disburseLoan(loan.id, 'admin', 'Admin User');
      const updatedLoan = await getLoan(loanId);
      setLoan(updatedLoan);
      toast.success('Loan marked as disbursed!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disburse loan';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loan) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loan not found</h2>
          <p className="text-gray-500 mb-4">The loan you're looking for doesn't exist.</p>
          <Link href="/loans">
            <Button>Back to Loans</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const product = LOAN_PRODUCTS[loan.loanProduct];

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <Link href="/loans" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Loans
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {resolvePersonDisplayName(profileUser?.fullName, borrower?.fullName, loan.borrowerName)}
            </h1>
            <p className="text-gray-500">{borrower?.phone || loan.borrowerPhone}</p>
            {loan.fundingSource === 'company' && (
              <span className="mt-2 inline-block text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Company-funded loan
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLoanStatusColor(loan.status)}`}>
              {loan.status.replace('_', ' ').toUpperCase()}
            </span>
            
            {loan.status === 'pending' && (
              <Button onClick={() => setShowApproveModal(true)} disabled={isProcessing}>
                Approve Loan
              </Button>
            )}
            
            {loan.status === 'approved' && (
              <Button onClick={handleDisburse} isLoading={isProcessing}>
                Mark as Disbursed
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Principal</p>
                <p className="text-xl font-bold text-[#0A1F44]">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interest ({loan.interestRate}%)</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(loan.interestAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Payable</p>
                <p className="text-xl font-bold text-[#D4AF37]">{formatCurrency(loan.totalPayable)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className={`text-xl font-bold ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(loan.outstandingBalance)}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium text-gray-900">{product?.name || loan.loanProduct}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Processing Fee</p>
                <p className="font-medium text-gray-900">{formatCurrency(loan.processingFee)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loan Date</p>
                <p className="font-medium text-gray-900">{formatDate(loan.loanDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium text-gray-900">{formatDate(loan.dueDate)}</p>
              </div>
            </div>

            {loan.penaltyAmount > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    Penalty: {formatCurrency(loan.penaltyAmount)} ({loan.weeksLate} weeks late)
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Purpose & Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
            <div className="space-y-4">
              {loan.purpose && (
                <div>
                  <p className="text-sm text-gray-500">Purpose</p>
                  <p className="font-medium text-gray-900 capitalize">{loan.purpose}</p>
                </div>
              )}
              {loan.occupation && (
                <div>
                  <p className="text-sm text-gray-500">Occupation</p>
                  <p className="font-medium text-gray-900">{loan.occupation}</p>
                </div>
              )}
              {loan.monthlyIncome && (
                <div>
                  <p className="text-sm text-gray-500">Monthly Income</p>
                  <p className="font-medium text-gray-900">{formatCurrency(loan.monthlyIncome)}</p>
                </div>
              )}
              {loan.collateralRequired && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Collateral Required</p>
                  {loan.collateralType && (
                    <p className="text-sm text-yellow-700">{loan.collateralType}: {loan.collateralDescription}</p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Borrower profile</h2>
            <p className="text-xs text-gray-500 mb-4">Signup and KYC fields from the user account and borrower record.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Full name</p>
                <p className="font-medium text-gray-900">
                  {resolvePersonDisplayName(profileUser?.fullName, borrower?.fullName, loan.borrowerName)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{borrower?.phone || loan.borrowerPhone || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{borrower?.email || profileUser?.email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{borrower?.location || profileUser?.location || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">National ID (number)</p>
                <p className="font-medium text-gray-900">{borrower?.nationalId || profileUser?.nationalId || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Occupation</p>
                <p className="font-medium text-gray-900">{borrower?.occupation || loan.occupation || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly income</p>
                <p className="font-medium text-gray-900">
                  {borrower?.monthlyIncome != null
                    ? formatCurrency(borrower.monthlyIncome)
                    : loan.monthlyIncome
                      ? formatCurrency(loan.monthlyIncome)
                      : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">KYC verified (account)</p>
                <p className="font-medium text-gray-900">{profileUser?.kycVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-500">Referral code</p>
                <p className="font-mono font-medium text-gray-900">{borrower?.referralCode || '—'}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/borrowers/${loan.borrowerId}`}>
                <Button variant="outline" size="sm">Open borrower record</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC documents</h2>
            <div className="grid grid-cols-2 gap-4">
              {borrower?.nationalIdImageUrl || loan.nationalIdImageUrl ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">National ID</p>
                  <a
                    href={borrower?.nationalIdImageUrl || loan.nationalIdImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={borrower?.nationalIdImageUrl || loan.nationalIdImageUrl}
                      alt="National ID"
                      className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 min-h-[12rem]">
                  National ID image not uploaded
                </div>
              )}
              {borrower?.selfieUrl || loan.selfieUrl ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Selfie</p>
                  <a href={borrower?.selfieUrl || loan.selfieUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={borrower?.selfieUrl || loan.selfieUrl}
                      alt="Selfie"
                      className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 min-h-[12rem]">
                  Selfie not uploaded
                </div>
              )}
            </div>
          </Card>

          {/* Payment History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-500">{formatDate(payment.submittedAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{payment.transactionId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {loan.fundingSource === 'company' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Funding</h2>
              <p className="text-sm text-gray-600">
                This loan is funded from <span className="font-medium text-[#0A1F44]">company / CLP capital</span>. No investor is assigned.
              </p>
            </Card>
          )}

          {loan.investorId && loan.fundingSource !== 'company' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Funded By</h2>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#0A1F44] flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{loan.investorName}</p>
                  <p className="text-sm text-gray-500">Investor</p>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Application Created</p>
                  <p className="text-xs text-gray-500">{formatDate(loan.createdAt)}</p>
                </div>
              </div>
              
              {loan.approvedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Loan Approved</p>
                    <p className="text-xs text-gray-500">{formatDate(loan.approvedAt)}</p>
                  </div>
                </div>
              )}
              
              {loan.disbursedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Funds Disbursed</p>
                    <p className="text-xs text-gray-500">{formatDate(loan.disbursedAt)}</p>
                  </div>
                </div>
              )}
              
              {loan.closedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Loan Closed</p>
                    <p className="text-xs text-gray-500">{formatDate(loan.closedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/payments?loan=${loan.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </Link>
              <Link href={`/borrowers`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <UserIcon className="h-4 w-4 mr-2" />
                  View Borrower
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Loan"
      >
        <div className="space-y-4">
          {loan.fundingSource === 'company' ? (
            <p className="text-gray-600">
              Approve this company-funded loan of {formatCurrency(loan.principalAmount)}. No investor capital will be reserved.
            </p>
          ) : (
            <>
              <p className="text-gray-600">
                Select an investor to fund this loan of {formatCurrency(loan.principalAmount)}.
              </p>
              <Select
                label="Select Investor"
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
                options={investors
                  .filter(inv => inv.capitalAvailable >= loan.principalAmount)
                  .map(inv => ({
                    value: inv.id,
                    label: `${inv.name} (Available: ${formatCurrency(inv.capitalAvailable)})`
                  }))}
                placeholder="Choose an investor"
              />
              {investors.filter(inv => inv.capitalAvailable >= loan.principalAmount).length === 0 && (
                <p className="text-sm text-red-600">
                  No investors have sufficient capital for this loan amount.
                </p>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowApproveModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              isLoading={isProcessing}
              disabled={loan.fundingSource !== 'company' && !selectedInvestor}
              className="flex-1"
            >
              Approve Loan
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
