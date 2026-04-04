'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { getAuditLogs } from '@/lib/firebase-service';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { 
  Shield, 
  Search,
  FileText,
  CreditCard,
  User,
  PiggyBank,
  Settings,
  Activity,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  const getActionIcon = (entityType: string) => {
    const icons: Record<string, React.ReactNode> = {
      loan: <FileText className="h-4 w-4" />,
      payment: <CreditCard className="h-4 w-4" />,
      borrower: <User className="h-4 w-4" />,
      investor: <PiggyBank className="h-4 w-4" />,
      user: <User className="h-4 w-4" />,
      system: <Settings className="h-4 w-4" />,
    };
    return icons[entityType] || <Activity className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('approved') || action.includes('disbursed')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('rejected') || action.includes('deleted') || action.includes('default')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('updated') || action.includes('changed')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'all' || log.entityType === filterType;
    const matchesSearch =
      (log.action ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.performedByName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityId ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by action, user, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44] focus:border-transparent"
                />
              </div>
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'loan', label: 'Loans' },
                { value: 'payment', label: 'Payments' },
                { value: 'borrower', label: 'Borrowers' },
                { value: 'investor', label: 'Investors' },
                { value: 'user', label: 'Users' },
                { value: 'system', label: 'System' },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-500">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'System activities will appear here'}
            </p>
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      log.entityType === 'loan' ? 'bg-blue-100' :
                      log.entityType === 'payment' ? 'bg-green-100' :
                      log.entityType === 'borrower' ? 'bg-purple-100' :
                      log.entityType === 'investor' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {getActionIcon(log.entityType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="default">{log.entityType}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{log.performedByName}</span>
                        {' performed action on '}
                        <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      </p>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(log.details).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: <span className="font-medium">{String(value)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Loan Actions</p>
            <p className="text-2xl font-bold text-blue-600">
              {logs.filter((l) => l.entityType === 'loan').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Payment Actions</p>
            <p className="text-2xl font-bold text-green-600">
              {logs.filter((l) => l.entityType === 'payment').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Borrower Actions</p>
            <p className="text-2xl font-bold text-purple-600">
              {logs.filter((l) => l.entityType === 'borrower').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Investor Actions</p>
            <p className="text-2xl font-bold text-yellow-600">
              {logs.filter((l) => l.entityType === 'investor').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">System Actions</p>
            <p className="text-2xl font-bold text-gray-600">
              {logs.filter((l) => l.entityType === 'system').length}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
