'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  LayoutDashboard,
  Users,
  Wallet,
  PiggyBank,
  CreditCard,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Borrowers', href: '/borrowers', icon: Users },
  { name: 'Loans', href: '/loans', icon: Wallet },
  { name: 'Investors', href: '/investors', icon: PiggyBank },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Risk Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Audit Logs', href: '/audit-logs', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, user } = useStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#0A1F44] text-white transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#0A1F44] font-bold text-lg">CLP</span>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">CLP</h1>
                <p className="text-xs text-gray-400">Creso&apos;s Loan Plug</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center mx-auto">
              <span className="text-[#0A1F44] font-bold text-lg">C</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-[#00A86B] text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-[#0A1F44] border-2 border-white/20 flex items-center justify-center hover:bg-[#00A86B] transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* User Section */}
        <div className="border-t border-white/10 p-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#00A86B] flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.fullName?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role || 'Super Admin'}
                </p>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <LogOut className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-full bg-[#00A86B] flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.fullName?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
