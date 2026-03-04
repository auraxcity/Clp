import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, differenceInWeeks, addDays } from 'date-fns';
import { 
  LOAN_PRODUCTS, 
  PENALTY_RATE, 
  INVESTOR_SHARE, 
  CLP_SHARE, 
  RESERVE_SHARE,
  type Loan,
  type RiskGrade 
} from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-UG').format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy HH:mm');
}

export function calculateInterest(principal: number, rate: number = 40): number {
  return Math.round(principal * (rate / 100));
}

export function calculateProcessingFee(principal: number, feeRate: number = 5): number {
  return Math.round(principal * (feeRate / 100));
}

export function calculateTotalPayable(principal: number, interestRate: number = 40): number {
  return principal + calculateInterest(principal, interestRate);
}

export function calculateDueDate(loanDate: Date, repaymentDays: number = 28): Date {
  return addDays(loanDate, repaymentDays);
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

export function getDaysUntilDue(dueDate: Date): number {
  return differenceInDays(dueDate, new Date());
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
  
  // Penalize for late payments
  score -= borrower.numberOfLatePayments * 5;
  
  // Heavy penalty for defaults
  score -= borrower.numberOfDefaults * 20;
  
  // Bonus for successful repayment history
  if (borrower.totalLoansTaken > 0) {
    const repaymentRatio = borrower.totalAmountRepaid / borrower.totalAmountBorrowed;
    if (repaymentRatio >= 0.95) score += 10;
    else if (repaymentRatio >= 0.8) score += 5;
  }
  
  // Bonus for repeat borrowers with good history
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
  // Ugandan phone numbers: +256 7XX XXX XXX or 07XX XXX XXX
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
  
  if (daysOverdue > 14) {
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
