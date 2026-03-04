import { create } from 'zustand';
import { User, Borrower, Loan, Investor, Payment, SystemStats, Notification } from '@/types';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  borrowers: Borrower[];
  setBorrowers: (borrowers: Borrower[]) => void;
  addBorrower: (borrower: Borrower) => void;
  updateBorrower: (id: string, data: Partial<Borrower>) => void;
  
  loans: Loan[];
  setLoans: (loans: Loan[]) => void;
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, data: Partial<Loan>) => void;
  
  investors: Investor[];
  setInvestors: (investors: Investor[]) => void;
  addInvestor: (investor: Investor) => void;
  updateInvestor: (id: string, data: Partial<Investor>) => void;
  
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  
  stats: SystemStats | null;
  setStats: (stats: SystemStats) => void;
  
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  borrowers: [],
  setBorrowers: (borrowers) => set({ borrowers }),
  addBorrower: (borrower) => set((state) => ({ 
    borrowers: [...state.borrowers, borrower] 
  })),
  updateBorrower: (id, data) => set((state) => ({
    borrowers: state.borrowers.map((b) => 
      b.id === id ? { ...b, ...data } : b
    ),
  })),
  
  loans: [],
  setLoans: (loans) => set({ loans }),
  addLoan: (loan) => set((state) => ({ 
    loans: [...state.loans, loan] 
  })),
  updateLoan: (id, data) => set((state) => ({
    loans: state.loans.map((l) => 
      l.id === id ? { ...l, ...data } : l
    ),
  })),
  
  investors: [],
  setInvestors: (investors) => set({ investors }),
  addInvestor: (investor) => set((state) => ({ 
    investors: [...state.investors, investor] 
  })),
  updateInvestor: (id, data) => set((state) => ({
    investors: state.investors.map((i) => 
      i.id === id ? { ...i, ...data } : i
    ),
  })),
  
  payments: [],
  setPayments: (payments) => set({ payments }),
  addPayment: (payment) => set((state) => ({ 
    payments: [...state.payments, payment] 
  })),
  updatePayment: (id, data) => set((state) => ({
    payments: state.payments.map((p) => 
      p.id === id ? { ...p, ...data } : p
    ),
  })),
  
  stats: null,
  setStats: (stats) => set({ stats }),
  
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
  })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    ),
  })),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
