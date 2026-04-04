'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { Shield, Eye, EyeOff, ArrowLeft, User, Phone, Mail, MapPin } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

export default function UserSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
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
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Set display name in Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: formData.fullName
      });

      const referralCode = `CLP${uuidv4().substring(0, 6).toUpperCase()}`;

      let referredBy: string | undefined;
      if (formData.referralCode) {
        const borrowersRef = collection(db, 'borrowers');
        const q = query(borrowersRef, where('referralCode', '==', formData.referralCode.toUpperCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          referredBy = snapshot.docs[0].id;
        }
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        phone: formData.phone,
        fullName: formData.fullName,
        role: 'borrower',
        isActive: true,
        kycVerified: false,
        location: formData.location,
        referralCode: referralCode,
        referredBy: referredBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await setDoc(doc(db, 'borrowers', userCredential.user.uid), {
        userId: userCredential.user.uid,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        location: formData.location || 'Not specified',
        riskGrade: 'C',
        riskScore: 50,
        totalLoansTaken: 0,
        totalAmountBorrowed: 0,
        totalAmountRepaid: 0,
        numberOfLatePayments: 0,
        numberOfDefaults: 0,
        currentActiveLoanBalance: 0,
        referralCode: referralCode,
        referredBy: referredBy,
        referralEarnings: 0,
        isBlacklisted: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Account created successfully!');
      router.push('/user/dashboard');
    } catch (error: unknown) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      
      if (errorMessage.includes('email-already-in-use')) {
        toast.error('Email already registered. Please login.');
      } else if (errorMessage.includes('invalid-email')) {
        toast.error('Invalid email format');
      } else if (errorMessage.includes('weak-password')) {
        toast.error('Password is too weak');
      } else {
        toast.error('Signup failed. Please try again.');
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
          <div className="flex items-center justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-[#00A86B] flex items-center justify-center">
              <User className="h-7 w-7 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0A1F44]">Create Account</h1>
            <p className="text-gray-500 mt-1">Join CLP and get quick loans</p>
          </div>
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="+256 7XX XXX XXX"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  name="location"
                  placeholder="Kampala, Uganda"
                  value={formData.location}
                  onChange={handleChange}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-12"
                  disabled={isLoading}
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
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Code (Optional)
              </label>
              <Input
                type="text"
                name="referralCode"
                placeholder="Enter referral code"
                value={formData.referralCode}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-[#00A86B] hover:bg-[#008f5b]"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Create Account
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/user/login" className="text-[#00A86B] font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              By creating an account, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
