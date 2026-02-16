import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { employees } from '@/data/mockData';

const salaryAdvanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  requestDate: z.string().min(1, 'Date is required'),
  repaymentPlan: z.string().optional(),
});

type SalaryAdvanceFormData = z.infer<typeof salaryAdvanceSchema>;

interface AddSalaryAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSalaryAdvanceDialog({ open, onOpenChange }: AddSalaryAdvanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SalaryAdvanceFormData>({
    resolver: zodResolver(salaryAdvanceSchema) as any,
    defaultValues: {
      requestDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: SalaryAdvanceFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('New salary advance request:', data);
      toast.success('Salary advance requested successfully!');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to request salary advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Salary Advance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select onValueChange={(value) => setValue('employeeId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requestDate">Date</Label>
            <Input id="requestDate" type="date" {...register('requestDate')} />
            {errors.requestDate && <p className="text-sm text-destructive">{errors.requestDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea 
                id="reason" 
                {...register('reason')} 
                placeholder="Reason for advance" 
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="repaymentPlan">Proposed Repayment Plan (Optional)</Label>
             <Input id="repaymentPlan" {...register('repaymentPlan')} placeholder="e.g. Deduct $100/month" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
