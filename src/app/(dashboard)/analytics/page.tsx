'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/useStore';
import { getLoans, getPayments, getBorrowers, getInvestors } from '@/lib/firebase-service';
import { formatCurrency, getPortfolioAtRisk } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Target,
  Activity,
  Percent,
  Users,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { loans, setLoans, borrowers, setBorrowers, investors, setInvestors, payments, setPayments } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [loansData, borrowersData, investorsData, paymentsData] = await Promise.all([
          getLoans(),
          getBorrowers(),
          getInvestors(),
          getPayments(),
        ]);
        setLoans(loansData);
        setBorrowers(borrowersData);
        setInvestors(investorsData);
        setPayments(paymentsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setLoans, setBorrowers, setInvestors, setPayments]);

  const activeLoans = loans.filter((l) => ['active', 'due_soon', 'late'].includes(l.status));
  const lateLoans = loans.filter((l) => l.status === 'late');
  const defaultLoans = loans.filter((l) => l.status === 'default');
  const closedLoans = loans.filter((l) => l.status === 'closed');

  const totalPortfolioValue = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const latePortfolioValue = lateLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const defaultPortfolioValue = defaultLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const par7 = getPortfolioAtRisk(loans, 7);
  const par30 = getPortfolioAtRisk(loans, 30);

  const portfolioAtRisk = totalPortfolioValue > 0 
    ? ((latePortfolioValue + defaultPortfolioValue) / totalPortfolioValue) * 100 
    : 0;

  const defaultRate = loans.length > 0 
    ? (defaultLoans.length / loans.length) * 100 
    : 0;

  const recoveryRate = defaultLoans.length > 0
    ? ((defaultLoans.filter((l) => l.outstandingBalance === 0).length) / defaultLoans.length) * 100
    : 100;

  const totalCapital = investors.reduce((sum, i) => sum + i.capitalCommitted, 0);
  const deployedCapital = investors.reduce((sum, i) => sum + i.capitalDeployed, 0);
  const capitalUtilization = totalCapital > 0 ? (deployedCapital / totalCapital) * 100 : 0;

  const reserveRatio = totalCapital > 0 
    ? ((totalCapital - deployedCapital) / totalPortfolioValue) * 100 
    : 0;

  const riskGradeDistribution = [
    { name: 'Grade A', value: borrowers.filter((b) => b.riskGrade === 'A').length, color: '#22C55E' },
    { name: 'Grade B', value: borrowers.filter((b) => b.riskGrade === 'B').length, color: '#3B82F6' },
    { name: 'Grade C', value: borrowers.filter((b) => b.riskGrade === 'C').length, color: '#EAB308' },
    { name: 'Grade D', value: borrowers.filter((b) => b.riskGrade === 'D').length, color: '#F97316' },
    { name: 'Grade F', value: borrowers.filter((b) => b.riskGrade === 'F').length, color: '#EF4444' },
  ].filter((item) => item.value > 0);

  const loanStatusDistribution = [
    { name: 'Active', value: activeLoans.length - lateLoans.length, color: '#22C55E' },
    { name: 'Due Soon', value: loans.filter((l) => l.status === 'due_soon').length, color: '#EAB308' },
    { name: 'Late', value: lateLoans.length, color: '#F97316' },
    { name: 'Default', value: defaultLoans.length, color: '#1F2937' },
    { name: 'Closed', value: closedLoans.length, color: '#6B7280' },
  ].filter((item) => item.value > 0);

  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    
    const monthLoans = loans.filter((l) => 
      new Date(l.createdAt).toISOString().slice(0, 7) === monthKey
    );
    const monthPayments = payments.filter((p) => 
      p.status === 'approved' && 
      new Date(p.submittedAt).toISOString().slice(0, 7) === monthKey
    );
    const monthDefaults = loans.filter((l) => 
      l.status === 'default' && 
      new Date(l.updatedAt).toISOString().slice(0, 7) === monthKey
    );
    
    monthlyData.push({
      month: monthLabel,
      disbursed: monthLoans.reduce((sum, l) => sum + l.principalAmount, 0),
      repaid: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      defaults: monthDefaults.length,
    });
  }

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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Analytics</h1>
          <p className="text-gray-500 mt-1">Monitor portfolio health and risk metrics</p>
        </div>

        {/* Key Risk Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={portfolioAtRisk > 20 ? 'border-red-300 bg-red-50' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Portfolio at Risk</p>
                <p className={`text-3xl font-bold ${portfolioAtRisk > 20 ? 'text-red-600' : 'text-gray-900'}`}>
                  {portfolioAtRisk.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatCurrency(latePortfolioValue + defaultPortfolioValue)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${portfolioAtRisk > 20 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Target className={`h-6 w-6 ${portfolioAtRisk > 20 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
            </div>
          </Card>

          <Card className={defaultRate > 10 ? 'border-red-300 bg-red-50' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Default Rate</p>
                <p className={`text-3xl font-bold ${defaultRate > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                  {defaultRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {defaultLoans.length} of {loans.length} loans
                </p>
              </div>
              <div className={`p-3 rounded-lg ${defaultRate > 10 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-6 w-6 ${defaultRate > 10 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Capital Utilization</p>
                <p className="text-3xl font-bold text-gray-900">
                  {capitalUtilization.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatCurrency(deployedCapital)} deployed
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recovery Rate</p>
                <p className={`text-3xl font-bold ${recoveryRate > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {recoveryRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  From defaulted loans
                </p>
              </div>
              <div className={`p-3 rounded-lg ${recoveryRate > 80 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Shield className={`h-6 w-6 ${recoveryRate > 80 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </Card>
        </div>

        {/* PAR Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PAR 7 (7 Days Overdue)</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-orange-600">{par7.percentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {par7.count} loans | {formatCurrency(par7.value)}
                </p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: par7.percentage, fill: '#F97316' },
                        { value: 100 - par7.percentage, fill: '#E5E7EB' },
                      ]}
                      dataKey="value"
                      innerRadius={25}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PAR 30 (30 Days Overdue)</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-red-600">{par30.percentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {par30.count} loans | {formatCurrency(par30.value)}
                </p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: par30.percentage, fill: '#EF4444' },
                        { value: 100 - par30.percentage, fill: '#E5E7EB' },
                      ]}
                      dataKey="value"
                      innerRadius={25}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disbursement vs Repayment Trend */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disbursement vs Repayment Trend</h3>
            <div className="h-64">
              {monthlyData.some((d) => d.disbursed > 0 || d.repaid > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0A1F44" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0A1F44" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00A86B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00A86B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area
                      type="monotone"
                      dataKey="disbursed"
                      name="Disbursed"
                      stroke="#0A1F44"
                      fill="url(#colorDisbursed)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="repaid"
                      name="Repaid"
                      stroke="#00A86B"
                      fill="url(#colorRepaid)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Risk Grade Distribution */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Risk Distribution</h3>
            <div className="h-64">
              {riskGradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskGradeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskGradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No borrower data
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {riskGradeDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Loan Status Overview */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Status Overview</h3>
          <div className="h-64">
            {loanStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanStatusDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {loanStatusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No loan data
              </div>
            )}
          </div>
        </Card>

        {/* Risk Alerts */}
        {(portfolioAtRisk > 15 || defaultRate > 5 || lateLoans.length > 0) && (
          <Card className="border-orange-300 bg-orange-50">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-800">Risk Alerts</h3>
            </div>
            <div className="space-y-3">
              {portfolioAtRisk > 15 && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                  <Badge variant="danger">High</Badge>
                  <span className="text-sm text-gray-700">
                    Portfolio at Risk is above 15% threshold ({portfolioAtRisk.toFixed(1)}%)
                  </span>
                </div>
              )}
              {defaultRate > 5 && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                  <Badge variant="danger">High</Badge>
                  <span className="text-sm text-gray-700">
                    Default rate exceeds 5% ({defaultRate.toFixed(1)}%)
                  </span>
                </div>
              )}
              {lateLoans.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                  <Badge variant="warning">Medium</Badge>
                  <span className="text-sm text-gray-700">
                    {lateLoans.length} loan(s) are currently overdue - follow up required
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
