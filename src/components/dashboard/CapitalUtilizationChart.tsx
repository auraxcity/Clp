'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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
  const total = deployed + available + reserve;
  
  const data = [
    { name: 'Deployed', value: deployed, percentage: total > 0 ? (deployed / total) * 100 : 0, color: '#0A1F44' },
    { name: 'Available', value: available, percentage: total > 0 ? (available / total) * 100 : 0, color: '#00A86B' },
    { name: 'Reserve', value: reserve, percentage: total > 0 ? (reserve / total) * 100 : 0, color: '#D4AF37' },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Capital Utilization</h3>
      
      {total === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-gray-500">No capital data available</p>
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [`UGX ${value.toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            {data.map((item) => (
              <div key={item.name} className="text-center">
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-gray-500">{item.name}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
