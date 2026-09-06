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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

const paymentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  basicSalary: z.coerce.number().min(0),
  payPeriodStart: z.string().min(1, 'Start date is required'),
  payPeriodEnd: z.string().min(1, 'End date is required'),
  allowances: z.coerce.number().min(0).optional(),
  bonuses: z.coerce.number().min(0).optional(),
  overtime: z.coerce.number().min(0).optional(),
  epfDeduction: z.coerce.number().min(0).optional(),
  etfDefault: z.coerce.number().min(0).optional(),
  taxDeduction: z.coerce.number().min(0).optional(),
  salaryAdvanceDeduction: z.coerce.number().min(0).optional(),
  otherDeductions: z.coerce.number().min(0).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  salary?: number;
}

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePaymentDialog({ open, onOpenChange, onSuccess }: CreatePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
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

  const watchedValues = watch();
  const selectedEmployeeId = watch('employeeId');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedLabel = selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : '';

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        try {
          const headers = await getHeaders();
          const response = await axios.get(`${API_BASE_URL}/api/hr/employees`, { headers });
          setEmployees(response.data.data || []);
        } catch (error) {
          console.error('Error fetching employees:', error);
          toast.error('Failed to load employees');
        }
      };
      fetchEmployees();
    }
  }, [open]);

  useEffect(() => {
    if (selectedEmployeeId && selectedEmployee) {
      if (selectedEmployee.salary) {
        const monthlyBasic = Math.round(selectedEmployee.salary / 12);
        setValue('basicSalary', monthlyBasic);
        
        const epf = Math.round(monthlyBasic * 0.08);
        setValue('epfDeduction', epf);
        setValue('salaryAdvanceDeduction', 0);
      }
    }
  }, [selectedEmployeeId, selectedEmployee, setValue]);

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
      const headers = await getHeaders();
      await axios.post(`${API_BASE_URL}/api/hr/payroll`, {
        employeeId: data.employeeId,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        basicSalary: data.basicSalary,
        bonuses: (Number(data.allowances) || 0) + (Number(data.bonuses) || 0) + (Number(data.overtime) || 0),
        deductions: totalDeductions,
        netSalary: calculatedNet
      }, { headers });
      
      toast.success(`Payroll processed! Net Salary: $${calculatedNet}`);
      reset();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating payroll:', error);
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
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2 md:col-span-2">
                <Label>Employee</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedLabel || "Select employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search employee..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map(emp => (
                            <CommandItem 
                              key={emp.id} 
                              value={`${emp.firstName} ${emp.lastName}`} 
                              onSelect={() => { 
                                setValue('employeeId', emp.id, { shouldValidate: true }); 
                                setOpenCombobox(false); 
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0")} />
                              {emp.firstName} {emp.lastName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
