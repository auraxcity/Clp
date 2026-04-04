'use client';

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface InterestTrendChartProps {
  data: { month?: string; label?: string; value?: number; interest?: number }[];
}

export function InterestTrendChart({ data }: InterestTrendChartProps) {
  const chartData =
    data.length > 0
      ? data.map((d) => ({
          name: d.month ?? d.label ?? '',
          value: d.value ?? d.interest ?? 0,
        }))
      : [];

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Interest trend</h3>
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No interest data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Interest trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1F44" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#0A1F44" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')} />
          <Tooltip formatter={(value: number | undefined) => [value != null ? formatCurrency(value) : '', 'Interest']} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0A1F44"
            fill="url(#interestGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
