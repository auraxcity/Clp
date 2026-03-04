export type UserRole = 'super_admin' | 'admin' | 'borrower';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type LoanStatus = 'pending' | 'approved' | 'active' | 'due_soon' | 'late' | 'default' | 'closed' | 'rejected';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type LoanProduct = 'quick_cash' | 'business_boost' | 'investor_backed_premium';

export interface User {
  id: string;
  phone: string;
  email?: string;
  role: UserRole;
  fullName: string;
  nationalId?: string;
  selfieUrl?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  kycVerified: boolean;
  referralCode?: string;
  referredBy?: string;
}

export interface Borrower {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  nationalIdImageUrl?: string;
  selfieUrl?: string;
  location: string;
  occupation?: string;
  monthlyIncome?: number;
  riskGrade: RiskGrade;
  riskScore: number;
  totalLoansTaken: number;
  totalAmountBorrowed: number;
  totalAmountRepaid: number;
  numberOfLatePayments: number;
  numberOfDefaults: number;
  currentActiveLoanBalance: number;
  referralCode: string;
  referredBy?: string;
  referralEarnings: number;
  createdAt: Date;
  updatedAt: Date;
  isBlacklisted: boolean;
  blacklistReason?: string;
  notes?: string;
}

export interface Investor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  capitalCommitted: number;
  capitalDeployed: number;
  capitalAvailable: number;
  totalProfitEarned: number;
  monthlyProfitBreakdown: { [month: string]: number };
  roi: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  notes?: string;
}

export interface Loan {
  id: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string;
  investorId?: string;
  investorName?: string;
  loanProduct: LoanProduct;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  processingFee: number;
  processingFeePaid: boolean;
  totalPayable: number;
  amountDisbursed: number;
  disbursementAmount?: number;
  outstandingBalance: number;
  loanDate: Date;
  dueDate: Date;
  status: LoanStatus;
  purpose?: string;
  occupation?: string;
  monthlyIncome?: number;
  nationalIdImageUrl?: string;
  selfieUrl?: string;
  collateralRequired?: boolean;
  collateralType?: string;
  collateralDescription?: string;
  collateralValue?: number;
  collateralImageUrls?: string[];
  approvedBy?: string;
  approvedAt?: Date;
  disbursedBy?: string;
  disbursedAt?: Date;
  closedAt?: Date;
  penaltyAmount: number;
  weeksLate: number;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface Payment {
  id: string;
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  amount: number;
  paymentType: 'full' | 'partial' | 'processing_fee';
  transactionId?: string;
  proofImageUrl?: string;
  paymentMethod: 'mtn_momo' | 'airtel_money';
  merchantCode: string;
  status: PaymentStatus;
  submittedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'loan' | 'payment' | 'borrower' | 'investor' | 'user' | 'system';
  entityId: string;
  performedBy: string;
  performedByName: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment_confirmed' | 'loan_approved' | 'loan_rejected' | 'payment_due' | 'loan_overdue' | 'system';
  isRead: boolean;
  createdAt: Date;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface MonthlyReport {
  id: string;
  month: string;
  year: number;
  totalCapitalDeployed: number;
  totalInterestGenerated: number;
  investorTotalPayout: number;
  clpGrossRetained: number;
  reserveAllocation: number;
  netClpEarnings: number;
  totalDefaults: number;
  totalDefaultAmount: number;
  totalRecoveries: number;
  totalRecoveryAmount: number;
  totalLoansIssued: number;
  totalLoansClosed: number;
  newBorrowers: number;
  activeLoansCount: number;
  lateLoansCount: number;
  defaultLoansCount: number;
  portfolioAtRisk7: number;
  portfolioAtRisk30: number;
  createdAt: Date;
}

export interface SystemStats {
  id: string;
  totalActiveLoans: number;
  totalCapitalDeployed: number;
  totalCapitalAvailable: number;
  totalExpectedInterest: number;
  loansDueToday: number;
  loansDueTodayValue: number;
  loansDueThisWeek: number;
  loansDueThisWeekValue: number;
  totalLateLoans: number;
  totalLateLoansValue: number;
  portfolioAtRisk: number;
  defaultRate: number;
  reserveBalance: number;
  investorProfitThisMonth: number;
  clpNetProfitThisMonth: number;
  totalBorrowers: number;
  totalInvestors: number;
  totalLoansEverIssued: number;
  totalAmountEverDisbursed: number;
  totalAmountEverRepaid: number;
  updatedAt: Date;
}

export interface LoanApplication {
  id: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string;
  loanProduct: LoanProduct;
  requestedAmount: number;
  purpose: string;
  repaymentPeriod: number;
  collateralType?: string;
  collateralDescription?: string;
  collateralValue?: number;
  collateralImageUrls?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LOAN_PRODUCTS = {
  quick_cash: {
    name: 'Quick Cash Loan',
    minAmount: 50000,
    maxAmount: 500000,
    interestRate: 40,
    processingFee: 5,
    repaymentDays: 28,
    collateralRequired: false,
  },
  business_boost: {
    name: 'Business Boost Loan',
    minAmount: 500000,
    maxAmount: 5000000,
    interestRate: 40,
    processingFee: 5,
    repaymentDays: 28,
    collateralRequired: true,
    collateralThreshold: 1000000,
  },
  investor_backed_premium: {
    name: 'Investor-Backed Premium Loan',
    minAmount: 5000000,
    maxAmount: 20000000,
    interestRate: 40,
    processingFee: 5,
    repaymentDays: 28,
    collateralRequired: true,
  },
} as const;

export const MERCHANT_CODES = {
  mtn_momo: '90443701',
  airtel_money: '6986476',
} as const;

export const PENALTY_RATE = 10; // 10% per week
export const INVESTOR_SHARE = 10; // 10% of interest
export const CLP_SHARE = 30; // 30% of interest
export const RESERVE_SHARE = 20; // 20% of CLP retained goes to reserve

export const REFERRAL_SIGNUP_BONUS = 5000;
export const REFERRAL_COMPLETION_BONUS_RATE = 5; // 5% of loan amount
