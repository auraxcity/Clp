'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#00A86B', '#f59e0b', '#ef4444', '#6b7280'];

interface LoanStatusChartProps {
  activeLoans: number;
  lateLoans: number;
  defaultLoans: number;
  closedLoans: number;
}

export function LoanStatusChart({
  activeLoans,
  lateLoans,
  defaultLoans,
  closedLoans,
}: LoanStatusChartProps) {
  const data = [
    { name: 'Active', value: activeLoans, fill: COLORS[0] },
    { name: 'Late', value: lateLoans, fill: COLORS[1] },
    { name: 'Default', value: defaultLoans, fill: COLORS[2] },
    { name: 'Closed', value: closedLoans, fill: COLORS[3] },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Loan status</h3>
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No loan data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Loan status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={data[i].fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | undefined) => [value ?? 0, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
