import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Check, ChevronsUpDown } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: z.enum(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface AddLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddLeaveRequestDialog({ open, onOpenChange, onSuccess }: AddLeaveRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: 'ANNUAL',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      employeeId: '',
    },
  });

  const selectedEmployeeId = watch('employeeId');

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        try {
          const headers = await getHeaders();
          const res = await axios.get(`${API_BASE_URL}/api/hr/employees`, { headers });
          setEmployees(res.data);
        } catch (error) {
          console.error('Error fetching employees', error);
          toast.error('Failed to load employees for dropdown');
        }
      };
      fetchEmployees();
    } else {
      // Reset when dialog closes
      reset();
      setOpenCombobox(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    try {
      const headers = await getHeaders();
      await axios.post(`${API_BASE_URL}/api/hr/leaves`, data, { headers });
      toast.success('Leave requested successfully!');
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Failed to request leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between font-normal"
                >
                  {selectedEmployeeId && employees.length > 0
                    ? `${employees.find((emp) => emp.id === selectedEmployeeId)?.firstName} ${employees.find((emp) => emp.id === selectedEmployeeId)?.lastName}`
                    : "Select employee..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employee..." />
                  <CommandList>
                    <CommandEmpty>
                      {employees.length === 0 ? "No employees found. Please add an employee first." : "No employee found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {employees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.firstName} ${emp.lastName}`}
                          onSelect={() => {
                            setValue('employeeId', emp.id, { shouldValidate: true });
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                            )}
                          />
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
            <Label htmlFor="type">Leave Type</Label>
            <Select onValueChange={(value) => setValue('type', value as any)} defaultValue="ANNUAL">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                <SelectItem value="SICK">Sick Leave</SelectItem>
                <SelectItem value="CASUAL">Casual Leave</SelectItem>
                <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for the leave request..."
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
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
