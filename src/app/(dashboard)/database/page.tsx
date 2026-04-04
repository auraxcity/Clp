'use client';

import { useState, useCallback } from 'react';
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
} from '@/lib/firebase-service';
import { Borrower, Investor } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  AlertCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type DataRow = Record<string, string | number | null>;

export default function DatabasePage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrowers' | 'investors' | 'import'>('borrowers');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Borrower | Investor>>({});
  const [importData, setImportData] = useState<{
    borrowers: DataRow[];
    investors: DataRow[];
    loans: DataRow[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [borrowersData, investorsData] = await Promise.all([
        getBorrowers(),
        getInvestors(),
      ]);
      setBorrowers(borrowersData);
      setInvestors(investorsData);
      toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

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

        for (const name of sheetNames) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('borrower') || lowerName.includes('client') || lowerName.includes('customer')) {
            borrowersSheet = extractSheet(name);
          } else if (lowerName.includes('investor')) {
            investorsSheet = extractSheet(name);
          } else if (lowerName.includes('loan')) {
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
            referralCode: '',
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
          const name = (row['Name'] || row['Full Name'] || row['name'] || row['fullName'] || '') as string;
          const phone = (row['Phone'] || row['phone'] || row['Contact'] || row['contact'] || '') as string;
          const email = (row['Email'] || row['email'] || '') as string;
          const capital = parseFloat((row['Capital'] || row['capital'] || row['Amount'] || row['amount'] || '0') as string) || 0;
          
          if (!name || !phone) {
            log.push(`Skipped investor: missing name or phone`);
            continue;
          }

          await createInvestor({
            name: name.toString(),
            phone: phone.toString(),
            email: email?.toString() || undefined,
            capitalCommitted: capital,
            capitalDeployed: 0,
            capitalAvailable: capital,
            totalProfitEarned: 0,
            accruedInterest: 0,
            monthlyProfitBreakdown: {},
            roi: 0,
            isActive: true,
          });
          log.push(`Created investor: ${name}`);
        } catch (err) {
          log.push(`Error creating investor: ${err}`);
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

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
            <p className="text-gray-500 mt-1">Import, export, and manage borrowers and investors data</p>
          </div>
          <Button onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Load Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{borrowers.length + investors.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-2">
          {(['borrowers', 'investors', 'import'] as const).map((tab) => (
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
      </div>
    </DashboardLayout>
  );
}
