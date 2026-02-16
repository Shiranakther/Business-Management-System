import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const supplierSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100),
  contactName: z.string().min(1, 'Contact name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  taxId: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  paymentTerms: z.string().min(1, 'Payment terms is required'),
  leadTime: z.coerce.number().min(0).optional(),
  minOrderValue: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any; // Using any to avoid strict type issues with backend response mixing
}

const paymentTermsOptions = ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'COD', 'PREPAID'];

export function AddSupplierDialog({ open, onOpenChange, supplier }: AddSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      paymentTerms: 'NET_30',
    },
  });

  // Effect to reset form when dialog opens/closes or supplier changes
  useEffect(() => {
     if (open) {
         if (supplier) {
             reset({
                companyName: supplier.companyName,
                contactName: supplier.contactName,
                email: supplier.email,
                phone: supplier.phone || '',
                mobile: supplier.mobile || '',
                address: supplier.address || '',
                city: supplier.city || '',
                state: supplier.state || '',
                zipCode: supplier.zipCode || '',
                country: supplier.country || '',
                website: supplier.website || '',
                taxId: supplier.taxId || '',
                bankName: supplier.bankName || '',
                bankAccount: supplier.bankAccount || '',
                paymentTerms: supplier.paymentTerms || 'NET_30',
                leadTime: supplier.leadTime,
                minOrderValue: supplier.minOrderValue,
                rating: supplier.rating,
                notes: supplier.notes || ''
             });
         } else {
             reset({
                companyName: '',
                contactName: '',
                email: '',
                phone: '',
                mobile: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                website: '',
                taxId: '',
                bankName: '',
                bankAccount: '',
                paymentTerms: 'NET_30',
                leadTime: undefined,
                minOrderValue: undefined,
                rating: undefined,
                notes: ''
             });
         }
     }
  }, [open, supplier, reset]);

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const url = supplier 
        ? `http://localhost:5000/api/suppliers/${supplier.id}`
        : 'http://localhost:5000/api/suppliers';

      const response = await fetch(url, {
          method: supplier ? 'PUT' : 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(data)
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to add supplier');
      }

      toast.success('Supplier added successfully!');
      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" {...register('companyName')} placeholder="Enter company name" />
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" {...register('contactName')} placeholder="Primary contact person" />
                {errors.contactName && <p className="text-sm text-destructive">{errors.contactName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} placeholder="contact@supplier.com" />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...register('website')} placeholder="https://www.supplier.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" {...register('mobile')} placeholder="+1 (555) 987-6543" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" {...register('taxId')} placeholder="Tax identification number" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" {...register('address')} placeholder="123 Supplier Ave" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" {...register('state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip/Postal Code</Label>
                <Input id="zipCode" {...register('zipCode')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} placeholder="United States" />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" {...register('bankName')} placeholder="Bank of America" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bank Account</Label>
                <Input id="bankAccount" {...register('bankAccount')} placeholder="Account number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms *</Label>
                <Select defaultValue="NET_30" onValueChange={(value) => setValue('paymentTerms', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTermsOptions.map((term) => (
                      <SelectItem key={term} value={term}>{term.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentTerms && <p className="text-sm text-destructive">{errors.paymentTerms.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderValue">Minimum Order Value ($)</Label>
                <Input id="minOrderValue" type="number" step="0.01" {...register('minOrderValue')} placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Supply Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Supply Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTime">Lead Time (days)</Label>
                <Input id="leadTime" type="number" {...register('leadTime')} placeholder="e.g., 7" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select onValueChange={(value) => setValue('rating', Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Good</SelectItem>
                    <SelectItem value="4">4 - Very Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register('notes')} placeholder="Additional notes about the supplier..." rows={3} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (supplier ? 'Updating...' : 'Adding...') : (supplier ? 'Update Supplier' : 'Add Supplier')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
