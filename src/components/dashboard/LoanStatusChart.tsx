'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface LoanStatusChartProps {
  activeLoans: number;
  lateLoans: number;
  defaultLoans: number;
  closedLoans: number;
}

const COLORS = {
  active: '#00A86B',
  late: '#EAB308',
  default: '#1F2937',
  closed: '#6B7280',
};

export function LoanStatusChart({
  activeLoans,
  lateLoans,
  defaultLoans,
  closedLoans,
}: LoanStatusChartProps) {
  const data = [
    { name: 'Active', value: activeLoans, color: COLORS.active },
    { name: 'Late', value: lateLoans, color: COLORS.late },
    { name: 'Default', value: defaultLoans, color: COLORS.default },
    { name: 'Closed', value: closedLoans, color: COLORS.closed },
  ].filter(item => item.value > 0);

  const total = activeLoans + lateLoans + defaultLoans + closedLoans;

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Status Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No loan data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Status Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Loans']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00A86B]" />
          <span className="text-sm text-gray-600">Active: {activeLoans}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm text-gray-600">Late: {lateLoans}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-800" />
          <span className="text-sm text-gray-600">Default: {defaultLoans}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-sm text-gray-600">Closed: {closedLoans}</span>
        </div>
      </div>
    </div>
  );
}
