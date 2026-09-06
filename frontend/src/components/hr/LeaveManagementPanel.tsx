import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, X, Plus, List, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { AddLeaveRequestDialog } from '@/components/dialogs/AddLeaveRequestDialog';
import { LeaveCalendarView } from './LeaveCalendarView';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  APPROVED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
  PENDING: 'bg-warning/10 text-warning border-warning/20',
};

export function LeaveManagementPanel() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { canCreate, canUpdate } = usePermissions();

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/leaves`, { headers });
      setLeaveRequests(res.data.map((l: any) => ({
        ...l,
        startDate: new Date(l.startDate),
        endDate: new Date(l.endDate),
      })));
    } catch (error) {
      console.error('Error fetching leaves', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/hr/leaves/${id}`, { status }, { headers });
      toast.success(`Leave request ${status.toLowerCase()}`);
      fetchLeaves();
    } catch (error) {
      console.error('Error updating status', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : leaveRequests.filter(r => r.status === 'PENDING').length}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">On Leave Today</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : leaveRequests.filter(r => r.status === 'APPROVED' && r.startDate <= new Date() && r.endDate >= new Date()).length}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Month</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : leaveRequests.filter(r => r.status === 'APPROVED' && r.startDate.getMonth() === new Date().getMonth()).length}
                </div>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="list" className="gap-2">
                    <List className="w-4 h-4" />
                    List View
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Calendar View
                </TabsTrigger>
            </TabsList>
            
            {canCreate('hr') && (
                <Button size="sm" className="gap-2" onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4" />
                    New Request
                </Button>
            )}
        </div>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>Manage employee leave applications</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-4">No leave requests found</TableCell></TableRow>
                    ) : leaveRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{request.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                              {format(request.startDate, 'MMM d')} - {format(request.endDate, 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={request.reason}>{request.reason}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[request.status]}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'PENDING' && canUpdate('hr') && (
                              <div className="flex justify-end gap-2">
                                  <Button size="icon" variant="ghost" onClick={() => handleUpdateStatus(request.id, 'APPROVED')} className="h-8 w-8 text-success hover:text-success hover:bg-success/10">
                                      <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleUpdateStatus(request.id, 'REJECTED')} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                      <X className="w-4 h-4" />
                                  </Button>
                              </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-0">
          <LeaveCalendarView leaveRequests={leaveRequests} />
        </TabsContent>
      </Tabs>
      
      <AddLeaveRequestDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onSuccess={fetchLeaves}
      />
    </div>
  );
}
