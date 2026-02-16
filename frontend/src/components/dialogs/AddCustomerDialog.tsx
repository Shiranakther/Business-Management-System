import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Base schema for shared fields
const baseSchema = z.object({
  customerType: z.enum(['B2C', 'B2B']),
  
  // Core
  name: z.string().min(1, 'Name is required'), 
  mobile: z.string().min(1, 'Mobile number is required'),
  phone: z.string().nullish(),
  email: z.string().email('Valid email is required').nullish().or(z.literal('')),
  notes: z.string().max(500).nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),

  // Addresses
  billingAddressLine1: z.string().nullish(),
  billingAddressLine2: z.string().nullish(),
  city: z.string().nullish(),
  district: z.string().nullish(),
  postalCode: z.string().nullish(),

  deliveryAddressLine1: z.string().nullish(),
  deliveryAddressLine2: z.string().nullish(),
  deliveryCity: z.string().nullish(),
  deliveryDistrict: z.string().nullish(),
  deliveryPostalCode: z.string().nullish(),
  landmark: z.string().nullish(),
  deliveryInstructions: z.string().nullish(),

  // Credit & Payment
  creditAllowed: z.boolean().default(false),
  creditLimit: z.coerce.number().min(0).nullish(),
  paymentTerms: z.string().nullish(),
  defaultPaymentMethod: z.string().nullish(),
});

// B2C Schema Extensions
const b2cSchema = baseSchema.extend({
  customerType: z.literal('B2C'),
  nic: z.string().nullish(),
  dateOfBirth: z.string().nullish(), 
  whatsapp: z.string().nullish(),
  preferredContactMethod: z.enum(['CALL', 'WHATSAPP', 'EMAIL']).nullish(),
});

// B2B Schema Extensions
const b2bSchema = baseSchema.extend({
  customerType: z.literal('B2B'),
  companyName: z.string().min(1, 'Company Name is required'),
  businessRegistrationNumber: z.string().nullish(),
  vatNumber: z.string().nullish(),
  businessType: z.string().nullish(),
  contactPersonName: z.string().nullish(),
  contactPersonDesignation: z.string().nullish(),
  officePhone: z.string().nullish(),
  businessEmail: z.string().email().nullish().or(z.literal('')),
  website: z.string().url().nullish().or(z.literal('')),
  
  // Tax
  vatRegistered: z.boolean().default(false),
  vatPercentage: z.coerce.number().min(0).nullish(),
  invoiceName: z.string().nullish(),
  invoiceAddress: z.string().nullish(),
});

// Discriminated Union
const customerSchema = z.discriminatedUnion('customerType', [
  b2cSchema,
  b2bSchema,
]);

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  customer?: CustomerFormData | null;
}

const paymentTermsOptions = ['CASH', '7_DAYS', '14_DAYS', '30_DAYS'];
const paymentMethodOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card Payment' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'COD', label: 'Cash on Delivery (COD)' },
  { value: 'EZ_CASH', label: 'Ez Cash' },
  { value: 'BANK_DEPOSIT', label: 'Bank Deposit' },
];

const districts = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Moneragala', 'Ratnapura', 'Kegalle'
];

