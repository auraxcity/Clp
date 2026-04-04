'use client';

import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CapitalUtilizationChartProps {
  deployed: number;
  available: number;
  reserve: number;
}

export function CapitalUtilizationChart({
  deployed,
  available,
  reserve,
}: CapitalUtilizationChartProps) {
  const data = [
    { name: 'Deployed', value: deployed, fill: '#00A86B' },
    { name: 'Available', value: available, fill: '#D4AF37' },
    { name: 'Reserve', value: reserve, fill: '#0A1F44' },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Capital utilization</h3>
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No capital data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Capital utilization</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number | undefined) => [value != null ? formatCurrency(value) : '', '']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
