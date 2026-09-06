import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type OvertimeRecord = {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  type: string;
  multiplier: number;
  amount: number;
  notes?: string;
  approved: boolean;
  employee?: {
    firstName: string;
    lastName: string;
  };
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

const overtimeFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.5, "Hours must be at least 0.5"),
  type: z.enum(['NORMAL', 'SPECIAL', 'HOLIDAY', 'DOUBLE']),
  notes: z.string().optional(),
});

type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;

export function OvertimePanel() {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OvertimeFormValues>({
    resolver: zodResolver(overtimeFormSchema) as any,
    defaultValues: {
      employeeId: "",
      date: new Date().toISOString().split('T')[0],
      hours: 1,
      type: "NORMAL",
      notes: "",
    },
  });

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const headers = await getHeaders();
      const [recordsRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/hr/overtime`, { headers }),
        axios.get(`${API_BASE_URL}/api/hr/employees`, { headers }),
      ]);
      setRecords(recordsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load overtime records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/hr/overtime/${id}`, { approved: true }, { headers });
      toast.success('Overtime approved');
      fetchData();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to approve overtime');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const headers = await getHeaders();
      await axios.delete(`${API_BASE_URL}/api/hr/overtime/${id}`, { headers });
      toast.success('Overtime rejected/deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error('Failed to reject overtime');
    }
  };

  const onSubmit = async (values: OvertimeFormValues) => {
    try {
      setIsSubmitting(true);
      const headers = await getHeaders();
      await axios.post(`${API_BASE_URL}/api/hr/overtime`, values, { headers });
      toast.success('Overtime record created');
      setIsDialogOpen(false);
      form.reset();
      fetchData();
    } catch (error) {
      console.error('Failed to create:', error);
      toast.error('Failed to create overtime record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Overtime Management</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Manual Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Overtime Record</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" min="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal (1.5x)</SelectItem>
                          <SelectItem value="SPECIAL">Special (2.0x)</SelectItem>
                          <SelectItem value="HOLIDAY">Holiday (2.5x)</SelectItem>
                          <SelectItem value="DOUBLE">Double (2.0x)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Record
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Multiplier</TableHead>
              <TableHead className="text-right">Amount (LKR)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No overtime records found.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">{record.hours}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{record.multiplier}x</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(record.amount || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.approved ? (
                      <Badge variant="default" className="bg-success/10 text-success hover:bg-success/20">Approved</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!record.approved && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                          onClick={() => handleApprove(record.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(record.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
