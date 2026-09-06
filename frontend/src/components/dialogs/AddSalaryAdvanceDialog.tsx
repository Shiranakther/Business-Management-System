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
import { Textarea } from '@/components/ui/textarea';
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

const salaryAdvanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  requestDate: z.string().min(1, 'Date is required'),
  repaymentPlan: z.string().optional(),
});

type SalaryAdvanceFormData = z.infer<typeof salaryAdvanceSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface AddSalaryAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddSalaryAdvanceDialog({ open, onOpenChange, onSuccess }: AddSalaryAdvanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SalaryAdvanceFormData>({
    resolver: zodResolver(salaryAdvanceSchema) as any,
    defaultValues: {
      requestDate: new Date().toISOString().split('T')[0],
    },
  });

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

  const onSubmit = async (data: SalaryAdvanceFormData) => {
    setIsSubmitting(true);
    try {
      const headers = await getHeaders();
      await axios.post(`${API_BASE_URL}/api/hr/advances`, {
        employeeId: data.employeeId,
        amount: data.amount,
        reason: data.reason,
        requestDate: data.requestDate
      }, { headers });
      
      toast.success('Salary advance requested successfully!');
      reset();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating advance:', error);
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
