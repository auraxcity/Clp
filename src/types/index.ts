export type UserRole = 'super_admin' | 'admin' | 'borrower' | 'investor';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type LoanStatus = 'pending' | 'approved' | 'active' | 'due_soon' | 'late' | 'default' | 'closed' | 'rejected';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type PaymentMode = 'online' | 'manual';

export type LoanProduct = 'quick_cash' | 'business_boost' | 'investor_backed_premium';

export type InvestmentStatus = 'active' | 'matured' | 'withdrawn' | 'reinvested';

/** Company-funded loans skip investor capital allocation; investor-funded ties to an investor at approval. */
export type LoanFundingSource = 'investor_funded' | 'company';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

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
  createdBy?: string;
  permissions?: AdminPermission[];
}

export type AdminPermission = 
  | 'manage_users'
  | 'manage_admins'
  | 'manage_borrowers'
  | 'manage_investors'
  | 'manage_loans'
  | 'manage_payments'
  | 'view_reports'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'full_access';

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
  defaultAlertsSent?: number;
  lastDefaultAlertDate?: Date;
}

export interface Investor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  authUserId?: string;
  nationalId?: string;
  location?: string;
  occupation?: string;
  capitalCommitted: number;
  capitalDeployed: number;
  capitalAvailable: number;
  totalProfitEarned: number;
  accruedInterest: number;
  lastInterestUpdate?: Date;
  monthlyProfitBreakdown: { [month: string]: number };
  roi: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  notes?: string;
}

export interface Investment {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  duration: 3 | 6;
  interestRate: number;
  expectedReturn: number;
  status: InvestmentStatus;
  startDate: Date;
  maturityDate: Date;
  actualReturnDate?: Date;
  totalPayout?: number;
  pesapalTransactionId?: string;
  paymentMethod: 'pesapal' | 'manual';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface WithdrawalRequest {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

export interface Loan {
  id: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string;
  /** When omitted, pending loans are treated as investor-funded (legacy behaviour). */
  fundingSource?: LoanFundingSource;
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
  duration: 1 | 2 | 3 | 4;
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
  currentInterestTier: number;
  defaultAlertsCount: number;
  lastDefaultAlertDate?: Date;
  creditBureauReported: boolean;
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
  paymentMode: PaymentMode;
  transactionId?: string;
  pesapalTransactionId?: string;
  pesapalOrderTrackingId?: string;
  proofImageUrl?: string;
  paymentMethod: 'mtn_momo' | 'airtel_money' | 'pesapal';
  merchantCode?: string;
  onlineFee?: number;
  status: PaymentStatus;
  submittedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  notes?: string;
}

export interface PesapalTransaction {
  id: string;
  orderId: string;
  trackingId: string;
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  statusCode?: string;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  relatedEntityType: 'payment' | 'investment';
  relatedEntityId: string;
  callbackReceived: boolean;
  callbackData?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'loan' | 'payment' | 'borrower' | 'investor' | 'user' | 'system' | 'investment' | 'withdrawal';
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
  type: 'payment_confirmed' | 'loan_approved' | 'loan_rejected' | 'payment_due' | 'loan_overdue' | 'system' | 'default_warning' | 'credit_bureau' | 'investment_matured' | 'withdrawal_processed';
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
  totalInvestmentsReceived: number;
  totalInvestmentPayouts: number;
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
  totalActiveInvestments: number;
  totalInvestmentValue: number;
  totalPendingWithdrawals: number;
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
  duration: 1 | 2 | 3 | 4;
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

export const LOAN_DURATIONS = {
  1: { weeks: 1, interestRate: 10, label: '1 Week' },
  2: { weeks: 2, interestRate: 25, label: '2 Weeks' },
  3: { weeks: 3, interestRate: 35, label: '3 Weeks' },
  4: { weeks: 4, interestRate: 45, label: '4 Weeks' },
} as const;

export const INVESTMENT_TERMS = {
  3: { months: 3, interestRate: 10, label: '3 Months' },
  6: { months: 6, interestRate: 10, label: '6 Months' },
} as const;

export const LOAN_PRODUCTS = {
  quick_cash: {
    name: 'Quick Cash Loan',
    minAmount: 50000,
    maxAmount: 500000,
    processingFee: 5,
    collateralRequired: false,
  },
  business_boost: {
    name: 'Business Boost Loan',
    minAmount: 500000,
    maxAmount: 5000000,
    processingFee: 5,
    collateralRequired: true,
    collateralThreshold: 1000000,
  },
  investor_backed_premium: {
    name: 'Investor-Backed Premium Loan',
    minAmount: 5000000,
    maxAmount: 20000000,
    processingFee: 5,
    collateralRequired: true,
  },
} as const;

export const MERCHANT_CODES = {
  mtn_momo: '90443701',
  airtel_money: '6986476',
} as const;

export const PENALTY_RATE = 10;
export const INVESTOR_SHARE = 10;
export const CLP_SHARE = 30;
export const RESERVE_SHARE = 20;
export const ONLINE_PAYMENT_FEE = 2000;
export const PROCESSING_FEE_RATE = 5;

export const PESAPAL_CONFIG = {
  consumerKey: '4NLvFCpH06Knw608C+bf+ybBYNTW0oHZ',
  consumerSecret: 'IRcZqbYfIs9YTiypcoTrT4/3lNo=',
  environment: 'live' as const,
};

export const REFERRAL_SIGNUP_BONUS = 5000;
export const REFERRAL_COMPLETION_BONUS_RATE = 5;

export const DEFAULT_ESCALATION = {
  week1: { interestRate: 10, alertType: 'sms' },
  week2: { interestRate: 25, alertType: 'sms_email' },
  week3: { interestRate: 35, alertType: 'sms_email' },
  week4: { interestRate: 45, alertType: 'credit_bureau' },
} as const;
