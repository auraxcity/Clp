'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Borrower, RiskGrade } from '@/types';
import { validateUgandanPhone, formatPhoneNumber, generateReferralCode } from '@/lib/utils';
import { createBorrower, uploadKYCDocument } from '@/lib/firebase-service';
import { Camera, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

const borrowerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().refine(validateUgandanPhone, 'Invalid Ugandan phone number'),
  email: z.string().email().optional().or(z.literal('')),
  nationalId: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  occupation: z.string().optional(),
  monthlyIncome: z.string().optional(),
  referredBy: z.string().optional(),
  notes: z.string().optional(),
});

type BorrowerFormData = z.infer<typeof borrowerSchema>;

interface BorrowerFormProps {
  onSuccess?: (borrower: Borrower) => void;
  onCancel?: () => void;
  initialData?: Partial<Borrower>;
}

export function BorrowerForm({ onSuccess, onCancel, initialData }: BorrowerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nationalIdImage, setNationalIdImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: {
      fullName: initialData?.fullName || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      nationalId: initialData?.nationalId || '',
      location: initialData?.location || '',
      occupation: initialData?.occupation || '',
      monthlyIncome: initialData?.monthlyIncome?.toString() || '',
      referredBy: initialData?.referredBy || '',
      notes: initialData?.notes || '',
    },
  });

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (
    setImage: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    setImage(null);
    setPreview(null);
  };

  const onSubmit = async (data: BorrowerFormData) => {
    setIsLoading(true);
    try {
      let nationalIdImageUrl: string | undefined;
      let selfieUrl: string | undefined;

      const tempId = Date.now().toString();

      if (nationalIdImage) {
        nationalIdImageUrl = await uploadKYCDocument(nationalIdImage, tempId, 'national-id');
      }
      if (selfieImage) {
        selfieUrl = await uploadKYCDocument(selfieImage, tempId, 'selfie');
      }

      const borrowerData: Omit<Borrower, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: '',
        fullName: data.fullName,
        phone: formatPhoneNumber(data.phone),
        email: data.email || undefined,
        nationalId: data.nationalId || undefined,
        nationalIdImageUrl,
        selfieUrl,
        location: data.location,
        occupation: data.occupation || undefined,
        monthlyIncome: data.monthlyIncome ? parseInt(data.monthlyIncome) : undefined,
        riskGrade: 'B' as RiskGrade,
        riskScore: 70,
        totalLoansTaken: 0,
        totalAmountBorrowed: 0,
        totalAmountRepaid: 0,
        numberOfLatePayments: 0,
        numberOfDefaults: 0,
        currentActiveLoanBalance: 0,
        referralCode: generateReferralCode(data.fullName),
        referredBy: data.referredBy || undefined,
        referralEarnings: 0,
        isBlacklisted: false,
        notes: data.notes || undefined,
      };

      const newBorrower = await createBorrower(borrowerData);
      toast.success('Borrower registered successfully!');
      reset();
      setNationalIdImage(null);
      setSelfieImage(null);
      setNationalIdPreview(null);
      setSelfiePreview(null);
      onSuccess?.(newBorrower);
    } catch (error) {
      console.error('Error creating borrower:', error);
      toast.error('Failed to register borrower. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="Enter full name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input
            label="Phone Number *"
            placeholder="+256 7XX XXX XXX"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="National ID Number"
            placeholder="Enter national ID"
            error={errors.nationalId?.message}
            {...register('nationalId')}
          />
          <Input
            label="Location *"
            placeholder="City, District"
            error={errors.location?.message}
            {...register('location')}
          />
          <Input
            label="Occupation"
            placeholder="Enter occupation"
            error={errors.occupation?.message}
            {...register('occupation')}
          />
          <Input
            label="Monthly Income (UGX)"
            type="number"
            placeholder="Enter monthly income"
            error={errors.monthlyIncome?.message}
            {...register('monthlyIncome')}
          />
          <Input
            label="Referral Code"
            placeholder="Enter referral code if any"
            error={errors.referredBy?.message}
            {...register('referredBy')}
          />
        </div>
      </div>

      {/* KYC Documents */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* National ID Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              National ID Photo
            </label>
            {nationalIdPreview ? (
              <div className="relative">
                <img
                  src={nationalIdPreview}
                  alt="National ID Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => clearImage(setNationalIdImage, setNationalIdPreview)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0A1F44] transition-colors">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload National ID</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, setNationalIdImage, setNationalIdPreview)}
                />
              </label>
            )}
          </div>

          {/* Selfie Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selfie Photo
            </label>
            {selfiePreview ? (
              <div className="relative">
                <img
                  src={selfiePreview}
                  alt="Selfie Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => clearImage(setSelfieImage, setSelfiePreview)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0A1F44] transition-colors">
                <Camera className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload Selfie</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, setSelfieImage, setSelfiePreview)}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Textarea
          label="Notes"
          placeholder="Add any additional notes about this borrower..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          Register Borrower
        </Button>
      </div>
    </form>
  );
}
