import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const shiftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakDuration: z.number().min(0).default(0),
  isNightShift: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});

const assignmentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  shiftId: z.string().min(1, 'Shift is required'),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  effectiveTo: z.string().optional(),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export function ShiftManagementPanel() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [employeeShifts, setEmployeeShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const shiftForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
      breakDuration: 0,
      isNightShift: false,
      isDefault: false,
    },
  });

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      employeeId: '',
      shiftId: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
    },
  });

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    };
  };

  const fetchShifts = async () => {
    try {
      const config = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/hr/shifts`, config);
      setShifts(response.data);
    } catch (error) {
      console.error('Error fetching shifts', error);
      toast.error('Failed to load shifts');
    }
  };

  const fetchEmployeeShifts = async () => {
    try {
      const config = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/hr/employee-shifts`, config);
      setEmployeeShifts(response.data);
    } catch (error) {
      console.error('Error fetching employee shifts', error);
      toast.error('Failed to load employee shifts');
    }
  };

  const fetchEmployees = async () => {
    try {
      const config = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/hr/employees`, config);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees', error);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchEmployeeShifts();
    fetchEmployees();
  }, []);

  const onShiftSubmit = async (data: ShiftFormValues) => {
    try {
      const config = await getAuthHeaders();
      if (editingShiftId) {
        await axios.put(`${API_BASE_URL}/hr/shifts/${editingShiftId}`, data, config);
        toast.success('Shift updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/hr/shifts`, data, config);
        toast.success('Shift created successfully');
      }
      setIsShiftDialogOpen(false);
      setEditingShiftId(null);
      shiftForm.reset();
      fetchShifts();
    } catch (error) {
      console.error('Error saving shift', error);
      toast.error('Failed to save shift');
    }
  };

  const onAssignmentSubmit = async (data: AssignmentFormValues) => {
    try {
      const config = await getAuthHeaders();
      await axios.post(`${API_BASE_URL}/hr/employee-shifts`, data, config);
      toast.success('Shift assigned successfully');
      setIsAssignmentDialogOpen(false);
      assignmentForm.reset();
      fetchEmployeeShifts();
    } catch (error) {
      console.error('Error assigning shift', error);
      toast.error('Failed to assign shift');
    }
  };

  const deleteShift = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      const config = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/hr/shifts/${id}`, config);
      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift', error);
      toast.error('Failed to delete shift');
    }
  };

  const deleteEmployeeShift = async (id: string) => {
    if (!window.confirm('Are you sure you want to unassign this shift?')) return;
    try {
      const config = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/hr/employee-shifts/${id}`, config);
      toast.success('Shift unassigned successfully');
      fetchEmployeeShifts();
    } catch (error) {
      console.error('Error unassigning shift', error);
      toast.error('Failed to unassign shift');
    }
  };

  const openEditShift = (shift: any) => {
    setEditingShiftId(shift.id);
    shiftForm.reset({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration || 0,
      isNightShift: shift.isNightShift || false,
      isDefault: shift.isDefault || false,
    });
    setIsShiftDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Shift Management</h2>
      </div>

      <Tabs defaultValue="definitions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="definitions">Shift Definitions</TabsTrigger>
          <TabsTrigger value="assignments">Employee Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions">
          <div className="flex justify-end mb-4">
            <Dialog open={isShiftDialogOpen} onOpenChange={(open) => {
              setIsShiftDialogOpen(open);
              if (!open) {
                setEditingShiftId(null);
                shiftForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingShiftId ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Shift Name</Label>
                    <Input id="name" {...shiftForm.register('name')} placeholder="e.g. Morning Shift" />
                    {shiftForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{shiftForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" type="time" {...shiftForm.register('startTime')} />
                      {shiftForm.formState.errors.startTime && (
                        <p className="text-sm text-red-500">{shiftForm.formState.errors.startTime.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" type="time" {...shiftForm.register('endTime')} />
                      {shiftForm.formState.errors.endTime && (
                        <p className="text-sm text-red-500">{shiftForm.formState.errors.endTime.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakDuration">Break Duration (mins)</Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      {...shiftForm.register('breakDuration', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isNightShift"
                      control={shiftForm.control}
                      render={({ field }) => (
                        <Checkbox
                          id="isNightShift"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isNightShift">Is Night Shift</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isDefault"
                      control={shiftForm.control}
                      render={({ field }) => (
                        <Checkbox
                          id="isDefault"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isDefault">Is Default Shift</Label>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit">{editingShiftId ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Break (mins)</TableHead>
                  <TableHead>Night Shift</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No shift definitions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.name}</TableCell>
                      <TableCell>{shift.startTime}</TableCell>
                      <TableCell>{shift.endTime}</TableCell>
                      <TableCell>{shift.breakDuration}</TableCell>
                      <TableCell>{shift.isNightShift ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{shift.isDefault ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditShift(shift)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => deleteShift(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="flex justify-end mb-4">
            <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Employee to Shift</DialogTitle>
                </DialogHeader>
                <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Controller
                      name="employeeId"
                      control={assignmentForm.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assignmentForm.formState.errors.employeeId && (
                      <p className="text-sm text-red-500">{assignmentForm.formState.errors.employeeId.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <Controller
                      name="shiftId"
                      control={assignmentForm.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {shift.name} ({shift.startTime} - {shift.endTime})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {assignmentForm.formState.errors.shiftId && (
                      <p className="text-sm text-red-500">{assignmentForm.formState.errors.shiftId.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="effectiveFrom">Effective From</Label>
                      <Input id="effectiveFrom" type="date" {...assignmentForm.register('effectiveFrom')} />
                      {assignmentForm.formState.errors.effectiveFrom && (
                        <p className="text-sm text-red-500">{assignmentForm.formState.errors.effectiveFrom.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                      <Input id="effectiveTo" type="date" {...assignmentForm.register('effectiveTo')} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit">Assign</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No shift assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeShifts.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                      </TableCell>
                      <TableCell>{assignment.shift?.name}</TableCell>
                      <TableCell>
                        {assignment.effectiveFrom ? format(new Date(assignment.effectiveFrom), 'PPP') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {assignment.effectiveTo ? format(new Date(assignment.effectiveTo), 'PPP') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => deleteEmployeeShift(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
