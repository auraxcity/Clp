import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, differenceInWeeks, addDays, addWeeks } from 'date-fns';
import { 
  LOAN_PRODUCTS, 
  PENALTY_RATE, 
  INVESTOR_SHARE, 
  CLP_SHARE, 
  RESERVE_SHARE,
  LOAN_DURATIONS,
  PROCESSING_FEE_RATE,
  type Loan,
  type RiskGrade 
} from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-UG').format(num);
}

/** Minimum investment (UGX). Set `NEXT_PUBLIC_MIN_INVESTMENT_AMOUNT` in production; defaults to 1 for testing. */
export function getMinInvestmentAmount(): number {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MIN_INVESTMENT_AMOUNT : undefined;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 1;
}

/** Prefer linked user profile name, then borrower record, then fallback. */
export function resolvePersonDisplayName(
  userFullName?: string | null,
  recordFullName?: string | null,
  fallback = 'User'
): string {
  const u = (userFullName || '').trim();
  const r = (recordFullName || '').trim();
  return u || r || fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDate(date: any): Date | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000);
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDate(date: any): string {
  try {
    const d = toDate(date);
    if (!d) return 'N/A';
    return format(d, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDateTime(date: any): string {
  try {
    const d = toDate(date);
    if (!d) return 'N/A';
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'N/A';
  }
}

export function calculateLoanInterest(principal: number, duration: 1 | 2 | 3 | 4): number {
  const durationConfig = LOAN_DURATIONS[duration];
  return Math.round(principal * (durationConfig.interestRate / 100));
}

export function calculateProcessingFee(principal: number): number {
  return Math.round(principal * (PROCESSING_FEE_RATE / 100));
}

export function calculateDisbursementAmount(principal: number): number {
  const processingFee = calculateProcessingFee(principal);
  return principal - processingFee;
}

export function calculateTotalPayable(principal: number, duration: 1 | 2 | 3 | 4): number {
  const interest = calculateLoanInterest(principal, duration);
  return principal + interest;
}

export function calculateDueDate(loanDate: Date, duration: 1 | 2 | 3 | 4): Date {
  return addWeeks(loanDate, duration);
}

export function getLoanDurationLabel(duration: 1 | 2 | 3 | 4): string {
  return LOAN_DURATIONS[duration].label;
}

export function getLoanInterestRate(duration: 1 | 2 | 3 | 4): number {
  return LOAN_DURATIONS[duration].interestRate;
}

export function calculateLoanSummary(principal: number, duration: 1 | 2 | 3 | 4) {
  const processingFee = calculateProcessingFee(principal);
  const disbursementAmount = principal - processingFee;
  const interestRate = getLoanInterestRate(duration);
  const interestAmount = calculateLoanInterest(principal, duration);
  const totalPayable = principal + interestAmount;
  const dueDate = calculateDueDate(new Date(), duration);

  return {
    principal,
    processingFee,
    processingFeeRate: PROCESSING_FEE_RATE,
    disbursementAmount,
    interestRate,
    interestAmount,
    totalPayable,
    duration,
    durationLabel: getLoanDurationLabel(duration),
    dueDate,
  };
}

export function calculatePenalty(principal: number, dueDate: Date): { penalty: number; weeksLate: number } {
  const today = new Date();
  const daysLate = differenceInDays(today, dueDate);
  
  if (daysLate <= 0) {
    return { penalty: 0, weeksLate: 0 };
  }
  
  const weeksLate = Math.ceil(daysLate / 7);
  const penalty = Math.round(principal * (PENALTY_RATE / 100) * weeksLate);
  
  return { penalty, weeksLate };
}

export function getEscalatedInterestRate(weeksLate: number, originalDuration: 1 | 2 | 3 | 4): number {
  const newTier = Math.min(4, originalDuration + weeksLate) as 1 | 2 | 3 | 4;
  return LOAN_DURATIONS[newTier].interestRate;
}

export function calculateEscalatedBalance(
  principal: number, 
  originalDuration: 1 | 2 | 3 | 4, 
  weeksLate: number
): { newInterestRate: number; newInterest: number; newTotalPayable: number } {
  const newInterestRate = getEscalatedInterestRate(weeksLate, originalDuration);
  const newInterest = Math.round(principal * (newInterestRate / 100));
  const newTotalPayable = principal + newInterest;
  
  return { newInterestRate, newInterest, newTotalPayable };
}

export function calculateProfitSplit(interestAmount: number): {
  investorProfit: number;
  clpGross: number;
  reserveAllocation: number;
  clpNet: number;
} {
  const investorProfit = Math.round(interestAmount * (INVESTOR_SHARE / 100));
  const clpGross = Math.round(interestAmount * (CLP_SHARE / 100));
  const reserveAllocation = Math.round(clpGross * (RESERVE_SHARE / 100));
  const clpNet = clpGross - reserveAllocation;
  
  return { investorProfit, clpGross, reserveAllocation, clpNet };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDaysUntilDue(dueDate: any): number {
  try {
    const d = toDate(dueDate);
    if (!d) return 0;
    return differenceInDays(d, new Date());
  } catch {
    return 0;
  }
}

export function getLoanStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    due_soon: 'bg-yellow-100 text-yellow-800',
    late: 'bg-red-100 text-red-800',
    default: 'bg-black text-white',
    closed: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getRiskGradeColor(grade: RiskGrade): string {
  const colors: Record<RiskGrade, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-orange-100 text-orange-800',
    F: 'bg-red-100 text-red-800',
  };
  return colors[grade];
}

export function calculateRiskScore(borrower: {
  totalLoansTaken: number;
  numberOfLatePayments: number;
  numberOfDefaults: number;
  totalAmountBorrowed: number;
  totalAmountRepaid: number;
}): { score: number; grade: RiskGrade } {
  let score = 100;
  
  score -= borrower.numberOfLatePayments * 5;
  score -= borrower.numberOfDefaults * 20;
  
  if (borrower.totalLoansTaken > 0) {
    const repaymentRatio = borrower.totalAmountRepaid / borrower.totalAmountBorrowed;
    if (repaymentRatio >= 0.95) score += 10;
    else if (repaymentRatio >= 0.8) score += 5;
  }
  
  if (borrower.totalLoansTaken >= 3 && borrower.numberOfDefaults === 0) {
    score += 5;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let grade: RiskGrade;
  if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';
  
  return { score, grade };
}

export function generateReferralCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${random}`;
}

export function validateUgandanPhone(phone: string): boolean {
  const regex = /^(\+256|0)?7[0-9]{8}$/;
  return regex.test(phone.replace(/\s/g, ''));
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('256')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+256${cleaned.substring(1)}`;
  }
  return `+256${cleaned}`;
}

export function getPortfolioAtRisk(
  loans: Loan[],
  daysOverdue: number
): { count: number; value: number; percentage: number } {
  const today = new Date();
  const totalActiveValue = loans
    .filter(l => ['active', 'due_soon', 'late'].includes(l.status))
    .reduce((sum, l) => sum + l.outstandingBalance, 0);

  const atRiskLoans = loans.filter(l => {
    if (!['active', 'due_soon', 'late'].includes(l.status)) return false;
    const daysLate = differenceInDays(today, l.dueDate);
    return daysLate >= daysOverdue;
  });

  const atRiskValue = atRiskLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const percentage = totalActiveValue > 0 ? (atRiskValue / totalActiveValue) * 100 : 0;

  return {
    count: atRiskLoans.length,
    value: atRiskValue,
    percentage: Math.round(percentage * 100) / 100,
  };
}

export function classifyLoanStatus(loan: Loan): Loan['status'] {
  if (loan.status === 'closed' || loan.status === 'rejected' || loan.status === 'pending') {
    return loan.status;
  }
  
  const today = new Date();
  const daysUntilDue = differenceInDays(loan.dueDate, today);
  const daysOverdue = differenceInDays(today, loan.dueDate);
  
  if (loan.outstandingBalance <= 0) {
    return 'closed';
  }
  
  if (daysOverdue > 28) {
    return 'default';
  }
  
  if (daysOverdue > 0) {
    return 'late';
  }
  
  if (daysUntilDue <= 3 && daysUntilDue >= 0) {
    return 'due_soon';
  }
  
  return 'active';
}

export function shouldSendDefaultAlert(loan: Loan): { shouldSend: boolean; alertType: string; message: string } {
  if (loan.status !== 'late' && loan.status !== 'default') {
    return { shouldSend: false, alertType: '', message: '' };
  }

  const weeksLate = loan.weeksLate || 0;
  const alertsCount = loan.defaultAlertsCount || 0;

  if (weeksLate >= 4 && !loan.creditBureauReported) {
    return {
      shouldSend: true,
      alertType: 'credit_bureau',
      message: `URGENT: Your loan of ${formatCurrency(loan.outstandingBalance)} is now 4+ weeks overdue. Your loan history will be reported to the Credit Reference Bureau of Uganda. This will affect your credit score and future loan applications. Please contact us immediately to arrange payment.`,
    };
  }

  if (weeksLate > alertsCount) {
    const escalatedRate = getEscalatedInterestRate(weeksLate, loan.duration);
    return {
      shouldSend: true,
      alertType: 'escalation',
      message: `Your loan is now ${weeksLate} week(s) overdue. The interest rate has been escalated to ${escalatedRate}%. Your new balance is ${formatCurrency(loan.outstandingBalance + (loan.penaltyAmount || 0))}. Please make payment immediately to avoid further penalties.`,
    };
  }

  return { shouldSend: false, alertType: '', message: '' };
}

export function calculateInvestmentReturn(principal: number, duration: 3 | 6): {
  interestRate: number;
  interestAmount: number;
  totalReturn: number;
  monthlyReturn: number;
} {
  const interestRate = 10;
  const interestAmount = Math.round(principal * (interestRate / 100));
  const totalReturn = principal + interestAmount;
  const monthlyReturn = Math.round(interestAmount / duration);

  return {
    interestRate,
    interestAmount,
    totalReturn,
    monthlyReturn,
  };
}

export function calculateDailyAccruedInterest(
  principal: number,
  startDate: Date,
  duration: 3 | 6
): number {
  const today = new Date();
  const start = toDate(startDate);
  if (!start) return 0;

  const totalDays = duration * 30;
  const daysPassed = Math.min(differenceInDays(today, start), totalDays);
  
  if (daysPassed <= 0) return 0;

  const totalInterest = principal * 0.10;
  const dailyInterest = totalInterest / totalDays;
  
  return Math.round(dailyInterest * daysPassed);
}
