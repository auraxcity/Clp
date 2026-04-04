'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  getInvestments, 
  getInvestors, 
  getWithdrawalRequests,
  processWithdrawal,
  updateInvestorAccruedInterest,
  processMaturedInvestments,
} from '@/lib/firebase-service';
import { Investment, Investor, WithdrawalRequest } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  PiggyBank,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowDownCircle,
  RefreshCw,
  Banknote,
  Users,
  Calendar,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'investments' | 'withdrawals' | 'investors'>('investments');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [investmentsData, investorsData, withdrawalsData] = await Promise.all([
        getInvestments(),
        getInvestors(),
        getWithdrawalRequests(),
      ]);
      setInvestments(investmentsData);
      setInvestors(investorsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessMaturedInvestments = async () => {
    setIsProcessing(true);
    try {
      await processMaturedInvestments();
      toast.success('Matured investments processed');
      loadData();
    } catch (error) {
      toast.error('Failed to process matured investments');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAccruedInterest = async () => {
    setIsProcessing(true);
    try {
      await updateInvestorAccruedInterest();
      toast.success('Accrued interest updated for all investors');
      loadData();
    } catch (error) {
      toast.error('Failed to update accrued interest');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, status: 'completed' | 'rejected') => {
    try {
      await processWithdrawal(withdrawalId, 'admin', status);
      toast.success(`Withdrawal ${status}`);
      loadData();
    } catch (error) {
      toast.error('Failed to process withdrawal');
    }
  };

  const activeInvestments = investments.filter(i => i.status === 'active');
  const maturedInvestments = investments.filter(i => i.status === 'matured');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  
  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.amount, 0);
  const totalExpectedReturns = activeInvestments.reduce((sum, i) => sum + i.expectedReturn, 0);
  const totalInvestorCapital = investors.reduce((sum, i) => sum + i.capitalCommitted, 0);
  const totalPendingWithdrawals = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

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
      <Toaster position="top-right" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Investment Management</h1>
            <p className="text-gray-500 mt-1">Manage investor capital and withdrawals</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleUpdateAccruedInterest}
              disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Update Interest
            </Button>
            <Button 
              onClick={handleProcessMaturedInvestments}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Process Matured
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#0A1F44] flex items-center justify-center">
                <Banknote className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Investments</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
                <p className="text-xs text-gray-400">{activeInvestments.length} investments</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Returns</p>
                <p className="text-xl font-bold text-[#00A86B]">{formatCurrency(totalExpectedReturns)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-[#0A1F44]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Investor Capital</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvestorCapital)}</p>
                <p className="text-xs text-gray-400">{investors.length} investors</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Withdrawals</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPendingWithdrawals)}</p>
                <p className="text-xs text-gray-400">{pendingWithdrawals.length} requests</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          {(['investments', 'withdrawals', 'investors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#0A1F44] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'investments' && `Investments (${investments.length})`}
              {tab === 'withdrawals' && `Withdrawals (${withdrawals.length})`}
              {tab === 'investors' && `Investors (${investors.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'investments' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Investments</h2>
            {investments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No investments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Investor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Start Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Maturity</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Expected Return</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{inv.investorName}</td>
                        <td className="py-3 px-4 text-sm">{formatCurrency(inv.amount)}</td>
                        <td className="py-3 px-4 text-sm">{inv.duration} months</td>
                        <td className="py-3 px-4 text-sm">{inv.interestRate}%</td>
                        <td className="py-3 px-4 text-sm">{formatDate(inv.startDate)}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(inv.maturityDate)}</td>
                        <td className="py-3 px-4 text-sm text-[#00A86B] font-medium">
                          {formatCurrency(inv.expectedReturn)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            inv.status === 'active' ? 'bg-green-100 text-green-700' :
                            inv.status === 'matured' ? 'bg-blue-100 text-blue-700' :
                            inv.status === 'withdrawn' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'withdrawals' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Withdrawal Requests</h2>
            {withdrawals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No withdrawal requests</p>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        w.status === 'completed' ? 'bg-green-100' :
                        w.status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {w.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : w.status === 'rejected' ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{w.investorName}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(w.amount)} · {formatDate(w.requestedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        w.status === 'completed' ? 'bg-green-100 text-green-700' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {w.status}
                      </Badge>
                      {(w.status === 'pending' || w.status === 'processing') && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleProcessWithdrawal(w.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessWithdrawal(w.id, 'rejected')}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'investors' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Investors</h2>
            {investors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No investors yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Committed</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Deployed</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Available</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Accrued Interest</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total Profit</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ROI</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{inv.name}</td>
                        <td className="py-3 px-4 text-sm">
                          <p>{inv.email}</p>
                          <p className="text-gray-500">{inv.phone}</p>
                        </td>
                        <td className="py-3 px-4 text-sm">{formatCurrency(inv.capitalCommitted)}</td>
                        <td className="py-3 px-4 text-sm">{formatCurrency(inv.capitalDeployed)}</td>
                        <td className="py-3 px-4 text-sm text-green-600 font-medium">
                          {formatCurrency(inv.capitalAvailable)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#D4AF37] font-medium">
                          {formatCurrency(inv.accruedInterest || 0)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#00A86B] font-medium">
                          {formatCurrency(inv.totalProfitEarned)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{inv.roi.toFixed(2)}%</td>
                        <td className="py-3 px-4">
                          <Badge className={inv.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {inv.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
