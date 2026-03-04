'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { 
  getLoans, 
  getPayments, 
  getInvestors, 
  getBorrowers,
  generateMonthlyReport,
  getMonthlyReports 
} from '@/lib/firebase-service';
import { calculateProfitSplit, formatCurrency } from '@/lib/utils';
import { MonthlyReport } from '@/types';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign,
  PiggyBank,
  Shield,
  AlertTriangle,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { loans, setLoans, payments, setPayments, investors, setInvestors, borrowers, setBorrowers } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [loansData, paymentsData, investorsData, borrowersData, reportsData] = await Promise.all([
          getLoans(),
          getPayments(),
          getInvestors(),
          getBorrowers(),
          getMonthlyReports(),
        ]);
        setLoans(loansData);
        setPayments(paymentsData);
        setInvestors(investorsData);
        setBorrowers(borrowersData);
        setReports(reportsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setLoans, setPayments, setInvestors, setBorrowers]);

  const calculateCurrentStats = () => {
    const monthKey = selectedMonth;
    
    const monthLoans = loans.filter((l) => 
      new Date(l.createdAt).toISOString().slice(0, 7) === monthKey
    );
    
    const monthPayments = payments.filter((p) => 
      p.status === 'approved' && 
      new Date(p.submittedAt).toISOString().slice(0, 7) === monthKey
    );
    
    const closedLoans = loans.filter((l) => 
      l.status === 'closed' && 
      l.closedAt && 
      new Date(l.closedAt).toISOString().slice(0, 7) === monthKey
    );
    
    const defaultedLoans = loans.filter((l) => 
      l.status === 'default'
    );
    
    const activeLoans = loans.filter((l) => 
      ['active', 'due_soon', 'late'].includes(l.status)
    );
    
    const lateLoans = loans.filter((l) => l.status === 'late');
    
    const totalCapitalDeployed = investors.reduce((sum, i) => sum + i.capitalDeployed, 0);
    const totalInterestGenerated = closedLoans.reduce((sum, l) => sum + l.interestAmount, 0);
    
    const { investorProfit, clpGross, reserveAllocation, clpNet } = calculateProfitSplit(totalInterestGenerated);
    
    return {
      totalCapitalDeployed,
      totalInterestGenerated,
      investorTotalPayout: investorProfit,
      clpGrossRetained: clpGross,
      reserveAllocation,
      netClpEarnings: clpNet,
      totalDefaults: defaultedLoans.length,
      totalDefaultAmount: defaultedLoans.reduce((sum, l) => sum + l.outstandingBalance, 0),
      totalRecoveries: 0,
      totalRecoveryAmount: 0,
      totalLoansIssued: monthLoans.length,
      totalLoansClosed: closedLoans.length,
      newBorrowers: borrowers.filter((b) => 
        new Date(b.createdAt).toISOString().slice(0, 7) === monthKey
      ).length,
      activeLoansCount: activeLoans.length,
      lateLoansCount: lateLoans.length,
      defaultLoansCount: defaultedLoans.length,
      totalRepaid: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  };

  const stats = calculateCurrentStats();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const report = await generateMonthlyReport(month, parseInt(year));
      setReports([report, ...reports]);
      setCurrentReport(report);
      toast.success('Monthly report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(20);
    doc.setTextColor(10, 31, 68);
    doc.text('CLP - Monthly Financial Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Report Period: ${selectedMonth}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 36, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(10, 31, 68);
    doc.text('Financial Summary', 14, 50);
    
    const financialData = [
      ['Total Capital Deployed', formatCurrency(stats.totalCapitalDeployed)],
      ['Total Interest Generated', formatCurrency(stats.totalInterestGenerated)],
      ['Investor Payout (10%)', formatCurrency(stats.investorTotalPayout)],
      ['CLP Gross Retained (30%)', formatCurrency(stats.clpGrossRetained)],
      ['Reserve Allocation (20%)', formatCurrency(stats.reserveAllocation)],
      ['Net CLP Earnings', formatCurrency(stats.netClpEarnings)],
    ];
    
    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Amount']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: [10, 31, 68] },
    });
    
    const loanData = [
      ['Loans Issued This Month', stats.totalLoansIssued.toString()],
      ['Loans Closed This Month', stats.totalLoansClosed.toString()],
      ['Active Loans', stats.activeLoansCount.toString()],
      ['Late Loans', stats.lateLoansCount.toString()],
      ['Default Loans', stats.defaultLoansCount.toString()],
      ['Total Defaults Amount', formatCurrency(stats.totalDefaultAmount)],
    ];
    
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    
    doc.setFontSize(14);
    doc.text('Loan Statistics', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Metric', 'Value']],
      body: loanData,
      theme: 'striped',
      headStyles: { fillColor: [0, 168, 107] },
    });
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('CLP - Creso\'s Loan Plug | Fast. Structured. Reliable.', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    
    doc.save(`CLP_Report_${selectedMonth}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const exportToExcel = () => {
    const financialSheet = [
      ['CLP Monthly Financial Report'],
      [`Report Period: ${selectedMonth}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['Financial Summary'],
      ['Metric', 'Amount (UGX)'],
      ['Total Capital Deployed', stats.totalCapitalDeployed],
      ['Total Interest Generated', stats.totalInterestGenerated],
      ['Investor Payout (10%)', stats.investorTotalPayout],
      ['CLP Gross Retained (30%)', stats.clpGrossRetained],
      ['Reserve Allocation (20%)', stats.reserveAllocation],
      ['Net CLP Earnings', stats.netClpEarnings],
      [],
      ['Loan Statistics'],
      ['Metric', 'Value'],
      ['Loans Issued This Month', stats.totalLoansIssued],
      ['Loans Closed This Month', stats.totalLoansClosed],
      ['Active Loans', stats.activeLoansCount],
      ['Late Loans', stats.lateLoansCount],
      ['Default Loans', stats.defaultLoansCount],
      ['Total Default Amount', stats.totalDefaultAmount],
      ['New Borrowers', stats.newBorrowers],
      ['Total Repaid', stats.totalRepaid],
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(financialSheet);
    
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');
    
    const loansSheet = loans.map(l => ({
      'Borrower': l.borrowerName,
      'Phone': l.borrowerPhone,
      'Principal': l.principalAmount,
      'Interest': l.interestAmount,
      'Total Payable': l.totalPayable,
      'Outstanding': l.outstandingBalance,
      'Status': l.status,
      'Loan Date': new Date(l.loanDate).toLocaleDateString(),
      'Due Date': new Date(l.dueDate).toLocaleDateString(),
      'Investor': l.investorName || 'N/A',
    }));
    
    const wsLoans = XLSX.utils.json_to_sheet(loansSheet);
    XLSX.utils.book_append_sheet(wb, wsLoans, 'Loans');
    
    const investorsSheet = investors.map(i => ({
      'Name': i.name,
      'Phone': i.phone,
      'Capital Committed': i.capitalCommitted,
      'Capital Deployed': i.capitalDeployed,
      'Capital Available': i.capitalAvailable,
      'Total Profit': i.totalProfitEarned,
      'ROI %': i.roi,
      'Status': i.isActive ? 'Active' : 'Inactive',
    }));
    
    const wsInvestors = XLSX.utils.json_to_sheet(investorsSheet);
    XLSX.utils.book_append_sheet(wb, wsInvestors, 'Investors');
    
    XLSX.writeFile(wb, `CLP_Report_${selectedMonth}.xlsx`);
    toast.success('Excel exported successfully!');
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
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
            <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500 mt-1">Generate and export monthly financial summaries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Report Period:</span>
            </div>
            <Select
              options={getMonthOptions()}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button 
              variant="outline" 
              onClick={handleGenerateReport}
              isLoading={isGenerating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-[#0A1F44] to-[#0A1F44]/80">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/70">Total Capital Deployed</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalCapitalDeployed)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#00A86B] to-[#00A86B]/80">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/70">Interest Generated</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalInterestGenerated)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#D4AF37] to-[#D4AF37]/80">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10">
                <PiggyBank className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/70">Investor Payout (10%)</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.investorTotalPayout)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit Breakdown */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-[#D4AF37]" />
                  <span className="text-sm text-gray-600">Investor Share (10%)</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(stats.investorTotalPayout)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-[#0A1F44]" />
                  <span className="text-sm text-gray-600">CLP Gross (30%)</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(stats.clpGrossRetained)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">Reserve Fund (20% of CLP)</span>
                </div>
                <span className="font-semibold text-blue-700">
                  {formatCurrency(stats.reserveAllocation)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Net CLP Earnings</span>
                </div>
                <span className="font-bold text-green-700">
                  {formatCurrency(stats.netClpEarnings)}
                </span>
              </div>
            </div>
          </Card>

          {/* Loan Statistics */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Statistics</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Loans Issued</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalLoansIssued}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Loans Closed</p>
                  <p className="text-xl font-bold text-green-600">{stats.totalLoansClosed}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Active Loans</p>
                  <p className="text-xl font-bold text-blue-600">{stats.activeLoansCount}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">New Borrowers</p>
                  <p className="text-xl font-bold text-purple-600">{stats.newBorrowers}</p>
                </div>
              </div>
              
              {(stats.lateLoansCount > 0 || stats.defaultLoansCount > 0) && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Risk Alert</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-red-600">Late Loans</p>
                      <p className="text-lg font-bold text-red-700">{stats.lateLoansCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600">Defaults</p>
                      <p className="text-lg font-bold text-red-700">{stats.defaultLoansCount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 mt-2">
                    Default Value: {formatCurrency(stats.totalDefaultAmount)}
                  </p>
                </div>
              )}

              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600">Total Repaid This Month</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(stats.totalRepaid)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Historical Reports */}
        {reports.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Reports</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capital Deployed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Earnings</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Defaults</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.slice(0, 6).map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {new Date(`${report.year}-${report.month}-01`).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(report.totalCapitalDeployed)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {formatCurrency(report.totalInterestGenerated)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-[#0A1F44]">
                        {formatCurrency(report.netClpEarnings)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {report.totalDefaults}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
