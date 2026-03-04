'use client';

import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Loan, Payment } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle } from 'lucide-react';

interface RecentActivityProps {
  loans: Loan[];
  payments: Payment[];
}

export function RecentActivity({ loans, payments }: RecentActivityProps) {
  const activities = [
    ...loans.slice(0, 5).map((loan) => ({
      id: loan.id,
      type: 'loan' as const,
      title: `Loan ${loan.status === 'active' ? 'disbursed' : loan.status === 'approved' ? 'approved' : 'created'}`,
      description: `${loan.borrowerName} - ${formatCurrency(loan.principalAmount)}`,
      timestamp: loan.updatedAt,
      status: loan.status,
    })),
    ...payments.slice(0, 5).map((payment) => ({
      id: payment.id,
      type: 'payment' as const,
      title: `Payment ${payment.status}`,
      description: `${payment.borrowerName} - ${formatCurrency(payment.amount)}`,
      timestamp: payment.submittedAt,
      status: payment.status,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

  const getStatusIcon = (type: string, status: string) => {
    if (type === 'payment') {
      if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-500" />;
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (status === 'active' || status === 'approved') return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (status === 'late' || status === 'default') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      approved: 'success',
      active: 'success',
      pending: 'warning',
      late: 'warning',
      default: 'danger',
      rejected: 'danger',
      closed: 'default',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-gray-100">
                {getStatusIcon(activity.type, activity.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <Badge variant={getStatusBadge(activity.status)}>
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDateTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
