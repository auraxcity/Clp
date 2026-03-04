'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { useStore } from '@/store/useStore';
import { 
  getPayments, 
  getLoans, 
  createPayment, 
  approvePayment, 
  rejectPayment,
  uploadPaymentProof,
  getPendingPayments 
} from '@/lib/firebase-service';
import { Payment, Loan, MERCHANT_CODES } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  PlusCircle, 
  CreditCard, 
  Clock, 
  CheckCircle,
  XCircle,
  Upload,
  X,
  Eye,
  Search,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

const paymentSchema = z.object({
  loanId: z.string().min(1, 'Please select a loan'),
  amount: z.string().min(1, 'Amount is required'),
  paymentType: z.enum(['full', 'partial', 'processing_fee']),
  paymentMethod: z.enum(['mtn_momo', 'airtel_money']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PaymentsPage() {
  const { payments, setPayments, loans, setLoans, addPayment } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: 'partial',
      paymentMethod: 'mtn_momo',
    },
  });

  const watchedLoanId = watch('loanId');
  const watchedPaymentType = watch('paymentType');
  const watchedPaymentMethod = watch('paymentMethod');

  const selectedLoan = loans.find(l => l.id === watchedLoanId);

  useEffect(() => {
    async function loadData() {
      try {
        const [paymentsData, loansData] = await Promise.all([
          getPayments(),
          getLoans(),
        ]);
        setPayments(paymentsData);
        setLoans(loansData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setPayments, setLoans]);

  useEffect(() => {
    if (selectedLoan && watchedPaymentType === 'full') {
      setValue('amount', selectedLoan.outstandingBalance.toString());
    } else if (selectedLoan && watchedPaymentType === 'processing_fee') {
      setValue('amount', selectedLoan.processingFee.toString());
    }
  }, [selectedLoan, watchedPaymentType, setValue]);

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedLoan) return;
    
    setIsSubmitting(true);
    try {
      let proofImageUrl: string | undefined;
      
      if (proofImage) {
        const tempId = Date.now().toString();
        proofImageUrl = await uploadPaymentProof(proofImage, tempId);
      }

      const paymentData: Omit<Payment, 'id'> = {
        loanId: data.loanId,
        borrowerId: selectedLoan.borrowerId,
        borrowerName: selectedLoan.borrowerName,
        amount: parseInt(data.amount),
        paymentType: data.paymentType,
        transactionId: data.transactionId || undefined,
        proofImageUrl,
        paymentMethod: data.paymentMethod,
        merchantCode: MERCHANT_CODES[data.paymentMethod],
        status: 'pending',
        submittedAt: new Date(),
        notes: data.notes || undefined,
      };

      const newPayment = await createPayment(paymentData);
      addPayment(newPayment);
      toast.success('Payment submitted for approval!');
      reset();
      setProofImage(null);
      setProofPreview(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (payment: Payment) => {
    try {
      await approvePayment(
        payment.id,
        'admin', // TODO: Get actual admin ID
        'Admin User' // TODO: Get actual admin name
      );
      
      const updatedPayments = await getPayments();
      const updatedLoans = await getLoans();
      setPayments(updatedPayments);
      setLoans(updatedLoans);
      
      toast.success('Payment approved successfully!');
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await rejectPayment(
        selectedPayment.id,
        rejectReason,
        'admin', // TODO: Get actual admin ID
        'Admin User' // TODO: Get actual admin name
      );
      
      const updatedPayments = await getPayments();
      setPayments(updatedPayments);
      
      setShowRejectModal(false);
      setSelectedPayment(null);
      setRejectReason('');
      toast.success('Payment rejected');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const activeLoans = loans.filter(l => 
    ['active', 'due_soon', 'late', 'approved'].includes(l.status) && 
    l.outstandingBalance > 0
  );

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    approved: payments.filter((p) => p.status === 'approved').length,
    rejected: payments.filter((p) => p.status === 'rejected').length,
    totalApproved: payments
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'success' | 'danger'> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return variants[status] || 'default';
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1">Record and approve loan payments</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Merchant Codes Info */}
        <div className="bg-gradient-to-r from-[#0A1F44] to-[#0A1F44]/80 rounded-xl p-4 text-white">
          <h3 className="font-semibold mb-3">Payment Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-80">MTN Mobile Money</p>
              <p className="text-lg font-bold">{MERCHANT_CODES.mtn_momo}</p>
              <p className="text-xs opacity-60">Merchant Code</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-80">Airtel Money</p>
              <p className="text-lg font-bold">{MERCHANT_CODES.airtel_money}</p>
              <p className="text-xs opacity-60">Dial *185*9# → Enter code → Name: Kule Crescent</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#0A1F44]" />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#00A86B]" />
              <span className="text-sm text-gray-500">Collected</span>
            </div>
            <p className="text-lg font-bold text-[#00A86B] mt-1">{formatCurrency(stats.totalApproved)}</p>
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
                  placeholder="Search by borrower or transaction ID..."
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
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Record your first payment to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      payment.paymentMethod === 'mtn_momo' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <Phone className={`h-6 w-6 ${
                        payment.paymentMethod === 'mtn_momo' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{payment.borrowerName}</h3>
                        <Badge variant={getStatusBadge(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {payment.paymentMethod === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}
                        {payment.transactionId && ` • ${payment.transactionId}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(payment.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#0A1F44]">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {payment.paymentType.replace('_', ' ')} payment
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {payment.proofImageUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowProofModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {payment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApprove(payment)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowRejectModal(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {payment.status === 'rejected' && payment.rejectedReason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Rejection reason: {payment.rejectedReason}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Record Payment Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Record Payment"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Select Loan *"
              options={activeLoans.map((l) => ({
                value: l.id,
                label: `${l.borrowerName} - Outstanding: ${formatCurrency(l.outstandingBalance)}`,
              }))}
              placeholder="Choose a loan"
              error={errors.loanId?.message}
              {...register('loanId')}
            />

            {selectedLoan && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Principal</p>
                    <p className="font-semibold">{formatCurrency(selectedLoan.principalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Outstanding Balance</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(selectedLoan.outstandingBalance)}
                    </p>
                  </div>
                  {!selectedLoan.processingFeePaid && (
                    <div className="col-span-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Processing fee not yet paid: {formatCurrency(selectedLoan.processingFee)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Payment Type *"
                options={[
                  { value: 'partial', label: 'Partial Payment' },
                  { value: 'full', label: 'Full Payment' },
                  { value: 'processing_fee', label: 'Processing Fee' },
                ]}
                error={errors.paymentType?.message}
                {...register('paymentType')}
              />
              <Select
                label="Payment Method *"
                options={[
                  { value: 'mtn_momo', label: `MTN MoMo (${MERCHANT_CODES.mtn_momo})` },
                  { value: 'airtel_money', label: `Airtel Money (${MERCHANT_CODES.airtel_money})` },
                ]}
                error={errors.paymentMethod?.message}
                {...register('paymentMethod')}
              />
            </div>

            <Input
              label="Payment Amount (UGX) *"
              type="number"
              placeholder="Enter amount"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Input
              label="Transaction ID"
              placeholder="Enter mobile money transaction ID"
              {...register('transactionId')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Proof (Screenshot)
              </label>
              {proofPreview ? (
                <div className="relative">
                  <img
                    src={proofPreview}
                    alt="Payment Proof"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProofImage(null);
                      setProofPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0A1F44] transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Upload payment screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProofImageChange}
                  />
                </label>
              )}
            </div>

            <Textarea
              label="Notes"
              placeholder="Any additional notes..."
              rows={2}
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
                Submit Payment
              </Button>
            </div>
          </form>
        </Modal>

        {/* Proof Image Modal */}
        <Modal
          isOpen={showProofModal}
          onClose={() => setShowProofModal(false)}
          title="Payment Proof"
          size="lg"
        >
          {selectedPayment?.proofImageUrl && (
            <div>
              <img
                src={selectedPayment.proofImageUrl}
                alt="Payment Proof"
                className="w-full rounded-lg"
              />
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                <p><strong>Transaction ID:</strong> {selectedPayment.transactionId || 'N/A'}</p>
                <p><strong>Method:</strong> {selectedPayment.paymentMethod === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}</p>
                <p><strong>Submitted:</strong> {formatDateTime(selectedPayment.submittedAt)}</p>
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Payment"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Please provide a reason for rejecting this payment of{' '}
              <strong>{selectedPayment && formatCurrency(selectedPayment.amount)}</strong>.
            </p>
            <Textarea
              label="Rejection Reason *"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                className="flex-1"
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
