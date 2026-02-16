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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  incurredDate: z.string().min(1, 'Date is required'),
  supplierId: z.string().optional(),
  status: z.enum(['APPROVED', 'PENDING_APPROVAL', 'REJECTED']),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const categories = [
  'Office Supplies',
  'Travel',
  'Software',
  'Marketing',
  'Equipment',
  'Utilities',
  'Rent',
  'Salaries',
  'Maintenance',
  'Other'
];

export function AddExpenseDialog({ open, onOpenChange, onSuccess }: AddExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
      const fetchSuppliers = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const headers = { Authorization: `Bearer ${session.access_token}` };
            const res = await axios.get('http://localhost:5000/api/suppliers', { headers });
            setSuppliers(res.data);
          } catch (error) {
              console.error('Error fetching suppliers:', error);
          }
      };
      if (open) {
          fetchSuppliers();
      }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      status: 'PENDING_APPROVAL',
      incurredDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      await axios.post('http://localhost:5000/api/expenses', data, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      toast.success('Expense record created successfully!');
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="e.g. Monthly Office Rent" />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(val) => setValue('category', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
             </div>
             
             <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input type="number" step="0.01" {...register('amount')} placeholder="0.00" />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incurredDate">Date</Label>
            <Input type="date" {...register('incurredDate')} />
            {errors.incurredDate && <p className="text-sm text-destructive">{errors.incurredDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier (Optional)</Label>
            <Select onValueChange={(val) => setValue('supplierId', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(val) => setValue('status', val as any)} defaultValue="PENDING_APPROVAL">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                 <SelectItem value="APPROVED">Approved</SelectItem>
                 <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
