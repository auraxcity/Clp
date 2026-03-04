'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { LoanStatusChart } from '@/components/dashboard/LoanStatusChart';
import { InterestTrendChart } from '@/components/dashboard/InterestTrendChart';
import { CapitalUtilizationChart } from '@/components/dashboard/CapitalUtilizationChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { DueLoansTable } from '@/components/dashboard/DueLoansTable';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  PiggyBank,
  Shield,
  DollarSign,
  Calendar,
  Target,
  Percent,
  Building,
} from 'lucide-react';
import { 
  getSystemStats, 
  getLoans, 
  getPayments, 
  getBorrowers, 
  getInvestors,
  subscribeToStats,
  initializeSystemStats,
} from '@/lib/firebase-service';
import { Loan, SystemStats } from '@/types';

export default function DashboardPage() {
  const { loans, setLoans, payments, setPayments, stats, setStats, setBorrowers, setInvestors } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loansDueToday, setLoansDueToday] = useState<Loan[]>([]);
  const [loansDueThisWeek, setLoansDueThisWeek] = useState<Loan[]>([]);
  const [lateLoans, setLateLoans] = useState<Loan[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        await initializeSystemStats();
        
        const [loansData, paymentsData, borrowersData, investorsData, statsData] = await Promise.all([
          getLoans(),
          getPayments(),
          getBorrowers(),
          getInvestors(),
          getSystemStats(),
        ]);

        setLoans(loansData);
        setPayments(paymentsData);
        setBorrowers(borrowersData);
        setInvestors(investorsData);
        if (statsData) setStats(statsData);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const activeLoans = loansData.filter(l => ['active', 'due_soon', 'late'].includes(l.status));
        
        setLoansDueToday(activeLoans.filter(l => {
          const dueDate = new Date(l.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        }));

        setLoansDueThisWeek(activeLoans.filter(l => {
          const dueDate = new Date(l.dueDate);
          return dueDate >= today && dueDate <= weekFromNow;
        }));

        setLateLoans(loansData.filter(l => l.status === 'late'));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    const unsubscribe = subscribeToStats((newStats) => {
      setStats(newStats);
    });

    return () => unsubscribe();
  }, [setLoans, setPayments, setBorrowers, setInvestors, setStats]);

  const activeLoansCount = loans.filter(l => ['active', 'due_soon', 'late'].includes(l.status)).length;
  const lateLoansCount = loans.filter(l => l.status === 'late').length;
  const defaultLoansCount = loans.filter(l => l.status === 'default').length;
  const closedLoansCount = loans.filter(l => l.status === 'closed').length;

  const defaultStats: SystemStats = {
    id: 'stats',
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

  const currentStats = stats || defaultStats;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your lending portfolio overview.</p>
        </div>

        {/* Primary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Active Loans"
            value={currentStats.totalActiveLoans}
            icon={<Wallet className="h-6 w-6 text-white" />}
            iconBgColor="bg-[#0A1F44]"
          />
          <StatCard
            title="Capital Deployed"
            value={formatCurrency(currentStats.totalCapitalDeployed)}
            icon={<DollarSign className="h-6 w-6 text-white" />}
            iconBgColor="bg-[#00A86B]"
          />
          <StatCard
            title="Capital Available"
            value={formatCurrency(currentStats.totalCapitalAvailable)}
            icon={<Building className="h-6 w-6 text-white" />}
            iconBgColor="bg-[#D4AF37]"
          />
          <StatCard
            title="Expected Interest"
            value={formatCurrency(currentStats.totalExpectedInterest)}
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            iconBgColor="bg-purple-600"
          />
        </div>

        {/* Due Loans Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Due Today"
            value={currentStats.loansDueToday}
            subtitle={formatCurrency(currentStats.loansDueTodayValue)}
            icon={<Calendar className="h-6 w-6 text-white" />}
            iconBgColor="bg-orange-500"
          />
          <StatCard
            title="Due This Week"
            value={currentStats.loansDueThisWeek}
            subtitle={formatCurrency(currentStats.loansDueThisWeekValue)}
            icon={<Clock className="h-6 w-6 text-white" />}
            iconBgColor="bg-blue-500"
          />
          <StatCard
            title="Late Loans"
            value={currentStats.totalLateLoans}
            subtitle={formatCurrency(currentStats.totalLateLoansValue)}
            icon={<AlertTriangle className="h-6 w-6 text-white" />}
            iconBgColor="bg-red-500"
          />
          <StatCard
            title="Portfolio at Risk"
            value={`${currentStats.portfolioAtRisk}%`}
            icon={<Target className="h-6 w-6 text-white" />}
            iconBgColor="bg-rose-600"
          />
        </div>

        {/* Financial Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Default Rate"
            value={`${currentStats.defaultRate}%`}
            icon={<Percent className="h-6 w-6 text-white" />}
            iconBgColor="bg-gray-800"
          />
          <StatCard
            title="Reserve Balance"
            value={formatCurrency(currentStats.reserveBalance)}
            icon={<Shield className="h-6 w-6 text-white" />}
            iconBgColor="bg-indigo-600"
          />
          <StatCard
            title="Investor Profit (Month)"
            value={formatCurrency(currentStats.investorProfitThisMonth)}
            icon={<PiggyBank className="h-6 w-6 text-white" />}
            iconBgColor="bg-emerald-600"
          />
          <StatCard
            title="CLP Net Profit (Month)"
            value={formatCurrency(currentStats.clpNetProfitThisMonth)}
            icon={<DollarSign className="h-6 w-6 text-white" />}
            iconBgColor="bg-[#0A1F44]"
          />
        </div>

        {/* Entity Counts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Borrowers"
            value={currentStats.totalBorrowers}
            icon={<Users className="h-6 w-6 text-white" />}
            iconBgColor="bg-cyan-600"
          />
          <StatCard
            title="Total Investors"
            value={currentStats.totalInvestors}
            icon={<PiggyBank className="h-6 w-6 text-white" />}
            iconBgColor="bg-pink-600"
          />
          <StatCard
            title="Total Loans Issued"
            value={currentStats.totalLoansEverIssued}
            icon={<Wallet className="h-6 w-6 text-white" />}
            iconBgColor="bg-teal-600"
          />
          <StatCard
            title="Total Disbursed"
            value={formatCurrency(currentStats.totalAmountEverDisbursed)}
            icon={<DollarSign className="h-6 w-6 text-white" />}
            iconBgColor="bg-violet-600"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LoanStatusChart
            activeLoans={activeLoansCount}
            lateLoans={lateLoansCount}
            defaultLoans={defaultLoansCount}
            closedLoans={closedLoansCount}
          />
          <CapitalUtilizationChart
            deployed={currentStats.totalCapitalDeployed}
            available={currentStats.totalCapitalAvailable}
            reserve={currentStats.reserveBalance}
          />
          <InterestTrendChart data={[]} />
        </div>

        {/* Due Loans Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DueLoansTable
            loans={loansDueToday}
            title="Loans Due Today"
            emptyMessage="No loans due today"
          />
          <DueLoansTable
            loans={lateLoans}
            title="Late Loans"
            emptyMessage="No late loans - Great job!"
          />
        </div>

        {/* Recent Activity */}
        <RecentActivity loans={loans} payments={payments} />
      </div>
    </DashboardLayout>
  );
}
