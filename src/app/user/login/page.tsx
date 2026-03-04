'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { Wallet, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuthInstance();
      const db = getDb();
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'super_admin' || userData.role === 'admin') {
          toast.success('Welcome back, Admin!');
          router.push('/dashboard');
        } else {
          toast.success('Login successful!');
          router.push('/user/dashboard');
        }
      } else {
        toast.success('Login successful!');
        router.push('/user/dashboard');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';
      
      if (errorMessage.includes('user-not-found')) {
        toast.error('Account not found. Please sign up.');
      } else if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
        toast.error('Invalid email or password');
      } else if (errorMessage.includes('invalid-email')) {
        toast.error('Invalid email format');
      } else if (errorMessage.includes('too-many-requests')) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0A1F44] to-[#0A1F44]/90 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>
      
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-[#00A86B] flex items-center justify-center">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#0A1F44]">Welcome Back</h1>
            <p className="text-gray-500 mt-2">Sign in to your CLP account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-[#00A86B] hover:bg-[#008f5b]"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/user/signup" className="text-[#00A86B] font-medium hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-[#0A1F44]">
              Admin Portal →
            </Link>
          </div>
        </div>
        
        <p className="text-center text-gray-400 text-sm mt-6">
          © {new Date().getFullYear()} CLP Capital. All rights reserved.
        </p>
      </div>
    </div>
  );
}
