import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
  onSnapshot,
  DocumentData,
  Firestore,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { getDb as getFirebaseDb, getStorageInstance } from './firebase';
import {
  Borrower,
  Loan,
  Investor,
  Payment,
  SystemStats,
  AuditLog,
  Notification,
  MonthlyReport,
  User,
  LoanApplication,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateRiskScore, calculateProfitSplit, calculatePenalty, classifyLoanStatus } from './utils';

function getDb(): Firestore {
  return getFirebaseDb();
}

function getStorageRef(): FirebaseStorage {
  return getStorageInstance();
}

// Helper to remove undefined values from objects (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helper to convert Firestore timestamps
function convertTimestamp(data: DocumentData): DocumentData {
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  }
  return converted;
}

// ============ USERS ============
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const docRef = await addDoc(collection(getDb(), 'users'), {
    ...userData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return { ...userData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as User;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const q = query(collection(getDb(), 'users'), where('phone', '==', phone));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...convertTimestamp(doc.data()) } as User;
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(getDb(), 'users', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ============ BORROWERS ============
export async function createBorrower(borrowerData: Omit<Borrower, 'id' | 'createdAt' | 'updatedAt'>): Promise<Borrower> {
  const cleanData = removeUndefined(borrowerData as Record<string, unknown>);
  const docRef = await addDoc(collection(getDb(), 'borrowers'), {
    ...cleanData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return { ...borrowerData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Borrower;
}

export async function getBorrowers(): Promise<Borrower[]> {
  const q = query(collection(getDb(), 'borrowers'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Borrower));
}

export async function getBorrower(id: string): Promise<Borrower | null> {
  const docSnap = await getDoc(doc(getDb(), 'borrowers', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamp(docSnap.data()) } as Borrower;
}

export async function updateBorrower(id: string, data: Partial<Borrower>): Promise<void> {
  await updateDoc(doc(getDb(), 'borrowers', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function updateBorrowerStats(borrowerId: string): Promise<void> {
  const loans = await getLoansByBorrower(borrowerId);
  const payments = await getPaymentsByBorrower(borrowerId);
  
  const totalLoansTaken = loans.length;
  const totalAmountBorrowed = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalAmountRepaid = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
  const numberOfLatePayments = loans.filter((l) => l.status === 'late' || l.weeksLate > 0).length;
  const numberOfDefaults = loans.filter((l) => l.status === 'default').length;
  const currentActiveLoanBalance = loans
    .filter((l) => ['active', 'due_soon', 'late'].includes(l.status))
    .reduce((sum, l) => sum + l.outstandingBalance, 0);
  
  const { score, grade } = calculateRiskScore({
    totalLoansTaken,
    numberOfLatePayments,
    numberOfDefaults,
    totalAmountBorrowed,
    totalAmountRepaid,
  });
  
  await updateBorrower(borrowerId, {
    totalLoansTaken,
    totalAmountBorrowed,
    totalAmountRepaid,
    numberOfLatePayments,
    numberOfDefaults,
    currentActiveLoanBalance,
    riskScore: score,
    riskGrade: grade,
  });
}

// ============ INVESTORS ============
export async function createInvestor(investorData: Omit<Investor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Investor> {
  const docRef = await addDoc(collection(getDb(), 'investors'), {
    ...investorData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return { ...investorData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Investor;
}

export async function getInvestors(): Promise<Investor[]> {
  const q = query(collection(getDb(), 'investors'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Investor));
}

export async function getInvestor(id: string): Promise<Investor | null> {
  const docSnap = await getDoc(doc(getDb(), 'investors', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamp(docSnap.data()) } as Investor;
}

export async function updateInvestor(id: string, data: Partial<Investor>): Promise<void> {
  await updateDoc(doc(getDb(), 'investors', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function allocateCapitalToLoan(investorId: string, amount: number): Promise<boolean> {
  const investor = await getInvestor(investorId);
  if (!investor || investor.capitalAvailable < amount) return false;
  
  await updateInvestor(investorId, {
    capitalDeployed: investor.capitalDeployed + amount,
    capitalAvailable: investor.capitalAvailable - amount,
  });
  return true;
}

export async function returnCapitalFromLoan(investorId: string, principal: number, profit: number): Promise<void> {
  const investor = await getInvestor(investorId);
  if (!investor) return;
  
  const month = new Date().toISOString().slice(0, 7);
  const monthlyProfit = { ...investor.monthlyProfitBreakdown };
  monthlyProfit[month] = (monthlyProfit[month] || 0) + profit;
  
  const totalProfit = investor.totalProfitEarned + profit;
  const roi = investor.capitalCommitted > 0 
    ? (totalProfit / investor.capitalCommitted) * 100 
    : 0;
  
  await updateInvestor(investorId, {
    capitalDeployed: investor.capitalDeployed - principal,
    capitalAvailable: investor.capitalAvailable + principal + profit,
    totalProfitEarned: totalProfit,
    monthlyProfitBreakdown: monthlyProfit,
    roi: Math.round(roi * 100) / 100,
  });
}

// ============ LOANS ============
export async function createLoan(loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> {
  const cleanData = removeUndefined(loanData as Record<string, unknown>);
  const docRef = await addDoc(collection(getDb(), 'loans'), {
    ...cleanData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  await createAuditLog({
    action: 'loan_created',
    entityType: 'loan',
    entityId: docRef.id,
    performedBy: 'system',
    performedByName: 'System',
    details: { borrowerId: loanData.borrowerId, amount: loanData.principalAmount },
  });
  
  return { ...loanData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Loan;
}

export async function getLoans(): Promise<Loan[]> {
  const q = query(collection(getDb(), 'loans'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Loan));
}

export async function getLoan(id: string): Promise<Loan | null> {
  const docSnap = await getDoc(doc(getDb(), 'loans', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamp(docSnap.data()) } as Loan;
}

export async function getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
  const q = query(
    collection(getDb(), 'loans'),
    where('borrowerId', '==', borrowerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Loan));
}

export async function getLoansByInvestor(investorId: string): Promise<Loan[]> {
  const q = query(
    collection(getDb(), 'loans'),
    where('investorId', '==', investorId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Loan));
}

export async function updateLoan(id: string, data: Partial<Loan>, performedBy?: string): Promise<void> {
  await updateDoc(doc(getDb(), 'loans', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
  
  if (data.status) {
    await createAuditLog({
      action: 'loan_status_changed',
      entityType: 'loan',
      entityId: id,
      performedBy: performedBy || 'system',
      performedByName: performedBy || 'System',
      details: { newStatus: data.status },
    });
  }
}

export async function approveLoan(loanId: string, investorId: string, adminId: string, adminName: string): Promise<void> {
  const loan = await getLoan(loanId);
  if (!loan) throw new Error('Loan not found');
  
  const investor = await getInvestor(investorId);
  if (!investor) throw new Error('Investor not found');
  
  if (investor.capitalAvailable < loan.principalAmount) {
    throw new Error('Insufficient investor capital');
  }
  
  const batch = writeBatch(getDb());
  
  batch.update(doc(getDb(), 'loans', loanId), {
    status: 'approved',
    investorId,
    investorName: investor.name,
    approvedBy: adminId,
    approvedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  batch.update(doc(getDb(), 'investors', investorId), {
    capitalDeployed: increment(loan.principalAmount),
    capitalAvailable: increment(-loan.principalAmount),
    updatedAt: Timestamp.now(),
  });
  
  await batch.commit();
  
  await createAuditLog({
    action: 'loan_approved',
    entityType: 'loan',
    entityId: loanId,
    performedBy: adminId,
    performedByName: adminName,
    details: { investorId, amount: loan.principalAmount },
  });
  
  await updateSystemStats();
}

export async function disburseLoan(loanId: string, adminId: string, adminName: string): Promise<void> {
  const loan = await getLoan(loanId);
  if (!loan || loan.status !== 'approved') {
    throw new Error('Loan must be approved before disbursement');
  }
  
  await updateLoan(loanId, {
    status: 'active',
    disbursedBy: adminId,
    disbursedAt: new Date(),
    amountDisbursed: loan.principalAmount,
  });
  
  await createAuditLog({
    action: 'loan_disbursed',
    entityType: 'loan',
    entityId: loanId,
    performedBy: adminId,
    performedByName: adminName,
    details: { amount: loan.principalAmount },
  });
  
  await updateBorrowerStats(loan.borrowerId);
  await updateSystemStats();
}

export async function closeLoan(loanId: string): Promise<void> {
  const loan = await getLoan(loanId);
  if (!loan) return;
  
  await updateLoan(loanId, {
    status: 'closed',
    closedAt: new Date(),
    outstandingBalance: 0,
  });
  
  if (loan.investorId) {
    const { investorProfit } = calculateProfitSplit(loan.interestAmount);
    await returnCapitalFromLoan(loan.investorId, loan.principalAmount, investorProfit);
  }
  
  await updateBorrowerStats(loan.borrowerId);
  await updateSystemStats();
}

export async function updateLoanStatuses(): Promise<void> {
  const loans = await getLoans();
  const batch = writeBatch(getDb());
  
  for (const loan of loans) {
    if (['closed', 'rejected', 'pending'].includes(loan.status)) continue;
    
    const newStatus = classifyLoanStatus(loan);
    if (newStatus !== loan.status) {
      const { penalty, weeksLate } = calculatePenalty(loan.principalAmount, loan.dueDate);
      
      batch.update(doc(getDb(), 'loans', loan.id), {
        status: newStatus,
        penaltyAmount: penalty,
        weeksLate,
        updatedAt: Timestamp.now(),
      });
    }
  }
  
  await batch.commit();
}

// ============ PAYMENTS ============
export async function createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
  const docRef = await addDoc(collection(getDb(), 'payments'), {
    ...paymentData,
  });
  
  await createAuditLog({
    action: 'payment_submitted',
    entityType: 'payment',
    entityId: docRef.id,
    performedBy: paymentData.borrowerId,
    performedByName: paymentData.borrowerName,
    details: { loanId: paymentData.loanId, amount: paymentData.amount },
  });
  
  return { ...paymentData, id: docRef.id } as Payment;
}

export async function getPayments(): Promise<Payment[]> {
  const q = query(collection(getDb(), 'payments'), orderBy('submittedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Payment));
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const q = query(
    collection(getDb(), 'payments'),
    where('loanId', '==', loanId),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Payment));
}

export async function getPaymentsByBorrower(borrowerId: string): Promise<Payment[]> {
  const q = query(
    collection(getDb(), 'payments'),
    where('borrowerId', '==', borrowerId),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Payment));
}

export async function getPendingPayments(): Promise<Payment[]> {
  const q = query(
    collection(getDb(), 'payments'),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Payment));
}

export async function approvePayment(
  paymentId: string, 
  adminId: string, 
  adminName: string
): Promise<void> {
  const paymentRef = doc(getDb(), 'payments', paymentId);
  const paymentSnap = await getDoc(paymentRef);
  
  if (!paymentSnap.exists()) throw new Error('Payment not found');
  
  const payment = { id: paymentSnap.id, ...convertTimestamp(paymentSnap.data()) } as Payment;
  const loan = await getLoan(payment.loanId);
  
  if (!loan) throw new Error('Loan not found');
  
  const batch = writeBatch(getDb());
  
  batch.update(paymentRef, {
    status: 'approved',
    approvedBy: adminId,
    approvedAt: Timestamp.now(),
  });
  
  const newBalance = Math.max(0, loan.outstandingBalance - payment.amount);
  const loanUpdate: Partial<Loan> = {
    outstandingBalance: newBalance,
    updatedAt: new Date(),
  };
  
  if (newBalance <= 0) {
    loanUpdate.status = 'closed';
    loanUpdate.closedAt = new Date();
  }
  
  batch.update(doc(getDb(), 'loans', payment.loanId), loanUpdate);
  
  await batch.commit();
  
  if (newBalance <= 0 && loan.investorId) {
    const { investorProfit } = calculateProfitSplit(loan.interestAmount);
    await returnCapitalFromLoan(loan.investorId, loan.principalAmount, investorProfit);
  }
  
  await createAuditLog({
    action: 'payment_approved',
    entityType: 'payment',
    entityId: paymentId,
    performedBy: adminId,
    performedByName: adminName,
    details: { 
      loanId: payment.loanId, 
      amount: payment.amount,
      newBalance,
      loanClosed: newBalance <= 0,
    },
  });
  
  await createNotification({
    userId: payment.borrowerId,
    title: 'Payment Confirmed',
    message: `Your payment of UGX ${payment.amount.toLocaleString()} has been confirmed.`,
    type: 'payment_confirmed',
    isRead: false,
    createdAt: new Date(),
    relatedEntityType: 'payment',
    relatedEntityId: paymentId,
  });
  
  await updateBorrowerStats(payment.borrowerId);
  await updateSystemStats();
}

export async function rejectPayment(
  paymentId: string,
  reason: string,
  adminId: string,
  adminName: string
): Promise<void> {
  await updateDoc(doc(getDb(), 'payments', paymentId), {
    status: 'rejected',
    rejectedReason: reason,
  });
  
  await createAuditLog({
    action: 'payment_rejected',
    entityType: 'payment',
    entityId: paymentId,
    performedBy: adminId,
    performedByName: adminName,
    details: { reason },
  });
}

// ============ NOTIFICATIONS ============
export async function createNotification(data: Omit<Notification, 'id'>): Promise<void> {
  await addDoc(collection(getDb(), 'notifications'), data);
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collection(getDb(), 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Notification));
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(getDb(), 'notifications', id), { isRead: true });
}

// ============ AUDIT LOGS ============
export async function createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(getDb(), 'auditLogs'), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
  let q;
  if (entityType && entityId) {
    q = query(
      collection(getDb(), 'auditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
  } else {
    q = query(
      collection(getDb(), 'auditLogs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as AuditLog));
}

// ============ SYSTEM STATS ============
export async function getSystemStats(): Promise<SystemStats | null> {
  const docSnap = await getDoc(doc(getDb(), 'system', 'stats'));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamp(docSnap.data()) } as SystemStats;
}

export async function initializeSystemStats(): Promise<void> {
  const statsRef = doc(getDb(), 'system', 'stats');
  const existing = await getDoc(statsRef);
  
  if (!existing.exists()) {
    const initialStats: Omit<SystemStats, 'id'> = {
      totalActiveLoans: 0,
      totalCapitalDeployed: 0,
      totalCapitalAvailable: 0,
      totalExpectedInterest: 0,
      loansDueToday: 0,
      loansDueTodayValue: 0,
      loansDueThisWeek: 0,
      loansDueThisWeekValue: 0,
      totalLateLoans: 0,
      totalLateLoansValue: 0,
      portfolioAtRisk: 0,
      defaultRate: 0,
      reserveBalance: 0,
      investorProfitThisMonth: 0,
      clpNetProfitThisMonth: 0,
      totalBorrowers: 0,
      totalInvestors: 0,
      totalLoansEverIssued: 0,
      totalAmountEverDisbursed: 0,
      totalAmountEverRepaid: 0,
      updatedAt: new Date(),
    };
    
    await addDoc(collection(getDb(), 'system'), initialStats);
  }
}

export async function updateSystemStats(): Promise<void> {
  const [loans, borrowers, investors, payments] = await Promise.all([
    getLoans(),
    getBorrowers(),
    getInvestors(),
    getPayments(),
  ]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  const activeLoans = loans.filter((l) => ['active', 'due_soon', 'late'].includes(l.status));
  const lateLoans = loans.filter((l) => l.status === 'late');
  const defaultLoans = loans.filter((l) => l.status === 'default');
  
  const loansDueToday = activeLoans.filter((l) => {
    const dueDate = new Date(l.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });
  
  const loansDueThisWeek = activeLoans.filter((l) => {
    const dueDate = new Date(l.dueDate);
    return dueDate >= today && dueDate <= weekFromNow;
  });
  
  const totalCapitalDeployed = investors.reduce((sum, i) => sum + i.capitalDeployed, 0);
  const totalCapitalAvailable = investors.reduce((sum, i) => sum + i.capitalAvailable, 0);
  const totalExpectedInterest = activeLoans.reduce((sum, l) => sum + l.interestAmount, 0);
  
  const totalActiveValue = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const lateValue = lateLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const portfolioAtRisk = totalActiveValue > 0 ? (lateValue / totalActiveValue) * 100 : 0;
  
  const totalLoansCount = loans.length;
  const defaultRate = totalLoansCount > 0 ? (defaultLoans.length / totalLoansCount) * 100 : 0;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyPayments = payments.filter((p) => 
    p.status === 'approved' && 
    new Date(p.submittedAt).toISOString().slice(0, 7) === currentMonth
  );
  const monthlyRepaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);
  
  const closedThisMonth = loans.filter((l) => 
    l.status === 'closed' && 
    l.closedAt && 
    new Date(l.closedAt).toISOString().slice(0, 7) === currentMonth
  );
  const monthlyInterest = closedThisMonth.reduce((sum, l) => sum + l.interestAmount, 0);
  
  const { investorProfit, clpNet } = calculateProfitSplit(monthlyInterest);
  
  const stats: Partial<SystemStats> = {
    totalActiveLoans: activeLoans.length,
    totalCapitalDeployed,
    totalCapitalAvailable,
    totalExpectedInterest,
    loansDueToday: loansDueToday.length,
    loansDueTodayValue: loansDueToday.reduce((sum, l) => sum + l.outstandingBalance, 0),
    loansDueThisWeek: loansDueThisWeek.length,
    loansDueThisWeekValue: loansDueThisWeek.reduce((sum, l) => sum + l.outstandingBalance, 0),
    totalLateLoans: lateLoans.length,
    totalLateLoansValue: lateValue,
    portfolioAtRisk: Math.round(portfolioAtRisk * 100) / 100,
    defaultRate: Math.round(defaultRate * 100) / 100,
    investorProfitThisMonth: investorProfit,
    clpNetProfitThisMonth: clpNet,
    totalBorrowers: borrowers.length,
    totalInvestors: investors.length,
    totalLoansEverIssued: loans.length,
    totalAmountEverDisbursed: loans.reduce((sum, l) => sum + l.amountDisbursed, 0),
    totalAmountEverRepaid: payments
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0),
    updatedAt: new Date(),
  };
  
  await updateDoc(doc(getDb(), 'system', 'stats'), stats);
}

// ============ MONTHLY REPORTS ============
export async function generateMonthlyReport(month: string, year: number): Promise<MonthlyReport> {
  const monthKey = `${year}-${month.padStart(2, '0')}`;
  const [loans, payments, investors] = await Promise.all([
    getLoans(),
    getPayments(),
    getInvestors(),
  ]);
  
  const monthLoans = loans.filter((l) => 
    new Date(l.createdAt).toISOString().slice(0, 7) === monthKey
  );
  
  const monthPayments = payments.filter((p) => 
    p.status === 'approved' && 
    new Date(p.submittedAt).toISOString().slice(0, 7) === monthKey
  );
  
  const closedLoans = loans.filter((l) => 
    l.status === 'closed' && 
    l.closedAt && 
    new Date(l.closedAt).toISOString().slice(0, 7) === monthKey
  );
  
  const defaultedLoans = loans.filter((l) => 
    l.status === 'default' && 
    new Date(l.updatedAt).toISOString().slice(0, 7) === monthKey
  );
  
  const totalCapitalDeployed = investors.reduce((sum, i) => sum + i.capitalDeployed, 0);
  const totalInterestGenerated = closedLoans.reduce((sum, l) => sum + l.interestAmount, 0);
  
  const { investorProfit, clpGross, reserveAllocation, clpNet } = calculateProfitSplit(totalInterestGenerated);
  
  const activeLoans = loans.filter((l) => ['active', 'due_soon', 'late'].includes(l.status));
  const lateLoans = loans.filter((l) => l.status === 'late');
  
  const report: Omit<MonthlyReport, 'id'> = {
    month,
    year,
    totalCapitalDeployed,
    totalInterestGenerated,
    investorTotalPayout: investorProfit,
    clpGrossRetained: clpGross,
    reserveAllocation,
    netClpEarnings: clpNet,
    totalDefaults: defaultedLoans.length,
    totalDefaultAmount: defaultedLoans.reduce((sum, l) => sum + l.outstandingBalance, 0),
    totalRecoveries: 0,
    totalRecoveryAmount: 0,
    totalLoansIssued: monthLoans.length,
    totalLoansClosed: closedLoans.length,
    newBorrowers: 0,
    activeLoansCount: activeLoans.length,
    lateLoansCount: lateLoans.length,
    defaultLoansCount: defaultedLoans.length,
    portfolioAtRisk7: 0,
    portfolioAtRisk30: 0,
    createdAt: new Date(),
  };
  
  const docRef = await addDoc(collection(getDb(), 'monthlyReports'), report);
  return { ...report, id: docRef.id };
}

export async function getMonthlyReports(): Promise<MonthlyReport[]> {
  const q = query(collection(getDb(), 'monthlyReports'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as MonthlyReport));
}

// ============ FILE UPLOADS ============
export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(getStorageRef(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadPaymentProof(file: File, paymentId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `payment-proofs/${paymentId}.${ext}`;
  return uploadFile(file, path);
}

export async function uploadKYCDocument(file: File, borrowerId: string, docType: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `kyc/${borrowerId}/${docType}-${Date.now()}.${ext}`;
  return uploadFile(file, path);
}

// ============ LOAN APPLICATIONS ============
export async function createLoanApplication(data: Omit<LoanApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoanApplication> {
  const cleanData = removeUndefined(data as Record<string, unknown>);
  const docRef = await addDoc(collection(getDb(), 'loanApplications'), {
    ...cleanData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return { ...data, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as LoanApplication;
}

export async function getLoanApplications(): Promise<LoanApplication[]> {
  const q = query(collection(getDb(), 'loanApplications'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as LoanApplication));
}

export async function updateLoanApplication(id: string, data: Partial<LoanApplication>): Promise<void> {
  await updateDoc(doc(getDb(), 'loanApplications', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ============ REAL-TIME LISTENERS ============
export function subscribeToStats(callback: (stats: SystemStats) => void): () => void {
  return onSnapshot(doc(getDb(), 'system', 'stats'), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...convertTimestamp(snapshot.data()) } as SystemStats);
    }
  });
}

export function subscribeToLoans(callback: (loans: Loan[]) => void): () => void {
  const q = query(collection(getDb(), 'loans'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const loans = snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Loan));
    callback(loans);
  });
}

export function subscribeToPayments(callback: (payments: Payment[]) => void): () => void {
  const q = query(collection(getDb(), 'payments'), orderBy('submittedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((doc) => ({ id: doc.id, ...convertTimestamp(doc.data()) } as Payment));
    callback(payments);
  });
}
