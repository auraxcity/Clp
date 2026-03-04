'use client';

import { Loan } from '@/types';
import { formatCurrency, formatDate, getDaysUntilDue, getLoanStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

interface DueLoansTableProps {
  loans: Loan[];
  title: string;
  emptyMessage: string;
}

export function DueLoansTable({ loans, title, emptyMessage }: DueLoansTableProps) {
  const getUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'text-red-600';
    if (daysUntilDue <= 1) return 'text-orange-600';
    if (daysUntilDue <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">{loans.length} loans</span>
      </div>

      {loans.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const daysUntilDue = getDaysUntilDue(new Date(loan.dueDate));
                return (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Link 
                        href={`/borrowers/${loan.borrowerId}`}
                        className="font-medium text-[#0A1F44] hover:underline"
                      >
                        {loan.borrowerName}
                      </Link>
                      <p className="text-xs text-gray-500">{loan.borrowerPhone}</p>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.principalAmount)}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      {formatCurrency(loan.outstandingBalance)}
                    </TableCell>
                    <TableCell>{formatDate(loan.dueDate)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLoanStatusColor(loan.status)}`}>
                        {loan.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${getUrgencyColor(daysUntilDue)}`}>
                        {daysUntilDue < 0 && <AlertTriangle className="h-4 w-4" />}
                        <span className="text-sm font-medium">
                          {daysUntilDue < 0 
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0 
                              ? 'Due today'
                              : `${daysUntilDue} days`
                          }
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
