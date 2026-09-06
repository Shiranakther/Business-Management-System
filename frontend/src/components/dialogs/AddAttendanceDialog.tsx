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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY']),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  hoursWorked: z.coerce.number().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAttendanceDialog({ open, onOpenChange, onSuccess }: AddAttendanceDialogProps) {
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
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema) as any,
    defaultValues: {
      status: 'PRESENT',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const status = watch('status');
  const employeeId = watch('employeeId');

  useEffect(() => {
    if (open) {
      fetchEmployees();
      reset();
      setValue('status', 'PRESENT');
      setValue('date', new Date().toISOString().split('T')[0]);
    }
  }, [open, reset, setValue]);

  const fetchEmployees = async () => {
    try {
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/employees`, { headers });
      setEmployees(res.data);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  const onSubmit = async (data: AttendanceFormData) => {
    setIsSubmitting(true);
    try {
      const headers = await getHeaders();
      const payload: any = {
        employeeId: data.employeeId,
        date: data.date,
        status: data.status,
        hoursWorked: data.hoursWorked || null,
      };
      // Combine date + time into full ISO timestamps for TIMESTAMPTZ columns
      if (data.checkIn) {
        payload.checkIn = `${data.date}T${data.checkIn}:00`;
      }
      if (data.checkOut) {
        payload.checkOut = `${data.date}T${data.checkOut}:00`;
      }
      await axios.post(`${API_BASE_URL}/api/hr/attendance`, payload, { headers });
      toast.success('Attendance recorded successfully!');
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to record attendance';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Record Attendance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="employee">Employee</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {employeeId
                    ? employees.find((emp) => emp.id === employeeId)?.firstName + ' ' + employees.find((emp) => emp.id === employeeId)?.lastName
                    : "Select employee..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employee..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.firstName} ${emp.lastName}`}
                          onSelect={() => {
                            setValue('employeeId', emp.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              employeeId === emp.id ? "opacity-100" : "opacity-0"
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
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => setValue('status', value as any)} defaultValue="PRESENT">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check In</Label>
                <Input id="checkIn" type="time" {...register('checkIn')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input id="checkOut" type="time" {...register('checkOut')} />
              </div>
            </div>
          )}

           {(status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY') && (
             <div className="space-y-2">
                <Label htmlFor="hoursWorked">Hours Worked</Label>
                <Input id="hoursWorked" type="number" step="0.5" {...register('hoursWorked')} placeholder="e.g. 8.0" />
             </div>
           )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
