'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getBorrower, getLoansByBorrower, getPaymentsByBorrower, getUserById } from '@/lib/firebase-service';
import { Borrower, Loan, Payment, LOAN_PRODUCTS, type User as AppUser } from '@/types';
import { formatCurrency, formatDate, getLoanStatusColor, resolvePersonDisplayName } from '@/lib/utils';
import { 
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wallet,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Star
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function BorrowerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const borrowerId = params.id as string;

  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [borrowerData, loansData, paymentsData] = await Promise.all([
          getBorrower(borrowerId),
          getLoansByBorrower(borrowerId),
          getPaymentsByBorrower(borrowerId),
        ]);
        
        setBorrower(borrowerData);
        if (borrowerData) {
          const uid = borrowerData.userId || borrowerId;
          const u = await getUserById(uid);
          setProfileUser(u as AppUser);
        }
        setLoans(loansData);
        setPayments(paymentsData);
      } catch (error) {
        console.error('Failed to load borrower:', error);
        toast.error('Failed to load borrower details');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (borrowerId) {
      loadData();
    }
  }, [borrowerId]);

  const getRiskGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (!borrower) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Borrower not found</h2>
          <p className="text-gray-500 mb-4">The borrower you're looking for doesn't exist.</p>
          <Link href="/borrowers">
            <Button>Back to Borrowers</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const activeLoans = loans.filter(l => ['active', 'due_soon', 'late'].includes(l.status));
  const closedLoans = loans.filter(l => l.status === 'closed');
  const totalBorrowed = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalRepaid = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <Link href="/borrowers" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Borrowers
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#0A1F44] flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {resolvePersonDisplayName(profileUser?.fullName, borrower.fullName)}
              </h1>
              <p className="text-gray-500">{borrower.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskGradeColor(borrower.riskGrade)}`}>
              Grade {borrower.riskGrade}
            </span>
            {borrower.isBlacklisted && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Blacklisted
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-500">Total Borrowed</p>
              <p className="text-xl font-bold text-[#0A1F44]">{formatCurrency(totalBorrowed)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Total Repaid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalRepaid)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Active Balance</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(borrower.currentActiveLoanBalance)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Total Loans</p>
              <p className="text-xl font-bold text-gray-900">{borrower.totalLoansTaken}</p>
            </Card>
          </div>

          {/* Personal Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{borrower.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{borrower.email || profileUser?.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{borrower.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">National ID</p>
                  <p className="font-medium text-gray-900">{borrower.nationalId || profileUser?.nationalId || '—'}</p>
                </div>
              </div>
              {borrower.occupation && (
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Occupation</p>
                    <p className="font-medium text-gray-900">{borrower.occupation}</p>
                  </div>
                </div>
              )}
              {borrower.monthlyIncome != null && borrower.monthlyIncome > 0 ? (
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Monthly Income</p>
                    <p className="font-medium text-gray-900">{formatCurrency(borrower.monthlyIncome)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Monthly Income</p>
                    <p className="font-medium text-gray-900">—</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 sm:col-span-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Account KYC status</p>
                  <p className="font-medium text-gray-900">{profileUser?.kycVerified ? 'Verified' : 'Not verified'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC documents</h2>
            <div className="grid grid-cols-2 gap-4">
              {borrower.nationalIdImageUrl ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">National ID</p>
                  <a href={borrower.nationalIdImageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={borrower.nationalIdImageUrl}
                      alt="National ID"
                      className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  National ID image not uploaded
                </div>
              )}
              {borrower.selfieUrl ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Selfie</p>
                  <a href={borrower.selfieUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={borrower.selfieUrl}
                      alt="Selfie"
                      className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  Selfie not uploaded
                </div>
              )}
            </div>
          </Card>

          {/* Loan History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan History</h2>
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No loans yet</p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <Link key={loan.id} href={`/loans/${loan.id}`}>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLoanStatusColor(loan.status)}`}>
                            {loan.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {LOAN_PRODUCTS[loan.loanProduct]?.name || loan.loanProduct}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 mt-1">{formatCurrency(loan.principalAmount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(loan.loanDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Outstanding</p>
                        <p className={`font-medium ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(loan.outstandingBalance)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Risk Score */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h2>
            <div className="flex items-center justify-center mb-4">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={borrower.riskScore >= 70 ? 'text-green-500' : borrower.riskScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
                    strokeWidth="10"
                    strokeDasharray={`${borrower.riskScore * 2.51} 251`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{borrower.riskScore}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Late Payments</span>
                <span className="font-medium text-gray-900">{borrower.numberOfLatePayments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Defaults</span>
                <span className="font-medium text-gray-900">{borrower.numberOfDefaults}</span>
              </div>
            </div>
          </Card>

          {/* Referral Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Referral Program</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Referral Code</p>
                <p className="font-mono font-medium text-[#0A1F44]">{borrower.referralCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Referral Earnings</p>
                <p className="font-medium text-green-600">{formatCurrency(borrower.referralEarnings)}</p>
              </div>
              {borrower.referredBy && (
                <div>
                  <p className="text-sm text-gray-500">Referred By</p>
                  <p className="font-medium text-gray-900">{borrower.referredBy}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">Closed Loans</span>
                </div>
                <span className="font-medium text-gray-900">{closedLoans.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Active Loans</span>
                </div>
                <span className="font-medium text-gray-900">{activeLoans.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Member Since</span>
                </div>
                <span className="font-medium text-gray-900">{formatDate(borrower.createdAt)}</span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {borrower.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-600 text-sm">{borrower.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
