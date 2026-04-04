'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase';
import { getInvestorByAuthUserId, getInvestorByEmail, updateInvestor } from '@/lib/firebase-service';
import { PiggyBank, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function InvestorLoginPage() {
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
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      let investor = await getInvestorByAuthUserId(user.uid);
      if (!investor && user.email) {
        const byEmail = await getInvestorByEmail(user.email);
        if (byEmail) {
          await updateInvestor(byEmail.id, { authUserId: user.uid });
          investor = { ...byEmail, authUserId: user.uid };
        }
      }
      if (!investor) {
        toast.error('No investor account found. Please sign up first.');
        setIsLoading(false);
        return;
      }

      toast.success('Welcome back!');
      router.push('/investor/dashboard');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';
      
      if (errorMessage.includes('user-not-found')) {
        toast.error('Account not found');
      } else if (errorMessage.includes('wrong-password')) {
        toast.error('Invalid password');
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
        <Card className="p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
              <PiggyBank className="h-8 w-8 text-[#0A1F44]" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#0A1F44]">Investor Login</h1>
            <p className="text-gray-500 mt-2">Sign in to your investor account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="investor@example.com"
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
              className="w-full bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A1F44]"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/investor/signup" className="text-[#D4AF37] hover:underline font-medium">
                Create Account
              </Link>
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              CLP Investor Portal
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Secure. Profitable. Trusted.
            </p>
          </div>
        </Card>
        
        <p className="text-center text-gray-400 text-sm mt-6">
          © {new Date().getFullYear()} CLP Capital. All rights reserved.
        </p>
      </div>
    </div>
  );
}
