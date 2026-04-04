'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getPayments, approvePayment, rejectPayment } from '@/lib/firebase-service';
import { Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, Search, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [paymentToReject, setPaymentToReject] = useState<Payment | null>(null);

  const loadPayments = async () => {
    try {
      const data = await getPayments();
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleApprove = async (payment: Payment) => {
    setActioningId(payment.id);
    try {
      await approvePayment(payment.id, 'admin', 'Admin');
      toast.success('Payment approved');
      await loadPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectClick = (payment: Payment) => {
    setPaymentToReject(payment);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!paymentToReject || !rejectReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    setActioningId(paymentToReject.id);
    try {
      await rejectPayment(paymentToReject.id, rejectReason.trim(), 'admin', 'Admin');
      toast.success('Payment rejected');
      setShowRejectModal(false);
      setPaymentToReject(null);
      await loadPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActioningId(null);
    }
  };

  const filtered = payments.filter((p) => {
    const matchStatus =
      filterStatus === 'all' || p.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      (p.borrowerName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transactionId ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">View and manage payment submissions</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by borrower, transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1F44]"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">No payments found.</Card>
          ) : (
            filtered.map((p) => (
              <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-[#0A1F44]/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-[#0A1F44]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{p.borrowerName ?? '—'}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(p.amount)} · {p.paymentMethod ?? '—'} · {formatDate(p.submittedAt)}
                    </p>
                    {p.transactionId && (
                      <p className="text-xs text-gray-400">Ref: {p.transactionId}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'default'}
                  >
                    {p.status}
                  </Badge>
                  {p.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(p)}
                        disabled={actioningId === p.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectClick(p)}
                        disabled={actioningId === p.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {p.proofImageUrl && (
                    <a
                      href={p.proofImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A1F44] hover:underline text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" /> Proof
                    </a>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {showRejectModal && paymentToReject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject payment</h3>
              <p className="text-sm text-gray-500 mb-4">
                {paymentToReject.borrowerName} · {formatCurrency(paymentToReject.amount)}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0A1F44]"
                placeholder="e.g. Invalid transaction ID"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectModal(false);
                    setPaymentToReject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRejectConfirm}
                  disabled={!rejectReason.trim() || actioningId === paymentToReject.id}
                >
                  Reject
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
