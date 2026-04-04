'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string | number;
  icon?: ReactNode;
  iconBgColor?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-[#0A1F44]',
  isLoading = false,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start gap-4">
      {icon && (
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgColor}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {title}
        </p>
        {isLoading ? (
          <div className="mt-2 space-y-2">
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
            {subtitle !== undefined && (
              <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
            )}
          </div>
        ) : (
          <>
            <p className="mt-2 text-2xl font-bold text-gray-900 truncate">
              {value}
            </p>
            {subtitle !== undefined && (
              <p className="mt-1 text-xs text-gray-500">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

