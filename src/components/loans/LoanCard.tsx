'use client';

import { Loan, LOAN_PRODUCTS } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getDaysUntilDue, getLoanStatusColor } from '@/lib/utils';
import { Calendar, User, Wallet, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LoanCardProps {
  loan: Loan;
  onApprove?: (loan: Loan) => void;
  onDisburse?: (loan: Loan) => void;
  showActions?: boolean;
}

export function LoanCard({ loan, onApprove, onDisburse, showActions = false }: LoanCardProps) {
  const daysUntilDue = getDaysUntilDue(new Date(loan.dueDate));
  const product = LOAN_PRODUCTS[loan.loanProduct];

  const getStatusBadge = () => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'dark'> = {
      pending: 'warning',
      approved: 'info',
      active: 'success',
      due_soon: 'warning',
      late: 'danger',
      default: 'dark',
      closed: 'default',
      rejected: 'danger',
    };
    return variants[loan.status] || 'default';
  };

  const getUrgencyIndicator = () => {
    if (loan.status === 'closed') return null;
    if (daysUntilDue < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">{Math.abs(daysUntilDue)} days overdue</span>
        </div>
      );
    }
    if (daysUntilDue <= 3) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days left`}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLoanStatusColor(loan.status)}`}>
              {loan.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">
              {product?.name || loan.loanProduct}
            </span>
          </div>
          <Link href={`/loans/${loan.id}`}>
            <h3 className="font-semibold text-gray-900 hover:text-[#0A1F44] transition-colors">
              {loan.borrowerName}
            </h3>
          </Link>
          <p className="text-sm text-gray-500">{loan.borrowerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#0A1F44]">
            {formatCurrency(loan.principalAmount)}
          </p>
          <p className="text-xs text-gray-500">Principal</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 py-3 border-y border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Interest</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(loan.interestAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Payable</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(loan.totalPayable)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className={`text-sm font-semibold ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(loan.outstandingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Due: {formatDate(loan.dueDate)}
          </div>
          {loan.investorName && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {loan.investorName}
            </div>
          )}
        </div>
        {getUrgencyIndicator()}
      </div>

      {loan.penaltyAmount > 0 && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Penalty: {formatCurrency(loan.penaltyAmount)} ({loan.weeksLate} weeks late)
          </p>
        </div>
      )}

      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          {loan.status === 'pending' && onApprove && (
            <Button size="sm" variant="secondary" onClick={() => onApprove(loan)} className="flex-1">
              Approve Loan
            </Button>
          )}
          {loan.status === 'approved' && onDisburse && (
            <Button size="sm" variant="primary" onClick={() => onDisburse(loan)} className="flex-1">
              Disburse Loan
            </Button>
          )}
          <Link href={`/loans/${loan.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full">
              View Details
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
