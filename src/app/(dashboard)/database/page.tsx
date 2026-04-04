'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { 
  getBorrowers,
  getInvestors,
  updateBorrower,
  updateInvestor,
  createBorrower,
  createInvestor,
  getLoans,
  createLoan,
  updateLoan,
} from '@/lib/firebase-service';
import { Borrower, Investor, Loan, LoanStatus } from '@/types';
import { formatCurrency, formatDate, calculateProcessingFee, calculateDisbursementAmount } from '@/lib/utils';
import { addWeeks } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  Database,
  Users,
  PiggyBank,
  RefreshCw,
  Edit,
  Save,
  X,
  FileSpreadsheet,
  CheckCircle,
  Landmark,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

type DataRow = Record<string, string | number | null>;

function pickSheetName(sheetNames: string[], candidates: string[]): string | undefined {
  const lower = sheetNames.map((n) => n.toLowerCase().trim());
  for (const c of candidates) {
    const cl = c.toLowerCase();
    const i = lower.indexOf(cl);
    if (i >= 0) return sheetNames[i];
  }
  for (const c of candidates) {
    const cl = c.toLowerCase();
    const hit = sheetNames.find((n) => n.toLowerCase().includes(cl));
    if (hit) return hit;
  }
  return undefined;
}

function excelSerialToDate(serial: unknown): Date | null {
  if (serial === '' || serial == null) return null;
  if (serial instanceof Date && !isNaN(serial.getTime())) return serial;
  const n = typeof serial === 'number' ? serial : parseFloat(String(serial));
  if (!Number.isFinite(n) || n < 30000) return null;
  const d = new Date((n - 25569) * 86400 * 1000);
  return isNaN(d.getTime()) ? null : d;
}

function inferLoanProduct(amount: number): Loan['loanProduct'] {
  if (amount <= 500000) return 'quick_cash';
  if (amount <= 5000000) return 'business_boost';
  return 'investor_backed_premium';
}

function mapImportLoanStatus(s: unknown): LoanStatus {
  const t = String(s || '').toLowerCase().trim();
  if (!t) return 'active';
  if (t.includes('close')) return 'closed';
  if (t.includes('pending')) return 'pending';
  if (t.includes('default')) return 'default';
  if (t.includes('late')) return 'late';
  if (t.includes('reject')) return 'rejected';
  if (t.includes('approve')) return 'approved';
  return 'active';
}

