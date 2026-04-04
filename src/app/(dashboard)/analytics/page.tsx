'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { getLoans, getSystemStats } from '@/lib/firebase-service';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [loans, setLoans] = useState<{ status: string; count: number }[]>([]);
  const [stats, setStats] = useState<{ totalCapitalDeployed: number; totalAmountEverRepaid: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [loansData, statsData] = await Promise.all([
          getLoans(),
          getSystemStats(),
        ]);
        const statusCounts: Record<string, number> = {};
        loansData.forEach((l) => {
          statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
        });
        setLoans(
          Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
        );
        if (statsData) {
          setStats({
            totalCapitalDeployed: statsData.totalCapitalDeployed,
            totalAmountEverRepaid: statsData.totalAmountEverRepaid,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Portfolio and performance overview.</p>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#0A1F44] flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Capital deployed</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalCapitalDeployed)}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#00A86B] flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total repaid</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalAmountEverRepaid)}
                </p>
              </div>
            </Card>
          </div>
        )}

        {loans.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Loans by status
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loans}>
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#0A1F44" name="Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {loans.length === 0 && !stats && (
          <Card className="p-8 text-center text-gray-500">
            No analytics data yet. Create loans and record payments to see trends.
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
