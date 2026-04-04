'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Loan, LoanProduct, LOAN_PRODUCTS, Borrower, Investor, LOAN_DURATIONS } from '@/types';
import { 
  formatCurrency, 
  calculateLoanInterest, 
  calculateProcessingFee, 
  calculateTotalPayable,
  calculateDueDate,
  calculateDisbursementAmount,
  getLoanInterestRate
} from '@/lib/utils';
import { createLoan, getBorrowers, getInvestors, uploadKYCDocument } from '@/lib/firebase-service';
import { Upload, X, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDays } from 'date-fns';

const loanSchema = z.object({
  borrowerId: z.string().min(1, 'Please select a borrower'),
  loanProduct: z.enum(['quick_cash', 'business_boost', 'investor_backed_premium']),
  principalAmount: z.string().min(1, 'Amount is required'),
  duration: z.enum(['1', '2', '3', '4']),
  fundingSource: z.enum(['company', 'investor_funded']),
  purpose: z.string().min(10, 'Please describe the loan purpose'),
  collateralType: z.string().optional(),
  collateralDescription: z.string().optional(),
  collateralValue: z.string().optional(),
  notes: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface LoanFormProps {
  onSuccess?: (loan: Loan) => void;
  onCancel?: () => void;
  preSelectedBorrowerId?: string;
}

export function LoanForm({ onSuccess, onCancel, preSelectedBorrowerId }: LoanFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [collateralImages, setCollateralImages] = useState<File[]>([]);
  const [collateralPreviews, setCollateralPreviews] = useState<string[]>([]);
  const [calculatedValues, setCalculatedValues] = useState({
    interest: 0,
    processingFee: 0,
    totalPayable: 0,
    dueDate: addDays(new Date(), 28),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowerId: preSelectedBorrowerId || '',
      loanProduct: 'quick_cash',
      principalAmount: '',
      duration: '1',
      fundingSource: 'company',
      purpose: '',
      collateralType: '',
      collateralDescription: '',
      collateralValue: '',
      notes: '',
    },
  });

  const watchedAmount = watch('principalAmount');
  const watchedProduct = watch('loanProduct');
  const watchedDuration = watch('duration');

  useEffect(() => {
    async function loadData() {
      try {
        const [borrowersData, investorsData] = await Promise.all([
          getBorrowers(),
          getInvestors(),
        ]);
        setBorrowers(borrowersData.filter(b => !b.isBlacklisted));
        setInvestors(investorsData.filter(i => i.isActive && i.capitalAvailable > 0));
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const amount = parseInt(watchedAmount) || 0;
    const duration = parseInt(watchedDuration) as 1 | 2 | 3 | 4;
    
    if (amount > 0) {
      setCalculatedValues({
        interest: calculateLoanInterest(amount, duration),
        processingFee: calculateProcessingFee(amount),
        totalPayable: calculateTotalPayable(amount, duration),
        dueDate: calculateDueDate(new Date(), duration),
      });
    }
  }, [watchedAmount, watchedDuration]);

  const handleCollateralImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + collateralImages.length > 4) {
      toast.error('Maximum 4 collateral images allowed');
      return;
    }
    
    setCollateralImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCollateralPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCollateralImage = (index: number) => {
    setCollateralImages(prev => prev.filter((_, i) => i !== index));
    setCollateralPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const selectedProduct = LOAN_PRODUCTS[watchedProduct as LoanProduct];
  const amount = parseInt(watchedAmount) || 0;
  const collateralThreshold = 'collateralThreshold' in selectedProduct ? selectedProduct.collateralThreshold : undefined;
  const needsCollateral = selectedProduct?.collateralRequired || 
    (collateralThreshold && amount > collateralThreshold);

  const onSubmit = async (data: LoanFormData) => {
    const amount = parseInt(data.principalAmount);
    const product = LOAN_PRODUCTS[data.loanProduct as LoanProduct];
    const duration = parseInt(data.duration) as 1 | 2 | 3 | 4;

    if (amount < product.minAmount || amount > product.maxAmount) {
      toast.error(`Amount must be between ${formatCurrency(product.minAmount)} and ${formatCurrency(product.maxAmount)}`);
      return;
    }

    setIsLoading(true);
    try {
      const borrower = borrowers.find(b => b.id === data.borrowerId);
      if (!borrower) throw new Error('Borrower not found');

      let collateralImageUrls: string[] = [];
      if (collateralImages.length > 0) {
        const tempId = Date.now().toString();
        collateralImageUrls = await Promise.all(
          collateralImages.map((file, index) => 
            uploadKYCDocument(file, tempId, `collateral-${index}`)
          )
        );
      }

      const interestRate = getLoanInterestRate(duration);
      const loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'> = {
        borrowerId: data.borrowerId,
        borrowerName: borrower.fullName,
        borrowerPhone: borrower.phone,
        loanProduct: data.loanProduct as LoanProduct,
        principalAmount: amount,
        duration: duration,
        interestRate: interestRate,
        currentInterestTier: duration,
        interestAmount: calculatedValues.interest,
        processingFee: calculatedValues.processingFee,
        processingFeePaid: false,
        totalPayable: calculatedValues.totalPayable,
        amountDisbursed: 0,
        outstandingBalance: calculatedValues.totalPayable,
        loanDate: new Date(),
        dueDate: calculatedValues.dueDate,
        status: 'pending',
        collateralType: data.collateralType || undefined,
        collateralDescription: data.collateralDescription || undefined,
        collateralValue: data.collateralValue ? parseInt(data.collateralValue) : undefined,
        collateralImageUrls: collateralImageUrls.length > 0 ? collateralImageUrls : undefined,
        penaltyAmount: 0,
        weeksLate: 0,
        defaultAlertsCount: 0,
        creditBureauReported: false,
        fundingSource: data.fundingSource,
        notes: data.notes || undefined,
      };

      const newLoan = await createLoan(loanData);
      toast.success('Loan application created successfully!');
      reset();
      setCollateralImages([]);
      setCollateralPreviews([]);
      onSuccess?.(newLoan);
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error('Failed to create loan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Borrower Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Information</h3>
        <Select
          label="Select Borrower *"
          options={borrowers.map(b => ({
            value: b.id,
            label: `${b.fullName} - ${b.phone} (Grade ${b.riskGrade})`
          }))}
          placeholder="Choose a borrower"
          error={errors.borrowerId?.message}
          {...register('borrowerId')}
        />
      </div>

      {/* Funding source */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding</h3>
        <p className="text-sm text-gray-500 mb-3">
          Company-funded loans are approved without allocating investor capital. Investor-funded loans require choosing an investor at approval.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="company" {...register('fundingSource')} className="text-[#0A1F44]" />
            <span className="text-sm font-medium text-gray-800">Company / CLP capital (no investor)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="investor_funded" {...register('fundingSource')} className="text-[#0A1F44]" />
            <span className="text-sm font-medium text-gray-800">Investor-funded</span>
          </label>
        </div>
      </div>

      {/* Loan Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Loan Product *"
            options={[
              { value: 'quick_cash', label: 'Quick Cash Loan (50K - 500K)' },
              { value: 'business_boost', label: 'Business Boost Loan (500K - 5M)' },
              { value: 'investor_backed_premium', label: 'Premium Loan (5M - 20M)' },
            ]}
            error={errors.loanProduct?.message}
            {...register('loanProduct')}
          />
          <Input
            label="Principal Amount (UGX) *"
            type="number"
            placeholder={selectedProduct ? `${formatCurrency(selectedProduct.minAmount)} - ${formatCurrency(selectedProduct.maxAmount)}` : ''}
            error={errors.principalAmount?.message}
            {...register('principalAmount')}
          />
          <Select
            label="Loan Duration *"
            options={Object.values(LOAN_DURATIONS).map(d => ({
              value: d.weeks.toString(),
              label: `${d.weeks} Week${d.weeks > 1 ? 's' : ''} - ${d.interestRate}% Interest`
            }))}
            error={errors.duration?.message}
            {...register('duration')}
          />
        </div>
      </div>

      {/* Loan Calculator */}
      {amount > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-[#0A1F44]" />
            <h4 className="font-semibold text-gray-900">Loan Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500">Principal</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Processing Fee (5%)</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(calculatedValues.processingFee)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Amount Disbursed</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(calculateDisbursementAmount(amount))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Interest ({getLoanInterestRate(parseInt(watchedDuration) as 1 | 2 | 3 | 4)}%)</p>
              <p className="text-lg font-bold text-[#0A1F44]">{formatCurrency(calculatedValues.interest)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Payable</p>
              <p className="text-lg font-bold text-[#00A86B]">{formatCurrency(calculatedValues.totalPayable)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Due Date: <span className="font-semibold">{calculatedValues.dueDate.toLocaleDateString()}</span>
              <span className="text-gray-400 ml-2">({watchedDuration} week{parseInt(watchedDuration) > 1 ? 's' : ''})</span>
            </p>
          </div>
        </div>
      )}

      {/* Purpose */}
      <Textarea
        label="Loan Purpose *"
        placeholder="Describe how the borrower plans to use this loan..."
        rows={3}
        error={errors.purpose?.message}
        {...register('purpose')}
      />

      {/* Collateral Section */}
      {needsCollateral && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Collateral Information
            <span className="text-sm font-normal text-red-500 ml-2">* Required</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Collateral Type"
              options={[
                { value: 'logbook', label: 'Vehicle Logbook' },
                { value: 'land_agreement', label: 'Land Agreement' },
                { value: 'electronics', label: 'Electronics' },
                { value: 'business_inventory', label: 'Business Inventory' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Select collateral type"
              {...register('collateralType')}
            />
            <Input
              label="Collateral Value (UGX)"
              type="number"
              placeholder="Estimated value"
              {...register('collateralValue')}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Collateral Description"
              placeholder="Provide detailed description of the collateral..."
              rows={2}
              {...register('collateralDescription')}
            />
          </div>
          
          {/* Collateral Images */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collateral Photos (Max 4)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {collateralPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Collateral ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeCollateralImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {collateralImages.length < 4 && (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0A1F44] transition-colors">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCollateralImageChange}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <Textarea
        label="Additional Notes"
        placeholder="Any additional information about this loan..."
        rows={2}
        {...register('notes')}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          Create Loan Application
        </Button>
      </div>
    </form>
  );
}