export function AddCustomerDialog({ open, onOpenChange, onSuccess, customer }: AddCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      customerType: 'B2C',
      status: 'ACTIVE',
      creditAllowed: false,
      creditLimit: 0,
    },
  });

  // Load customer data for editing
  useEffect(() => {
    if (open) {
      if (customer) {
        reset(customer);
        // Also check if whatsapp/delivery same should be checked
        if (customer.customerType === 'B2C') {
            setIsWhatsappSame(customer.whatsapp === customer.mobile);
        }
        setIsDeliverySame(
            customer.deliveryAddressLine1 === customer.billingAddressLine1 &&
            customer.deliveryCity === customer.city &&
            customer.deliveryDistrict === customer.district
        );
      } else {
        reset({
          customerType: 'B2C',
          status: 'ACTIVE',
          creditAllowed: false,
          creditLimit: 0,
        });
        setIsWhatsappSame(false);
        setIsDeliverySame(false);
      }
    }
  }, [open, customer, reset]);

  const currentType = watch('customerType');
  const [isWhatsappSame, setIsWhatsappSame] = useState(false);
  const [isDeliverySame, setIsDeliverySame] = useState(false);

  // Sync WhatsApp when "Same as Mobile" is checked
  const mobile = watch('mobile');
  useEffect(() => {
    if (isWhatsappSame) {
      // @ts-ignore
      setValue('whatsapp', mobile);
    }
  }, [mobile, isWhatsappSame, setValue]);

  // Sync Delivery Address when "Same as Billing" is checked
  const billingAddr1 = watch('billingAddressLine1');
  const billingAddr2 = watch('billingAddressLine2');
  const billingCity = watch('city');
  const billingDistrict = watch('district');
  const billingZip = watch('postalCode');

  useEffect(() => {
    if (isDeliverySame) {
      setValue('deliveryAddressLine1', billingAddr1);
      setValue('deliveryAddressLine2', billingAddr2);
      setValue('deliveryCity', billingCity);
      setValue('deliveryDistrict', billingDistrict);
      setValue('deliveryPostalCode', billingZip);
    }
  }, [billingAddr1, billingAddr2, billingCity, billingDistrict, billingZip, isDeliverySame, setValue]);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && open) {
      console.log('Validation Errors:', errors);
      const firstError = Object.values(errors)[0] as any;
      if (firstError?.message) {
        toast.error(`Form error: ${firstError.message}`);
      }
    }
  }, [errors, open]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    console.log('onSubmit called with data:', data);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
          toast.error("You must be logged in.");
          return;
      }

      const isEdit = !!(customer as any)?.id;
      const customerId = (customer as any)?.id;
      console.log('Submitting customer data:', { isEdit, id: customerId, data });

      const url = isEdit 
        ? `http://localhost:5000/api/customers/${customerId}`
        : 'http://localhost:5000/api/customers';
      
      const response = await fetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(data)
      });

      if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown server error' }));
          throw new Error(err.error || `Failed to ${isEdit ? 'update' : 'create'} customer`);
      }

      toast.success(`Customer ${isEdit ? 'updated' : 'added'} successfully!`);
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process request');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{(customer as any)?.id ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Customer Type Selection */}
          <div className="flex justify-center pb-4 border-b">
            <RadioGroup 
                value={currentType}
                className="flex gap-6"
                onValueChange={(val) => {
                    setValue('customerType', val as 'B2C' | 'B2B');
                }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="B2C" id="r-b2c" />
                <Label htmlFor="r-b2c" className="cursor-pointer font-medium">Individual (Domestic / B2C)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="B2B" id="r-b2b" />
                <Label htmlFor="r-b2b" className="cursor-pointer font-medium">Business (Wholesale / B2B)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
                 {/* Core Information */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Core Details</h3>
                    
                    {currentType === 'B2B' && (
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Business Name *</Label>
                            <Input id="companyName" {...register('companyName' as any)} placeholder="e.g. ABC Traders Pvt Ltd" />
                            {(errors as any).companyName && <p className="text-sm text-destructive">{(errors as any).companyName.message}</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">{currentType === 'B2B' ? 'Contact Person Name' : 'Full Name'} *</Label>
                        <Input id="name" {...register('name')} placeholder={currentType === 'B2B' ? "Primary Contact Person" : "Customer Full Name"} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number *</Label>
                            <Input id="mobile" {...register('mobile')} placeholder="077xxxxxxx" />
                            {errors.mobile && <p className="text-sm text-destructive">{errors.mobile.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Secondary Phone</Label>
                            <Input id="phone" {...register('phone')} placeholder="Optional" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" {...register('email')} placeholder="customer@example.com" />
                         {/* @ts-ignore - generic union type issue */}
                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                         <Label htmlFor="status">Customer Status</Label>
                         <Select 
                            value={watch('status') || undefined}
                            onValueChange={v => setValue('status', v as any)}
                         >
                             <SelectTrigger>
                                 <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="ACTIVE">Active</SelectItem>
                                 <SelectItem value="INACTIVE">Inactive</SelectItem>
                                 <SelectItem value="SUSPENDED">Suspended</SelectItem>
                             </SelectContent>
                         </Select>
                    </div>
                 </div>

                 {/* B2C Specific Fields */}
                 {currentType === 'B2C' && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Personal Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nic">NIC Number</Label>
                                <Input id="nic" {...register('nic')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Input id="dob" type="date" {...register('dateOfBirth')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Label htmlFor="whatsapp">WhatsApp</Label>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <Checkbox 
                                            id="same-mobile" 
                                            checked={isWhatsappSame}
                                            onCheckedChange={(c) => setIsWhatsappSame(c as boolean)}
                                        />
                                        <label htmlFor="same-mobile" className="text-[10px] text-muted-foreground cursor-pointer">Same as Mobile</label>
                                    </div>
                                </div>
                                <Input id="whatsapp" {...register('whatsapp' as any)} disabled={isWhatsappSame} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prefContact">Preferred Contact</Label>
                                <Select 
                                    value={watch('preferredContactMethod' as any) || undefined}
                                    onValueChange={v => setValue('preferredContactMethod' as any, v as any)}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CALL">Voice Call</SelectItem>
                                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                        <SelectItem value="EMAIL">Email</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                     </div>
                 )}

                 {/* B2B Specific Fields */}
                 {currentType === 'B2B' && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Business Details</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="br">BR Number</Label>
                                <Input id="br" {...register('businessRegistrationNumber')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vat">VAT Number</Label>
                                <Input id="vat" {...register('vatNumber')} />
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                 <Label htmlFor="bizType">Business Type</Label>
                                 <Select 
                                    value={watch('businessType' as any) || undefined}
                                    onValueChange={v => setValue('businessType' as any, v)}
                                 >
                                     <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="SOLE_PROPRIETOR">Sole Proprietor</SelectItem>
                                         <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                                         <SelectItem value="PVT_LTD">Private Ltd</SelectItem>
                                     </SelectContent>
                                 </Select>
                             </div>
                             <div className="space-y-2">
                                 <Label htmlFor="designation">Contact Designation</Label>
                                 <Input id="designation" {...register('contactPersonDesignation')} placeholder="e.g. Manager" />
                             </div>
                         </div>
                     </div>
                 )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
                 {/* Addresses */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Address & Delivery</h3>
                    
                    <div className="p-4 border rounded-md bg-muted/20 space-y-3">
                        <h4 className="text-sm font-medium">Billing Address</h4>
                        <Input {...register('billingAddressLine1')} placeholder="Address Line 1" />
                        <Input {...register('billingAddressLine2')} placeholder="Address Line 2 (Optional)" />
                        <div className="grid grid-cols-2 gap-2">
                            <Input {...register('city')} placeholder="City" />
                            <Select 
                                value={watch('district') || undefined}
                                onValueChange={v => setValue('district', v)}
                            >
                                <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
                                <SelectContent>
                                    {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input {...register('postalCode')} placeholder="Postal Code" />
                    </div>

                    <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Delivery Address</h4>
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    id="same-billing" 
                                    checked={isDeliverySame}
                                    onCheckedChange={(c) => setIsDeliverySame(c as boolean)}
                                />
                                <label htmlFor="same-billing" className="text-[10px] text-muted-foreground cursor-pointer font-medium uppercase tracking-tighter">Same as Billing</label>
                            </div>
                        </div>
                        
                        <Input {...register('deliveryAddressLine1')} placeholder="Delivery Address Line 1" disabled={isDeliverySame} />
                        <Input {...register('deliveryAddressLine2')} placeholder="Delivery Address Line 2 (Optional)" disabled={isDeliverySame} />
                        <div className="grid grid-cols-2 gap-2">
                            <Input {...register('deliveryCity')} placeholder="City" disabled={isDeliverySame} />
                            <Select 
                                value={(isDeliverySame ? watch('district') : watch('deliveryDistrict')) || undefined}
                                onValueChange={v => setValue('deliveryDistrict', v)} 
                                disabled={isDeliverySame}
                            >
                                <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
                                <SelectContent>
                                    {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input {...register('deliveryPostalCode')} placeholder="Postal Code" disabled={isDeliverySame} />
                        <Input {...register('landmark')} placeholder="Nearest Landmark" />
                        <Textarea {...register('deliveryInstructions')} placeholder="Delivery Instructions..." rows={2} />
                    </div>
                 </div>

                 {/* Credit & Payment */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Credit & Payment</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="creditAllowed" 
                            checked={watch('creditAllowed') || false}
                            onCheckedChange={(c) => setValue('creditAllowed', c as boolean)} 
                        />
                        <Label htmlFor="creditAllowed">Allow Credit Purchases</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="creditLimit">Credit Limit</Label>
                            <Input type="number" {...register('creditLimit')} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payTerm">Payment Terms</Label>
                             <Select 
                                value={watch('paymentTerms') || undefined}
                                onValueChange={v => setValue('paymentTerms', v as any)}
                             >
                                 <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                 <SelectContent>
                                     {paymentTermsOptions.map(opt => (
                                         <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                            <Label htmlFor="payMethod">Default Payment Method</Label>
                             <Select 
                                value={watch('defaultPaymentMethod') || undefined}
                                onValueChange={v => setValue('defaultPaymentMethod', v as any)}
                             >
                                 <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                 <SelectContent>
                                     {paymentMethodOptions.map(opt => (
                                         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
                 </div>

                 {/* Tax (B2B mostly) */}
                 {currentType === 'B2B' && (
                     <div className="space-y-4 animate-in fade-in">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Tax & Invoicing</h3>
                        <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="vatReg" 
                                checked={watch('vatRegistered' as any) || false}
                                onCheckedChange={(c) => setValue('vatRegistered' as any, c as boolean)} 
                             />
                             <Label htmlFor="vatReg">VAT Registered</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input {...register('vatPercentage')} placeholder="VAT %" type="number" />
                            <Input {...register('invoiceName')} placeholder="Invoice Printed Name" />
                        </div>
                        <Input {...register('invoiceAddress')} placeholder="Invoice Address (if different)" />
                     </div>
                 )}

                 <div className="space-y-2">
                    <Label htmlFor="notes">Internal Notes</Label>
                    <Textarea {...register('notes')} placeholder="Any internal notes..." />
                 </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (customer as any)?.id ? 'Updating...' : 'Adding...' : (customer as any)?.id ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
