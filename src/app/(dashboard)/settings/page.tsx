'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MERCHANT_CODES, LOAN_PRODUCTS, PENALTY_RATE, INVESTOR_SHARE, CLP_SHARE, RESERVE_SHARE, REFERRAL_SIGNUP_BONUS, REFERRAL_COMPLETION_BONUS_RATE } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  Settings, 
  Building, 
  Phone, 
  Mail, 
  CreditCard, 
  Percent,
  Shield,
  Users,
  Gift,
  FileText,
  Globe,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully!');
    setIsSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your CLP platform settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#0A1F44]">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Company Information</h3>
                <p className="text-sm text-gray-500">CLP branding and contact details</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-[#0A1F44] to-[#0A1F44]/80 rounded-xl text-white">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-[#D4AF37] flex items-center justify-center">
                    <span className="text-[#0A1F44] font-bold text-2xl">CLP</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">CRESO&apos;S LOAN PLUG</h2>
                    <p className="text-sm text-white/70">Fast. Structured. Reliable.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">Cresosloanplug@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Customer Care</p>
                    <p className="text-sm font-medium">+256 773416453</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">WhatsApp Business</p>
                    <p className="text-sm font-medium">+256 740532008</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium">Kampala, Uganda</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00A86B]">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Settings</h3>
                <p className="text-sm text-gray-500">Mobile money merchant codes</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-yellow-400 flex items-center justify-center">
                    <span className="text-black font-bold">MTN</span>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-800">MTN MoMo Merchant Code</p>
                    <p className="text-2xl font-bold text-yellow-900">{MERCHANT_CODES.mtn_momo}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-red-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Airtel</span>
                  </div>
                  <div>
                    <p className="text-sm text-red-800">Airtel Money Merchant Code</p>
                    <p className="text-2xl font-bold text-red-900">{MERCHANT_CODES.airtel_money}</p>
                    <p className="text-xs text-red-600">Dial *185*9# → Name: Kule Crescent</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Loan Products */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-600">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Loan Products</h3>
                <p className="text-sm text-gray-500">Available loan offerings</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(LOAN_PRODUCTS).map(([key, product]) => (
                <div key={key} className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Range: </span>
                      <span className="font-medium">
                        {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Interest: </span>
                      <span className="font-medium">{product.interestRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processing: </span>
                      <span className="font-medium">{product.processingFee}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Term: </span>
                      <span className="font-medium">{product.repaymentDays} days</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interest & Profit Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#D4AF37]">
                <Percent className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Interest & Profit Split</h3>
                <p className="text-sm text-gray-500">Revenue distribution settings</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Standard Interest Rate</p>
                <p className="text-3xl font-bold text-[#0A1F44]">40%</p>
                <p className="text-xs text-gray-400">per 28 days / 4 weeks / 1 month</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#D4AF37]/10 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Investor</p>
                  <p className="text-xl font-bold text-[#D4AF37]">{INVESTOR_SHARE}%</p>
                </div>
                <div className="p-3 bg-[#0A1F44]/10 rounded-lg text-center">
                  <p className="text-xs text-gray-500">CLP</p>
                  <p className="text-xl font-bold text-[#0A1F44]">{CLP_SHARE}%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Reserve</p>
                  <p className="text-xl font-bold text-blue-600">{RESERVE_SHARE}%</p>
                  <p className="text-[10px] text-gray-400">of CLP share</p>
                </div>
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Late Penalty</span>
                </div>
                <p className="text-lg font-bold text-red-600 mt-1">{PENALTY_RATE}% per week</p>
              </div>
            </div>
          </Card>

          {/* Referral Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-pink-500">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Referral Program</h3>
                <p className="text-sm text-gray-500">Referral bonuses and rewards</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-pink-700">Sign-up Bonus</p>
                <p className="text-2xl font-bold text-pink-600">
                  {formatCurrency(REFERRAL_SIGNUP_BONUS)}
                </p>
                <p className="text-xs text-pink-500">off next loan application</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Referral Completion Bonus</p>
                <p className="text-2xl font-bold text-green-600">
                  {REFERRAL_COMPLETION_BONUS_RATE}%
                </p>
                <p className="text-xs text-green-500">paid after referred person&apos;s first loan repayment</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                <p>• Fraudulent referrals lead to account suspension</p>
                <p>• Bonus credited only after full repayment</p>
              </div>
            </div>
          </Card>

          {/* Terms & Policies */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gray-800">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Terms & Policies</h3>
                <p className="text-sm text-gray-500">Key policy guidelines</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Eligibility</p>
                <ul className="mt-1 text-gray-600 space-y-1">
                  <li>• Minimum age: 18 years</li>
                  <li>• Valid National ID required</li>
                </ul>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Processing Fee</p>
                <ul className="mt-1 text-gray-600 space-y-1">
                  <li>• 5% charged before disbursement</li>
                  <li>• Non-refundable</li>
                </ul>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Collateral Policy</p>
                <ul className="mt-1 text-gray-600 space-y-1">
                  <li>• Required for loans above UGX 1,000,000</li>
                  <li>• Accepted: Logbook, Land agreement, Electronics, Inventory</li>
                </ul>
              </div>
              
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-800">Default Timeline</p>
                <ul className="mt-1 text-red-700 space-y-1">
                  <li>• 1 day late → Account marked Late</li>
                  <li>• 7 days → Recovery process begins</li>
                  <li>• 14 days → Legal escalation</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={isSaving}>
            <Settings className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