export default function DatabasePage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowers' | 'investors' | 'loans' | 'import'>('borrowers');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Borrower | Investor>>({});
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editLoanData, setEditLoanData] = useState<Partial<Loan>>({});
  const [importData, setImportData] = useState<{
    borrowers: DataRow[];
    investors: DataRow[];
    loans: DataRow[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const loadData = useCallback(async (showToast = true) => {
    setIsLoading(true);
    try {
      const [borrowersData, investorsData, loansData] = await Promise.all([
        getBorrowers(),
        getInvestors(),
        getLoans(),
      ]);
      setBorrowers(borrowersData);
      setInvestors(investorsData);
      setLoans(loansData);
      if (showToast) toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const extractSheet = (sheetName: string): DataRow[] => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return [];
          return XLSX.utils.sheet_to_json(sheet) as DataRow[];
        };

        const sheetNames = workbook.SheetNames;
        console.log('Found sheets:', sheetNames);

        let borrowersSheet: DataRow[] = [];
        let investorsSheet: DataRow[] = [];
        let loansSheet: DataRow[] = [];

        const invSheet = pickSheetName(sheetNames, ['investors', 'investor']);
        const loanSheet = pickSheetName(sheetNames, ['loans', 'loan']);
        const borSheet = pickSheetName(sheetNames, ['borrowers', 'borrower', 'clients', 'customers']);

        if (borSheet) borrowersSheet = extractSheet(borSheet);
        if (invSheet) investorsSheet = extractSheet(invSheet);
        if (loanSheet) loansSheet = extractSheet(loanSheet);

        for (const name of sheetNames) {
          const lowerName = name.toLowerCase();
          if (borrowersSheet.length === 0 && (lowerName.includes('borrower') || lowerName.includes('client') || lowerName.includes('customer'))) {
            borrowersSheet = extractSheet(name);
          } else if (investorsSheet.length === 0 && lowerName.includes('investor')) {
            investorsSheet = extractSheet(name);
          } else if (loansSheet.length === 0 && lowerName.includes('loan')) {
            loansSheet = extractSheet(name);
          }
        }

        if (borrowersSheet.length === 0 && investorsSheet.length === 0) {
          const firstSheet = extractSheet(sheetNames[0]);
          if (firstSheet.length > 0) {
            const firstRow = firstSheet[0];
            const keys = Object.keys(firstRow).map(k => k.toLowerCase());
            if (keys.some(k => k.includes('phone') || k.includes('name'))) {
              borrowersSheet = firstSheet;
            }
          }
        }

        setImportData({
          borrowers: borrowersSheet,
          investors: investorsSheet,
          loans: loansSheet,
        });

        setImportLog([
          `File loaded: ${file.name}`,
          `Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`,
          `Borrowers: ${borrowersSheet.length} rows`,
          `Investors: ${investorsSheet.length} rows`,
          `Loans: ${loansSheet.length} rows`,
        ]);

        toast.success('File parsed successfully');
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleImport = async () => {
    if (!importData) return;
    
    setIsImporting(true);
    const log: string[] = [];
    
    try {
      for (const row of importData.borrowers) {
        try {
          const name = (row['Name'] || row['Full Name'] || row['name'] || row['fullName'] || '') as string;
          const phone = (row['Phone'] || row['phone'] || row['Contact'] || row['contact'] || '') as string;
          const email = (row['Email'] || row['email'] || '') as string;
          const location = (row['Location'] || row['location'] || row['Address'] || row['address'] || '') as string;
          
          if (!name || !phone) {
            log.push(`Skipped borrower: missing name or phone`);
            continue;
          }

          await createBorrower({
            userId: '',
            fullName: name.toString(),
            phone: phone.toString(),
            email: email?.toString() || undefined,
            location: location?.toString() || 'Not specified',
            riskGrade: 'C',
            riskScore: 50,
            totalLoansTaken: 0,
            totalAmountBorrowed: 0,
            totalAmountRepaid: 0,
            numberOfLatePayments: 0,
            numberOfDefaults: 0,
            currentActiveLoanBalance: 0,
            referralCode: `CLP${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            referralEarnings: 0,
            isBlacklisted: false,
          });
          log.push(`Created borrower: ${name}`);
        } catch (err) {
          log.push(`Error creating borrower: ${err}`);
        }
      }

      for (const row of importData.investors) {
        try {
          const name = (row['Investor Name'] ||
            row['Name'] ||
            row['Full Name'] ||
            row['name'] ||
            row['fullName'] ||
            '') as string;
          const phone = (row['Phone number'] ||
            row['Phone Number'] ||
            row['Phone'] ||
            row['phone'] ||
            row['Contact'] ||
            '') as string;
          const email = (row['Email'] || row['email'] || '') as string;
          const capital =
            parseFloat(
              String(row['Capital Contributed'] ?? row['Capital'] ?? row['capital'] ?? row['Amount'] ?? 0)
            ) || 0;
          const roiCol = row['10% MONTHLY ROI'];
          const roiNote =
            roiCol !== undefined && roiCol !== '' ? `Sheet: 10% MONTHLY ROI = ${String(roiCol)}` : '';

          if (!name || !phone) {
            log.push(`Skipped investor: missing name or phone`);
            continue;
          }

          await createInvestor({
            name: name.toString().trim(),
            phone: phone.toString().trim(),
            email: email?.toString() || undefined,
            capitalCommitted: capital,
            capitalDeployed: 0,
            capitalAvailable: capital,
            totalProfitEarned: 0,
            accruedInterest: 0,
            lastInterestUpdate: new Date(),
            monthlyProfitBreakdown: {},
            roi: 0,
            isActive: true,
            notes: roiNote || undefined,
          });
          log.push(`Created investor: ${name}`);
        } catch (err) {
          log.push(`Error creating investor: ${err}`);
        }
      }

      const investorsAfterImport = await getInvestors();
      let borrowerCache = await getBorrowers();

      for (const row of importData.loans) {
        try {
          const nameStr = String(row['Borrower'] || row['borrower'] || '').trim();
          if (!nameStr) {
            log.push('Skipped loan: missing borrower name');
            continue;
          }
          let phoneStr = String(row['Phone Number'] || row['Phone'] || row['phone'] || '').trim();
          if (!phoneStr) {
            phoneStr = `import-${nameStr.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 28)}`;
          }

          let borrowerId = borrowerCache.find(
            (b) =>
              b.fullName.trim().toLowerCase() === nameStr.toLowerCase() ||
              b.phone.replace(/\s/g, '') === phoneStr.replace(/\s/g, '')
          )?.id;

          if (!borrowerId) {
            const nb = await createBorrower({
              userId: '',
              fullName: nameStr,
              phone: phoneStr,
              location: 'Imported (CLP DATABASE)',
              riskGrade: 'C',
              riskScore: 50,
              totalLoansTaken: 0,
              totalAmountBorrowed: 0,
              totalAmountRepaid: 0,
              numberOfLatePayments: 0,
              numberOfDefaults: 0,
              currentActiveLoanBalance: 0,
              referralCode: `CLP${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              referralEarnings: 0,
              isBlacklisted: false,
            });
            borrowerCache = [...borrowerCache, nb];
            borrowerId = nb.id;
            log.push(`Created borrower stub for loan import: ${nameStr}`);
          }

          const principal = Number(row['Loan Amount'] ?? row['Principal'] ?? 0) || 0;
          if (principal <= 0) {
            log.push(`Skipped loan for ${nameStr}: invalid amount`);
            continue;
          }

          const interestAmount =
            Number(row['Interest (40%)'] ?? row['Interest'] ?? row['interest'] ?? 0) || 0;
          const totalPayable =
            Number(row['Total Payable'] ?? row['totalPayable'] ?? principal + interestAmount) ||
            principal + interestAmount;
          const processingFee = calculateProcessingFee(principal);
          const disbursementAmount = calculateDisbursementAmount(principal);
          const interestRate =
            principal > 0 ? Math.min(100, Math.round((interestAmount / principal) * 100)) : 40;

          const issue = excelSerialToDate(row['Issue Date']);
          const due = excelSerialToDate(row['Due Date']);
          const loanDate = issue || new Date();
          const dueDate = due || addWeeks(loanDate, 4);

          const status = mapImportLoanStatus(row['Status']);
          const outstandingBalance = status === 'closed' ? 0 : totalPayable;

          const invCell = String(row['Investor'] || '').trim();
          let invMatch: Investor | undefined;
          if (invCell) {
            invMatch = investorsAfterImport.find(
              (i) =>
                i.name.trim().toLowerCase() === invCell.toLowerCase() ||
                i.name.trim().toLowerCase().includes(invCell.toLowerCase())
            );
          }

          const fundingSource = invMatch ? ('investor_funded' as const) : ('company' as const);

          const daysLateRaw = row['Days Late'];
          let weeksLate = 0;
          if (typeof daysLateRaw === 'number' && daysLateRaw > 0) {
            weeksLate = Math.min(52, Math.floor(daysLateRaw / 7));
          }

          const riskNote = row['Risk'] != null && row['Risk'] !== '' ? `Risk: ${row['Risk']}. ` : '';
          const reminder =
            row['Reminder Message'] != null ? String(row['Reminder Message']).slice(0, 400) : '';
          const notes = `[CLP DATABASE import] ${riskNote}${reminder ? `Reminder: ${reminder}` : ''}`.trim();

          await createLoan({
            borrowerId,
            borrowerName: nameStr,
            borrowerPhone: phoneStr,
            fundingSource,
            investorId: invMatch?.id,
            investorName: invMatch?.name,
            loanProduct: inferLoanProduct(principal),
            principalAmount: principal,
            duration: 4,
            interestRate,
            currentInterestTier: 4,
            interestAmount,
            processingFee,
            processingFeePaid: status !== 'pending',
            totalPayable,
            amountDisbursed: ['active', 'closed', 'due_soon', 'late', 'default', 'approved'].includes(status)
              ? disbursementAmount
              : 0,
            disbursementAmount,
            outstandingBalance,
            loanDate,
            dueDate,
            status,
            purpose: 'Imported from CLP DATABASE (Loans sheet)',
            penaltyAmount: 0,
            weeksLate,
            defaultAlertsCount: 0,
            creditBureauReported: false,
            notes: notes || undefined,
          });
          log.push(`Imported loan: ${nameStr} — ${principal.toLocaleString()} UGX`);
        } catch (err) {
          log.push(`Loan import error: ${err}`);
        }
      }

      setImportLog(prev => [...prev, ...log, '--- Import Complete ---']);
      toast.success('Import completed');
      loadData();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportBorrowers = () => {
    const data = borrowers.map(b => ({
      'Full Name': b.fullName,
      'Phone': b.phone,
      'Email': b.email || '',
      'Location': b.location,
      'Risk Grade': b.riskGrade,
      'Risk Score': b.riskScore,
      'Total Loans': b.totalLoansTaken,
      'Amount Borrowed': b.totalAmountBorrowed,
      'Amount Repaid': b.totalAmountRepaid,
      'Late Payments': b.numberOfLatePayments,
      'Defaults': b.numberOfDefaults,
      'Active Balance': b.currentActiveLoanBalance,
      'Blacklisted': b.isBlacklisted ? 'Yes' : 'No',
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Borrowers');
    XLSX.writeFile(wb, 'CLP_Borrowers.xlsx');
    toast.success('Exported borrowers');
  };

  const handleExportInvestors = () => {
    const data = investors.map(i => ({
      'Name': i.name,
      'Phone': i.phone,
      'Email': i.email || '',
      'Capital Committed': i.capitalCommitted,
      'Capital Deployed': i.capitalDeployed,
      'Capital Available': i.capitalAvailable,
      'Total Profit': i.totalProfitEarned,
      'ROI %': i.roi,
      'Active': i.isActive ? 'Yes' : 'No',
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Investors');
    XLSX.writeFile(wb, 'CLP_Investors.xlsx');
    toast.success('Exported investors');
  };

  const handleEdit = (id: string, data: Partial<Borrower | Investor>) => {
    setEditingRow(id);
    setEditData(data);
  };

  const handleSave = async (type: 'borrower' | 'investor') => {
    if (!editingRow) return;
    
    try {
      if (type === 'borrower') {
        await updateBorrower(editingRow, editData as Partial<Borrower>);
      } else {
        await updateInvestor(editingRow, editData as Partial<Investor>);
      }
      toast.success('Saved successfully');
      setEditingRow(null);
      setEditData({});
      loadData();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleExportLoans = () => {
    const data = loans.map((l) => ({
      Borrower: l.borrowerName,
      Phone: l.borrowerPhone,
      Principal: l.principalAmount,
      Outstanding: l.outstandingBalance,
      'Total Payable': l.totalPayable,
      Status: l.status,
      Funding: l.fundingSource === 'company' ? 'Company' : l.investorId ? 'Investor' : '—',
      Investor: l.investorName || '',
      'Due Date': formatDate(l.dueDate),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'CLP_Loans.xlsx');
    toast.success('Exported loans');
  };

  const handleEditLoan = (l: Loan) => {
    setEditingLoanId(l.id);
    setEditLoanData({
      outstandingBalance: l.outstandingBalance,
      totalPayable: l.totalPayable,
      status: l.status,
    });
  };

  const handleSaveLoan = async () => {
    if (!editingLoanId) return;
    try {
      await updateLoan(editingLoanId, {
        outstandingBalance: Number(editLoanData.outstandingBalance),
        totalPayable: Number(editLoanData.totalPayable),
        status: editLoanData.status,
      });
      toast.success('Loan updated');
      setEditingLoanId(null);
      setEditLoanData({});
      loadData();
    } catch {
      toast.error('Failed to save loan');
    }
  };

  const handleCancelLoanEdit = () => {
    setEditingLoanId(null);
    setEditLoanData({});
  };

  const loanStatusOptions: LoanStatus[] = [
    'pending',
    'approved',
    'active',
    'due_soon',
    'late',
    'default',
    'closed',
    'rejected',
  ];

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
            <p className="text-gray-500 mt-1">
              Spreadsheet-style view: import CLP DATABASE (Investors + Loans sheets), edit inline, export — new activity syncs from the app automatically.
            </p>
          </div>
          <Button onClick={() => void loadData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Load Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Borrowers</p>
                <p className="text-2xl font-bold text-gray-900">{borrowers.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-[#0A1F44]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Investors</p>
                <p className="text-2xl font-bold text-gray-900">{investors.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Loans</p>
                <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{borrowers.length + investors.length + loans.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['borrowers', 'investors', 'loans', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#0A1F44] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'borrowers' && <Users className="h-4 w-4 inline mr-2" />}
              {tab === 'investors' && <PiggyBank className="h-4 w-4 inline mr-2" />}
              {tab === 'loans' && <Landmark className="h-4 w-4 inline mr-2" />}
              {tab === 'import' && <Upload className="h-4 w-4 inline mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'import' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import from Excel</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Upload an Excel file (.xlsx, .xls) containing borrowers and investors data
                </p>
                <label className="inline-flex">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {importData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500">Borrowers to import</p>
                      <p className="text-xl font-bold text-blue-600">{importData.borrowers.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500">Investors to import</p>
                      <p className="text-xl font-bold text-[#D4AF37]">{importData.investors.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500">Loans to import</p>
                      <p className="text-xl font-bold text-green-600">{importData.loans.length}</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleImport} 
                    className="mt-4 w-full"
                    disabled={isImporting}
                    isLoading={isImporting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import Data to Firebase
                  </Button>
                </div>
              )}

              {importLog.length > 0 && (
                <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                  {importLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'borrowers' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Borrowers Database</h2>
              <Button variant="outline" onClick={handleExportBorrowers}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            
            {borrowers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No borrowers found. Click &quot;Load Data&quot; to fetch from Firebase.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Location</th>
                      <th className="text-left py-2 px-3">Grade</th>
                      <th className="text-left py-2 px-3">Loans</th>
                      <th className="text-left py-2 px-3">Balance</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowers.slice(0, 50).map((b) => (
                      <tr key={b.id} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          {editingRow === b.id ? (
                            <Input
                              value={(editData as Partial<Borrower>).fullName || b.fullName}
                              onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            b.fullName
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {editingRow === b.id ? (
                            <Input
                              value={(editData as Partial<Borrower>).phone || b.phone}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            b.phone
                          )}
                        </td>
                        <td className="py-2 px-3">{b.email || '-'}</td>
                        <td className="py-2 px-3">{b.location}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            b.riskGrade === 'A' ? 'bg-green-100 text-green-700' :
                            b.riskGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                            b.riskGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                            b.riskGrade === 'D' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {b.riskGrade}
                          </span>
                        </td>
                        <td className="py-2 px-3">{b.totalLoansTaken}</td>
                        <td className="py-2 px-3">{formatCurrency(b.currentActiveLoanBalance)}</td>
                        <td className="py-2 px-3">
                          {editingRow === b.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSave('borrower')}
                                className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(b.id, { fullName: b.fullName, phone: b.phone })}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4 text-gray-500" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {borrowers.length > 50 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Showing 50 of {borrowers.length} records
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'investors' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Investors Database</h2>
              <Button variant="outline" onClick={handleExportInvestors}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            
            {investors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No investors found. Click &quot;Load Data&quot; to fetch from Firebase.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Committed</th>
                      <th className="text-left py-2 px-3">Deployed</th>
                      <th className="text-left py-2 px-3">Available</th>
                      <th className="text-left py-2 px-3">Profit</th>
                      <th className="text-left py-2 px-3">ROI</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((i) => (
                      <tr key={i.id} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          {editingRow === i.id ? (
                            <Input
                              value={(editData as Partial<Investor>).name || i.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            i.name
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {editingRow === i.id ? (
                            <Input
                              value={(editData as Partial<Investor>).phone || i.phone}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            i.phone
                          )}
                        </td>
                        <td className="py-2 px-3">{i.email || '-'}</td>
                        <td className="py-2 px-3">{formatCurrency(i.capitalCommitted)}</td>
                        <td className="py-2 px-3">{formatCurrency(i.capitalDeployed)}</td>
                        <td className="py-2 px-3 text-green-600 font-medium">
                          {formatCurrency(i.capitalAvailable)}
                        </td>
                        <td className="py-2 px-3 text-[#00A86B] font-medium">
                          {formatCurrency(i.totalProfitEarned)}
                        </td>
                        <td className="py-2 px-3">{i.roi.toFixed(2)}%</td>
                        <td className="py-2 px-3">
                          {editingRow === i.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSave('investor')}
                                className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(i.id, { name: i.name, phone: i.phone })}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4 text-gray-500" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'loans' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Loans register</h2>
              <Button variant="outline" onClick={handleExportLoans}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No loans yet. Use Import with <span className="font-mono text-xs">CLP DATABASE.xlsx</span> (Loans sheet) or create loans in the app.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm min-w-[960px]">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2">Borrower</th>
                      <th className="text-left py-2 px-2">Phone</th>
                      <th className="text-right py-2 px-2">Principal</th>
                      <th className="text-right py-2 px-2">Outstanding</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Funding</th>
                      <th className="text-left py-2 px-2">Due</th>
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.slice(0, 200).map((l) => (
                      <tr key={l.id} className="border-b border-gray-100 hover:bg-white">
                        <td className="py-2 px-2 font-medium text-gray-900">{l.borrowerName}</td>
                        <td className="py-2 px-2 text-gray-600">{l.borrowerPhone}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(l.principalAmount)}</td>
                        <td className="py-2 px-2 text-right">
                          {editingLoanId === l.id ? (
                            <Input
                              type="number"
                              className="h-8 text-right"
                              value={String(editLoanData.outstandingBalance ?? '')}
                              onChange={(e) =>
                                setEditLoanData({
                                  ...editLoanData,
                                  outstandingBalance: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            formatCurrency(l.outstandingBalance)
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {editingLoanId === l.id ? (
                            <select
                              className="h-8 w-full rounded border border-gray-300 text-sm"
                              value={editLoanData.status || l.status}
                              onChange={(e) =>
                                setEditLoanData({
                                  ...editLoanData,
                                  status: e.target.value as LoanStatus,
                                })
                              }
                            >
                              {loanStatusOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="capitalize">{l.status.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {l.fundingSource === 'company'
                            ? 'Company'
                            : l.investorName || l.investorId
                              ? `Investor: ${l.investorName || (l.investorId ? l.investorId.slice(0, 8) : '')}`
                              : '—'}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{formatDate(l.dueDate)}</td>
                        <td className="py-2 px-2">
                          {editingLoanId === l.id ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveLoan()}
                                className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelLoanEdit}
                                className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditLoan(l)}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4 text-gray-500" />
                              </button>
                              <Link
                                href={`/loans/${l.id}`}
                                className="p-1 rounded hover:bg-gray-100 inline-flex"
                                title="Open loan"
                              >
                                <ExternalLink className="h-4 w-4 text-[#0A1F44]" />
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loans.length > 200 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Showing 200 of {loans.length} — filter in Loans page for more.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
