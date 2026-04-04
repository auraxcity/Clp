'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MERCHANT_CODES, LOAN_PRODUCTS, LOAN_DURATIONS } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Users, 
  Phone, 
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle,
  Clock,
  Wallet,
  Star,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { InstallAppButton } from '@/components/InstallAppButton';

export default function HomePage() {
  const router = useRouter();
  const [isApplyLoading, setIsApplyLoading] = useState(false);

  const handleApplyForLoan = () => {
    setIsApplyLoading(true);
    router.push('/user/login');
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#0A1F44] font-bold text-lg">CLP</span>
              </div>
              <div>
                <h1 className="font-bold text-[#0A1F44] text-lg leading-tight">CLP</h1>
                <p className="text-xs text-gray-500">Creso&apos;s Loan Plug</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#products" className="text-sm text-gray-600 hover:text-[#0A1F44] transition-colors">Products</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-[#0A1F44] transition-colors">How It Works</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-[#0A1F44] transition-colors">Contact</a>
            </nav>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/user/login')} className="border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white">
                Borrower Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 bg-gradient-to-br from-[#0A1F44] via-[#0A1F44] to-[#0A1F44]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4AF37]/20 rounded-full mb-6">
                <Star className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-sm text-[#D4AF37]">Uganda&apos;s Trusted Micro-Lender</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Fast. Structured.
                <span className="text-[#D4AF37]"> Reliable.</span>
              </h1>
              <p className="mt-6 text-lg text-gray-300 max-w-lg">
                Get quick access to loans from UGX 50,000 to UGX 20,000,000. Simple application, fast approval, and flexible repayment terms.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="secondary" onClick={handleApplyForLoan} isLoading={isApplyLoading}>
                  Apply for a Loan
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => router.push('/user/signup')}>
                  Create Account
                </Button>
              </div>
              
              <div className="mt-12 grid grid-cols-4 gap-4">
                {Object.entries(LOAN_DURATIONS).map(([key, duration]) => (
                  <div key={key} className="text-center">
                    <p className="text-2xl font-bold text-[#D4AF37]">{duration.interestRate}%</p>
                    <p className="text-xs text-gray-400">{duration.label}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-[#D4AF37]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#00A86B]/20 rounded-full blur-3xl" />
              
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#00A86B] flex items-center justify-center">
                      <Wallet className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Quick Cash Loan</p>
                      <p className="text-gray-400 text-sm">UGX 50K - 500K</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#D4AF37] flex items-center justify-center">
                      <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Business Boost</p>
                      <p className="text-gray-400 text-sm">UGX 500K - 5M</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#0A1F44] border border-[#D4AF37] flex items-center justify-center">
                      <Shield className="h-7 w-7 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Premium Loan</p>
                      <p className="text-gray-400 text-sm">UGX 5M - 20M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0A1F44]">Why Choose CLP?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              We combine speed, transparency, and reliability to give you the best lending experience in Uganda.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-[#0A1F44] flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Approval</h3>
              <p className="text-sm text-gray-600">Get approved within hours and receive funds in 24 hours</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Trusted</h3>
              <p className="text-sm text-gray-600">Your data is protected with bank-level security</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Flexible Terms</h3>
              <p className="text-sm text-gray-600">Choose 1-4 week repayment periods</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Referral Rewards</h3>
              <p className="text-sm text-gray-600">Earn UGX 5,000 for every successful referral</p>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0A1F44]">Our Loan Products</h2>
            <p className="mt-4 text-gray-600">Choose the loan that fits your needs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(LOAN_PRODUCTS).map(([key, product]) => (
              <div key={key} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${
                  key === 'quick_cash' ? 'bg-[#00A86B]' :
                  key === 'business_boost' ? 'bg-[#D4AF37]' :
                  'bg-[#0A1F44]'
                }`}>
                  <Wallet className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-3xl font-bold text-[#0A1F44] mb-4">
                  {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                </p>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-[#00A86B]" />
                    10-45% interest (1-4 weeks)
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-[#00A86B]" />
                    {product.processingFee}% processing fee
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-[#00A86B]" />
                    1-4 weeks repayment
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-[#00A86B]" />
                    {product.collateralRequired ? 'Collateral required' : 'No collateral needed'}
                  </li>
                </ul>
                
                <Button variant="outline" className="w-full" onClick={handleApplyForLoan}>
                  Apply Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-[#0A1F44]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-gray-400">Simple steps to get your loan</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Register', desc: 'Sign up with your phone number and basic details' },
              { step: '02', title: 'Apply', desc: 'Choose your loan product and select duration (1-4 weeks)' },
              { step: '03', title: 'Verify', desc: 'Complete KYC with National ID and selfie' },
              { step: '04', title: 'Receive', desc: 'Get funds via MTN MoMo or Airtel Money' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="h-16 w-16 rounded-full bg-[#D4AF37] flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#0A1F44] font-bold text-xl">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0A1F44]">Payment Methods</h2>
            <p className="mt-4 text-gray-600">Pay conveniently via mobile money or online</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-yellow-400 flex items-center justify-center mx-auto mb-4">
                <span className="text-black font-bold text-xl">MTN</span>
              </div>
              <p className="text-sm text-yellow-800 mb-2">MTN Mobile Money</p>
              <p className="text-3xl font-bold text-yellow-900">{MERCHANT_CODES.mtn_momo}</p>
              <p className="text-xs text-yellow-700 mt-2">Merchant Code</p>
            </div>
            
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">Airtel</span>
              </div>
              <p className="text-sm text-red-800 mb-2">Airtel Money</p>
              <p className="text-3xl font-bold text-red-900">{MERCHANT_CODES.airtel_money}</p>
              <p className="text-xs text-red-700 mt-2">Dial *185*9# | Name: Kule Crescent</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-[#0A1F44] mb-6">Get In Touch</h2>
              <p className="text-gray-600 mb-8">
                Have questions? Our team is here to help you 24/7. Reach out to us through any of our channels.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#0A1F44] flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer Care</p>
                    <p className="font-semibold text-gray-900">+256 773416453</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#00A86B] flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp Business</p>
                    <p className="font-semibold text-gray-900">+256 740532008</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">Cresosloanplug@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-900">Kampala, Uganda</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#0A1F44] rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Send us a message</h3>
              <div className="space-y-4">
                <Input placeholder="Your Name" className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
                <Input placeholder="Phone Number" className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
                <Input placeholder="Email" className="bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
                <textarea 
                  placeholder="Your Message"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
                <Button variant="secondary" className="w-full">
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A1F44] border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#D4AF37] flex items-center justify-center">
                <span className="text-[#0A1F44] font-bold text-lg">CLP</span>
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">CRESO&apos;S LOAN PLUG</h1>
                <p className="text-xs text-gray-400">Fast. Structured. Reliable.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} CLP Capital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <InstallAppButton />
    </div>
  );
}
