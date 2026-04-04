'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  getDefaultedLoans, 
  updateLoanStatuses,
  getBorrower,
} from '@/lib/firebase-service';
import { Loan, Borrower } from '@/types';
import { formatCurrency, formatDate, getEscalatedInterestRate } from '@/lib/utils';
import {
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Shield,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function DefaultedLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowerDetails, setBorrowerDetails] = useState<Record<string, Borrower>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loansData = await getDefaultedLoans();
      setLoans(loansData);
      
      const borrowerIds = [...new Set(loansData.map(l => l.borrowerId))];
      const borrowerPromises = borrowerIds.map(id => getBorrower(id));
      const borrowers = await Promise.all(borrowerPromises);
      
      const borrowerMap: Record<string, Borrower> = {};
      borrowers.forEach((b, i) => {
        if (b) borrowerMap[borrowerIds[i]] = b;
      });
      setBorrowerDetails(borrowerMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatuses = async () => {
    setIsProcessing(true);
    try {
      await updateLoanStatuses();
      toast.success('Loan statuses updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update statuses');
    } finally {
      setIsProcessing(false);
    }
  };

  const lateLoans = loans.filter(l => l.status === 'late');
  const defaultLoans = loans.filter(l => l.status === 'default');
  const creditBureauLoans = loans.filter(l => l.creditBureauReported);
  
  const totalLateValue = lateLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalDefaultValue = defaultLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

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
            <h1 className="text-2xl font-bold text-gray-900">Defaulted Loans</h1>
            <p className="text-gray-500 mt-1">Monitor and manage overdue and defaulted loans</p>
          </div>
          <Button 
            onClick={handleUpdateStatuses}
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            Update Statuses
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Late Loans</p>
                <p className="text-2xl font-bold text-yellow-600">{lateLoans.length}</p>
                <p className="text-xs text-gray-400">{formatCurrency(totalLateValue)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Defaulted Loans</p>
                <p className="text-2xl font-bold text-red-600">{defaultLoans.length}</p>
                <p className="text-xs text-gray-400">{formatCurrency(totalDefaultValue)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit Bureau Reported</p>
                <p className="text-2xl font-bold text-purple-600">{creditBureauLoans.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total At Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalLateValue + totalDefaultValue)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loans Requiring Attention</h2>
          
          {loans.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No defaulted or late loans</p>
              <p className="text-gray-400 text-sm">All loans are in good standing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => {
                const borrower = borrowerDetails[loan.borrowerId];
                const escalatedRate = getEscalatedInterestRate(loan.weeksLate, loan.duration);
                
                return (
                  <div
                    key={loan.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      loan.status === 'default' 
                        ? 'bg-red-50 border-l-red-500' 
                        : 'bg-yellow-50 border-l-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900">{loan.borrowerName}</p>
                          <Badge className={
                            loan.status === 'default' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }>
                            {loan.status === 'default' ? 'DEFAULT' : `${loan.weeksLate} week(s) late`}
                          </Badge>
                          {loan.creditBureauReported && (
                            <Badge className="bg-purple-100 text-purple-700">
                              <Shield className="h-3 w-3 mr-1" />
                              Credit Bureau
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Outstanding</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(loan.outstandingBalance)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Original Amount</p>
                            <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-medium">{formatDate(loan.dueDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Current Rate</p>
                            <p className="font-medium text-red-600">{escalatedRate}%</p>
                          </div>
                        </div>

                        {loan.penaltyAmount > 0 && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                            <p className="text-red-700">
                              Penalty: {formatCurrency(loan.penaltyAmount)} ({loan.weeksLate} weeks × 10%)
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <a 
                            href={`tel:${loan.borrowerPhone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            {loan.borrowerPhone}
                          </a>
                          {borrower?.email && (
                            <a 
                              href={`mailto:${borrower.email}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {borrower.email}
                            </a>
                          )}
                        </div>

                        {loan.defaultAlertsCount > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {loan.defaultAlertsCount} alert(s) sent
                            {loan.lastDefaultAlertDate && ` (last: ${formatDate(loan.lastDefaultAlertDate)})`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Link href={`/loans/${loan.id}`}>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/borrowers/${loan.borrowerId}`}>
                          <Button size="sm" variant="outline">
                            View Borrower
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Default Escalation Policy</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• <strong>Week 1 late:</strong> Interest escalates, SMS alert sent</li>
                <li>• <strong>Week 2 late:</strong> Interest escalates to 25%, SMS + Email alert</li>
                <li>• <strong>Week 3 late:</strong> Interest escalates to 35%, SMS + Email alert</li>
                <li>• <strong>Week 4+ late:</strong> Interest escalates to 45%, reported to Credit Bureau</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
