import { useState } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
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
import { attendanceRecords } from "@/data/mockData";
import { usePermissions } from '@/hooks/usePermissions';
import { AddAttendanceDialog } from '@/components/dialogs/AddAttendanceDialog';
import type { AttendanceRecord } from "@/types";

const statusColors: Record<string, string> = {
  PRESENT: 'bg-success/10 text-success border-success/20',
  ABSENT: 'bg-destructive/10 text-destructive border-destructive/20',
  LATE: 'bg-warning/10 text-warning border-warning/20',
  HALF_DAY: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export function AttendancePanel() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { canCreate } = usePermissions();

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
              {attendanceRecords.map((record: AttendanceRecord) => (
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
        </CardContent>
      </Card>
      
      <AddAttendanceDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </>
  );
}
