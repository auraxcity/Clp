'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/useStore';
import { getInvestors, createInvestor, updateInvestor, getLoansByInvestor } from '@/lib/firebase-service';
import { Investor, Loan } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  PlusCircle, 
  PiggyBank, 
  TrendingUp, 
  Wallet, 
  DollarSign,
  User,
  Phone,
  Edit,
  Eye,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const investorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email().optional().or(z.literal('')),
  capitalCommitted: z.string().min(1, 'Capital amount is required'),
  notes: z.string().optional(),
});

type InvestorFormData = z.infer<typeof investorSchema>;

export default function InvestorsPage() {
  const { investors, setInvestors, addInvestor: addInvestorToStore, updateInvestor: updateInvestorInStore } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [investorLoans, setInvestorLoans] = useState<Loan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InvestorFormData>({
    resolver: zodResolver(investorSchema),
  });

  useEffect(() => {
    async function loadInvestors() {
      try {
        const data = await getInvestors();
        setInvestors(data);
      } catch (error) {
        console.error('Failed to load investors:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInvestors();
  }, [setInvestors]);

  const onSubmit = async (data: InvestorFormData) => {
    setIsSubmitting(true);
    try {
      const capitalAmount = parseInt(data.capitalCommitted);
      
      const investorData: Omit<Investor, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        capitalCommitted: capitalAmount,
        capitalDeployed: 0,
        capitalAvailable: capitalAmount,
        totalProfitEarned: 0,
        monthlyProfitBreakdown: {},
        roi: 0,
        isActive: true,
        notes: data.notes || undefined,
      };

      const newInvestor = await createInvestor(investorData);
      addInvestorToStore(newInvestor);
      toast.success('Investor added successfully!');
      reset();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating investor:', error);
      toast.error('Failed to add investor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (investor: Investor) => {
    setSelectedInvestor(investor);
    try {
      const loans = await getLoansByInvestor(investor.id);
      setInvestorLoans(loans);
    } catch (error) {
      console.error('Failed to load investor loans:', error);
      setInvestorLoans([]);
    }
    setShowDetailModal(true);
  };

  const stats = {
    totalInvestors: investors.length,
    activeInvestors: investors.filter((i) => i.isActive).length,
    totalCapital: investors.reduce((sum, i) => sum + i.capitalCommitted, 0),
    totalDeployed: investors.reduce((sum, i) => sum + i.capitalDeployed, 0),
    totalAvailable: investors.reduce((sum, i) => sum + i.capitalAvailable, 0),
    totalProfit: investors.reduce((sum, i) => sum + i.totalProfitEarned, 0),
  };

  const utilizationRate = stats.totalCapital > 0 
    ? ((stats.totalDeployed / stats.totalCapital) * 100).toFixed(1)
    : '0';

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
            <h1 className="text-2xl font-bold text-gray-900">Investors</h1>
            <p className="text-gray-500 mt-1">Manage investor capital and track returns</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Investor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-[#0A1F44]" />
              <span className="text-sm text-gray-500">Investors</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalInvestors}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#00A86B]" />
              <span className="text-sm text-gray-500">Total Capital</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalCapital)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">Deployed</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalDeployed)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">Available</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalAvailable)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Total Profit</span>
            </div>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(stats.totalProfit)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-500">Utilization</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{utilizationRate}%</p>
          </div>
        </div>

        {/* Investors List */}
        {investors.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <PiggyBank className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No investors yet</h3>
            <p className="text-gray-500 mb-4">Add your first investor to start funding loans</p>
            <Button onClick={() => setShowAddModal(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Investor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investors.map((investor) => (
              <Card key={investor.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[#D4AF37] flex items-center justify-center">
                      <span className="text-[#0A1F44] font-bold text-lg">
                        {investor.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{investor.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        {investor.phone}
                      </div>
                    </div>
                  </div>
                  <Badge variant={investor.isActive ? 'success' : 'default'}>
                    {investor.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Capital Committed</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(investor.capitalCommitted)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deployed</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatCurrency(investor.capitalDeployed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available</p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(investor.capitalAvailable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Profit</p>
                    <p className="text-sm font-semibold text-[#D4AF37]">
                      {formatCurrency(investor.totalProfitEarned)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-500">ROI: </span>
                    <span className="font-semibold text-[#00A86B]">{investor.roi}%</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewDetails(investor)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Investor Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Investor"
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="Enter investor name"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Phone Number *"
              placeholder="+256 7XX XXX XXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Capital Commitment (UGX) *"
              type="number"
              placeholder="Enter amount"
              error={errors.capitalCommitted?.message}
              {...register('capitalCommitted')}
            />
            <Input
              label="Notes"
              placeholder="Any additional notes..."
              {...register('notes')}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="flex-1">
                Add Investor
              </Button>
            </div>
          </form>
        </Modal>

        {/* Investor Details Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Investor Details"
          size="lg"
        >
          {selectedInvestor && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#D4AF37] flex items-center justify-center">
                  <span className="text-[#0A1F44] font-bold text-2xl">
                    {selectedInvestor.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedInvestor.name}</h3>
                  <p className="text-gray-500">{selectedInvestor.phone}</p>
                  {selectedInvestor.email && (
                    <p className="text-gray-500 text-sm">{selectedInvestor.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Committed</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedInvestor.capitalCommitted)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Deployed</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(selectedInvestor.capitalDeployed)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Available</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(selectedInvestor.capitalAvailable)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-600">Total Profit</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {formatCurrency(selectedInvestor.totalProfitEarned)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Funded Loans</h4>
                {investorLoans.length === 0 ? (
                  <p className="text-gray-500 text-sm">No loans funded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {investorLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{loan.borrowerName}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(loan.principalAmount)} · {loan.status}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">{formatDate(loan.loanDate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
