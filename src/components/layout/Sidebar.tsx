'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import toast from 'react-hot-toast';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Banknote,
  AlertTriangle,
  Database,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Borrowers', href: '/borrowers', icon: Users },
  { name: 'Loans', href: '/loans', icon: Wallet },
  { name: 'Investors', href: '/investors', icon: PiggyBank },
  { name: 'Investments', href: '/investments', icon: Banknote },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Defaulted Loans', href: '/defaulted-loans', icon: AlertTriangle },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Risk Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Audit Logs', href: '/audit-logs', icon: Shield },
];

const adminNavigation = [
  { name: 'Admin Management', href: '/admin-management', icon: UserCog, superAdminOnly: true },
  { name: 'Database', href: '/database', icon: Database, superAdminOnly: false },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, user, setUser } = useStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const handleLogout = async () => {
    try {
      await signOut(getAuthInstance());
      setUser(null);
      toast.success('Logged out');
      router.push('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#0A1F44] text-white transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#0A1F44] font-bold text-lg">CLP</span>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">CLP</h1>
                <p className="text-xs text-gray-400">Admin Portal</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center mx-auto">
              <span className="text-[#0A1F44] font-bold text-lg">C</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
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
          </div>

          {sidebarOpen && (
            <div className="pt-4 mt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Administration
              </p>
            </div>
          )}

          <div className="space-y-1">
            {adminNavigation.map((item) => {
              if (item.superAdminOnly && !isSuperAdmin) return null;
              
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
          </div>
        </nav>

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

        <div className="border-t border-white/10 p-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                isSuperAdmin ? 'bg-purple-600' : 'bg-[#00A86B]'
              )}>
                <span className="text-white font-semibold">
                  {user?.fullName?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                isSuperAdmin ? 'bg-purple-600' : 'bg-[#00A86B]'
              )}>
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
