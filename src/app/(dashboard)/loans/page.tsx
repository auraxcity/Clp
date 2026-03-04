'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoanCard } from '@/components/loans/LoanCard';
import { LoanForm } from '@/components/loans/LoanForm';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useStore } from '@/store/useStore';
import { getLoans, getInvestors, approveLoan, disburseLoan, updateSystemStats } from '@/lib/firebase-service';
import { Loan, Investor } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  PlusCircle, 
  Search, 
  Wallet, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoansPage() {
  const { loans, setLoans, addLoan, updateLoan, investors, setInvestors } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [loansData, investorsData] = await Promise.all([
          getLoans(),
          getInvestors(),
        ]);
        setLoans(loansData);
        setInvestors(investorsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setLoans, setInvestors]);

  const handleLoanCreated = (loan: Loan) => {
    addLoan(loan);
    setShowAddModal(false);
    toast.success('Loan application created!');
  };

  const handleApproveClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setSelectedInvestor('');
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selectedLoan || !selectedInvestor) {
      toast.error('Please select an investor');
      return;
    }

    try {
      await approveLoan(
        selectedLoan.id, 
        selectedInvestor, 
        'admin', // TODO: Get actual admin ID
        'Admin User' // TODO: Get actual admin name
      );
      
      const updatedLoans = await getLoans();
      setLoans(updatedLoans);
      
      setShowApproveModal(false);
      setSelectedLoan(null);
      toast.success('Loan approved successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve loan';
      toast.error(errorMessage);
    }
  };

  const handleDisburse = async (loan: Loan) => {
    try {
      await disburseLoan(
        loan.id,
        'admin', // TODO: Get actual admin ID
        'Admin User' // TODO: Get actual admin name
      );
      
      const updatedLoans = await getLoans();
      setLoans(updatedLoans);
      
      toast.success('Loan disbursed successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disburse loan';
      toast.error(errorMessage);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.borrowerPhone.includes(searchQuery);

    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    const matchesProduct = filterProduct === 'all' || loan.loanProduct === filterProduct;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter((l) => l.status === 'pending').length,
    active: loans.filter((l) => ['active', 'due_soon', 'late'].includes(l.status)).length,
    late: loans.filter((l) => l.status === 'late').length,
    defaulted: loans.filter((l) => l.status === 'default').length,
    closed: loans.filter((l) => l.status === 'closed').length,
    totalValue: loans.filter((l) => ['active', 'due_soon', 'late'].includes(l.status))
      .reduce((sum, l) => sum + l.principalAmount, 0),
  };

  const availableInvestors = investors.filter(
    (i) => i.isActive && selectedLoan && i.capitalAvailable >= selectedLoan.principalAmount
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
            <p className="text-gray-500 mt-1">Manage all loan applications and disbursements</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Loan Application
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#0A1F44]" />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">Late</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.late}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-800" />
              <span className="text-sm text-gray-500">Default</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.defaulted}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#00A86B]" />
              <span className="text-sm text-gray-500">Active Value</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by borrower name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44] focus:border-transparent"
                />
              </div>
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'active', label: 'Active' },
                { value: 'due_soon', label: 'Due Soon' },
                { value: 'late', label: 'Late' },
                { value: 'default', label: 'Default' },
                { value: 'closed', label: 'Closed' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-40"
            />
            <Select
              options={[
                { value: 'all', label: 'All Products' },
                { value: 'quick_cash', label: 'Quick Cash' },
                { value: 'business_boost', label: 'Business Boost' },
                { value: 'investor_backed_premium', label: 'Premium' },
              ]}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
        </div>

        {/* Loans Grid */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No loans found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterStatus !== 'all' || filterProduct !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first loan application to get started'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterProduct === 'all' && (
              <Button onClick={() => setShowAddModal(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Loan Application
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                showActions
                onApprove={handleApproveClick}
                onDisburse={handleDisburse}
              />
            ))}
          </div>
        )}

        {/* Add Loan Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="New Loan Application"
          size="xl"
        >
          <LoanForm
            onSuccess={handleLoanCreated}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>

        {/* Approve Loan Modal */}
        <Modal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Loan"
          size="md"
        >
          {selectedLoan && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Borrower</p>
                <p className="font-semibold text-gray-900">{selectedLoan.borrowerName}</p>
                <p className="text-sm text-gray-500 mt-2">Loan Amount</p>
                <p className="text-2xl font-bold text-[#0A1F44]">
                  {formatCurrency(selectedLoan.principalAmount)}
                </p>
              </div>

              <Select
                label="Select Investor to Fund This Loan *"
                options={availableInvestors.map((i) => ({
                  value: i.id,
                  label: `${i.name} (Available: ${formatCurrency(i.capitalAvailable)})`,
                }))}
                placeholder="Choose an investor"
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
              />

              {availableInvestors.length === 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  No investors have sufficient capital for this loan amount.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={!selectedInvestor}
                  className="flex-1"
                >
                  Approve Loan
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
