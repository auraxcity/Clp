'use client';

import { Borrower } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, getRiskGradeColor } from '@/lib/utils';
import { User, Phone, MapPin, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface BorrowerCardProps {
  borrower: Borrower;
}

export function BorrowerCard({ borrower }: BorrowerCardProps) {
  const getRiskBadgeVariant = (grade: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      A: 'success',
      B: 'info',
      C: 'warning',
      D: 'danger',
      F: 'danger',
    };
    return variants[grade] || 'default';
  };

  return (
    <Link href={`/borrowers/${borrower.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#0A1F44] flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {borrower.fullName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{borrower.fullName}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Phone className="h-3 w-3" />
                {borrower.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getRiskBadgeVariant(borrower.riskGrade)}>
              Grade {borrower.riskGrade}
            </Badge>
            {borrower.isBlacklisted && (
              <Badge variant="danger">Blacklisted</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {borrower.location}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wallet className="h-4 w-4 text-gray-400" />
            {borrower.totalLoansTaken} loans
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Borrowed</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(borrower.totalAmountBorrowed)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Repaid</p>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(borrower.totalAmountRepaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-sm font-semibold text-red-600">
              {formatCurrency(borrower.currentActiveLoanBalance)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {borrower.numberOfLatePayments > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {borrower.numberOfLatePayments} late
              </div>
            )}
            {borrower.numberOfDefaults > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {borrower.numberOfDefaults} defaults
              </div>
            )}
            {borrower.numberOfLatePayments === 0 && borrower.numberOfDefaults === 0 && borrower.totalLoansTaken > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                Good standing
              </div>
            )}
          </div>
          <span className="text-gray-400">Score: {borrower.riskScore}/100</span>
        </div>
      </Card>
    </Link>
  );
}
