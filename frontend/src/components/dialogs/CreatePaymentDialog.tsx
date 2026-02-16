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
import { employees, salaryAdvanceRequests } from '@/data/mockData';

const paymentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  basicSalary: z.coerce.number().min(0),
  payPeriodStart: z.string().min(1, 'Start date is required'),
  payPeriodEnd: z.string().min(1, 'End date is required'),
  // Additions
  allowances: z.coerce.number().min(0).optional(),
  bonuses: z.coerce.number().min(0).optional(),
  overtime: z.coerce.number().min(0).optional(),
  // Deductions
  epfDeduction: z.coerce.number().min(0).optional(), // 8% typically
  etfDefault: z.coerce.number().min(0).optional(), // Employer pays, strictly speaking not a deduction from net but useful to track or display
  taxDeduction: z.coerce.number().min(0).optional(),
  salaryAdvanceDeduction: z.coerce.number().min(0).optional(),
  otherDeductions: z.coerce.number().min(0).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePaymentDialog({ open, onOpenChange }: CreatePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [calculatedNet, setCalculatedNet] = useState<number>(0);
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [totalDeductions, setTotalDeductions] = useState<number>(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      allowances: 0,
      bonuses: 0,
      overtime: 0,
      epfDeduction: 0,
      taxDeduction: 0,
      otherDeductions: 0,
      salaryAdvanceDeduction: 0,
    },
  });

  // Watch form values to auto-calculate totals
  const watchedValues = watch();

  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (employee && employee.salary) {
        // Assume monthly salary is annual / 12 for this mock
        const monthlyBasic = Math.round(employee.salary / 12);
        setValue('basicSalary', monthlyBasic);
        
        // Auto-calculate EPF (8% of basic)
        const epf = Math.round(monthlyBasic * 0.08);
        setValue('epfDeduction', epf);

        // Check for approved salary advances
        const advances = salaryAdvanceRequests
          .filter(r => r.employeeId === selectedEmployeeId && r.status === 'APPROVED');
        
        // Simple logic: if there is an outstanding advance, suggest it as deduction
        // In a real app, we'd track balance remaining.
        const totalAdvances = advances.reduce((sum, r) => sum + r.amount, 0);
        if (totalAdvances > 0) {
           setValue('salaryAdvanceDeduction', totalAdvances);
           toast.info(`Employee has ${totalAdvances} in approved salary advances.`);
        } else {
           setValue('salaryAdvanceDeduction', 0);
        }
      }
    }
  }, [selectedEmployeeId, setValue]);

  useEffect(() => {
    const basic = Number(watchedValues.basicSalary) || 0;
    const allowances = Number(watchedValues.allowances) || 0;
    const bonuses = Number(watchedValues.bonuses) || 0;
    const overtime = Number(watchedValues.overtime) || 0;
    
    const epf = Number(watchedValues.epfDeduction) || 0;
    const tax = Number(watchedValues.taxDeduction) || 0;
    const advance = Number(watchedValues.salaryAdvanceDeduction) || 0;
    const other = Number(watchedValues.otherDeductions) || 0;

    const totalEarnings = basic + allowances + bonuses + overtime;
    const totalDeduct = epf + tax + advance + other;
    
    setGrossSalary(totalEarnings);
    setTotalDeductions(totalDeduct);
    setCalculatedNet(totalEarnings - totalDeduct);

  }, [watchedValues]);

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('Processed Payment:', { ...data, netSalary: calculatedNet });
      toast.success(`Payroll processed! Net Salary: $${calculatedNet}`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to process payroll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Employee Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
          {/* Employee & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2 md:col-span-2">
                <Label>Employee</Label>
                <Select onValueChange={(val) => { setValue('employeeId', val); setSelectedEmployeeId(val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
             </div>
             
             <div className="space-y-2">
                <Label>Pay Period Start</Label>
                <Input type="date" {...register('payPeriodStart')} />
                {errors.payPeriodStart && <p className="text-sm text-destructive">{errors.payPeriodStart.message}</p>}
             </div>
             <div className="space-y-2">
                <Label>Pay Period End</Label>
                <Input type="date" {...register('payPeriodEnd')} />
                {errors.payPeriodEnd && <p className="text-sm text-destructive">{errors.payPeriodEnd.message}</p>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold flex items-center text-success">Earnings</h3>
                  
                  <div className="space-y-2">
                    <Label>Basic Salary</Label>
                    <Input type="number" {...register('basicSalary')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowances</Label>
                    <Input type="number" {...register('allowances')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bonuses</Label>
                    <Input type="number" {...register('bonuses')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime</Label>
                    <Input type="number" {...register('overtime')} />
                  </div>

                  <div className="pt-2 border-t font-medium flex justify-between">
                     <span>Gross Salary</span>
                     <span>{grossSalary.toFixed(2)}</span>
                  </div>
              </div>

              {/* Deductions */}
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold flex items-center text-destructive">Deductions</h3>
                  
                  <div className="space-y-2">
                    <Label>EPF (8%)</Label>
                    <Input type="number" {...register('epfDeduction')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax (PAYE/APIT)</Label>
                    <Input type="number" {...register('taxDeduction')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary Advance</Label>
                    <div className="relative">
                        <Input type="number" {...register('salaryAdvanceDeduction')} className="pl-8" />
                        <span className="absolute left-2.5 top-2.5 text-muted-foreground text-xs">$</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-filled if approved advances exist</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Other Deductions</Label>
                    <Input type="number" {...register('otherDeductions')} />
                  </div>

                  <div className="pt-2 border-t font-medium flex justify-between">
                     <span>Total Deductions</span>
                     <span>{totalDeductions.toFixed(2)}</span>
                  </div>
              </div>
          </div>

          {/* Net Salary Display */}
          <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
              <div>
                  <h4 className="font-bold text-lg">Net Salary</h4>
                  <p className="text-sm text-muted-foreground">Amount to be paid</p>
              </div>
              <div className="text-3xl font-bold text-primary">
                  ${calculatedNet.toFixed(2)}
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Process Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
