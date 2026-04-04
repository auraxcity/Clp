'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, collection, addDoc } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { 
  PiggyBank, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function InvestorSignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    location: '',
    occupation: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuthInstance();
      const db = getDb();

      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await setDoc(doc(db, 'users', user.uid), {
        phone: formData.phone,
        email: formData.email,
        role: 'investor',
        fullName: formData.fullName,
        nationalId: formData.nationalId || null,
        location: formData.location || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        kycVerified: false,
      });

      await addDoc(collection(db, 'investors'), {
        name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        authUserId: user.uid,
        nationalId: formData.nationalId || null,
        location: formData.location || null,
        occupation: formData.occupation || null,
        capitalCommitted: 0,
        capitalDeployed: 0,
        capitalAvailable: 0,
        totalProfitEarned: 0,
        accruedInterest: 0,
        monthlyProfitBreakdown: {},
        roi: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
      });

      await addDoc(collection(db, 'auditLogs'), {
        action: 'investor_registered',
        entityType: 'investor',
        entityId: user.uid,
        performedBy: user.uid,
        performedByName: formData.fullName,
        details: { email: formData.email, phone: formData.phone },
        createdAt: Timestamp.now(),
      });

      toast.success('Account created successfully!');
      router.push('/investor/dashboard');
    } catch (error: unknown) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      
      if (errorMessage.includes('email-already-in-use')) {
        toast.error('Email is already registered');
      } else if (errorMessage.includes('invalid-email')) {
        toast.error('Invalid email format');
      } else if (errorMessage.includes('weak-password')) {
        toast.error('Password is too weak');
      } else {
        toast.error('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0A1F44] to-[#0A1F44]/90">
      <Toaster position="top-right" />
      
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-12">
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-14 w-14 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
                <PiggyBank className="h-8 w-8 text-[#0A1F44]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CLP Investor Portal</h1>
                <p className="text-gray-400">Grow your wealth with us</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              Invest in Uganda&apos;s <span className="text-[#D4AF37]">Growing Economy</span>
            </h2>
            
            <p className="text-gray-300 text-lg mb-8">
              Join our network of investors and earn competitive returns on your capital through our structured micro-lending platform.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">10% Returns</h3>
                  <p className="text-sm text-gray-400">Earn 10% on your investment over 3-6 months</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                  <Shield className="h-6 w-6 text-[#0A1F44]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Secure Investment</h3>
                  <p className="text-sm text-gray-400">Your capital is protected with collateral-backed loans</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Flexible Terms</h3>
                  <p className="text-sm text-gray-400">Choose 3-month or 6-month investment periods</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
          <Card className="w-full max-w-md p-8">
            <div className="flex items-center justify-center mb-6 lg:hidden">
              <div className="h-14 w-14 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
                <PiggyBank className="h-8 w-8 text-[#0A1F44]" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#0A1F44]">Create Investor Account</h1>
              <p className="text-gray-500 mt-2">Start investing with CLP today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  placeholder="investor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="+256 7XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID
                </label>
                <Input
                  type="text"
                  placeholder="CM XXXXXX XXXXX XX"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <Input
                  type="text"
                  placeholder="City, District"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <Input
                  type="text"
                  placeholder="Your occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A1F44]"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Create Account
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/investor/login" className="text-[#D4AF37] hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-500">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
