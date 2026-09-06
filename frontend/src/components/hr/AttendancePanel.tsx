import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from '@/hooks/usePermissions';
import { AddAttendanceDialog } from '@/components/dialogs/AddAttendanceDialog';
import type { AttendanceRecord } from "@/types";
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  PRESENT: 'bg-success/10 text-success border-success/20',
  ABSENT: 'bg-destructive/10 text-destructive border-destructive/20',
  LATE: 'bg-warning/10 text-warning border-warning/20',
  HALF_DAY: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

export function AttendancePanel() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { canCreate } = usePermissions();

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/attendance`, { headers });
      const data = res.data.map((item: any) => ({
        ...item,
        date: new Date(item.date),
        checkIn: item.checkIn ? new Date(item.checkIn.includes('T') ? item.checkIn : `${item.date.split('T')[0]}T${item.checkIn}`) : undefined,
        checkOut: item.checkOut ? new Date(item.checkOut.includes('T') ? item.checkOut : `${item.date.split('T')[0]}T${item.checkOut}`) : undefined,
      }));
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Attendance Records</CardTitle>
          {canCreate('hr') && (
            <Button size="sm" className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
              Mark Attendance
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No attendance records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: AttendanceRecord) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                    <TableCell>{format(record.date, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{record.checkIn ? format(record.checkIn, 'h:mm a') : '-'}</TableCell>
                    <TableCell>{record.checkOut ? format(record.checkOut, 'h:mm a') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{record.hoursWorked || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AddAttendanceDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSuccess={fetchAttendance}
      />
    </>
  );
}
