'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Toaster } from 'react-hot-toast';
import { getAuthInstance } from '@/lib/firebase';
import { getUserById } from '@/lib/firebase-service';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { sidebarOpen, setUser } = useStore();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        router.replace('/login');
        return;
      }
      try {
        const userData = await getUserById(fbUser.uid);
        if (!userData) {
          setUser(null);
          router.replace('/login');
          return;
        }
        if (userData.role === 'super_admin' || userData.role === 'admin') {
          setUser(userData);
          setSessionReady(true);
          return;
        }
        if (userData.role === 'investor') {
          router.replace('/investor/dashboard');
          return;
        }
        router.replace('/user/dashboard');
      } catch {
        setUser(null);
        router.replace('/login');
      }
    });
    return () => unsub();
  }, [router, setUser]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
