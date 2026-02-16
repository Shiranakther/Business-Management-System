import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Plus } from 'lucide-react';
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
import { leaveRequests } from "@/data/mockData";
import { usePermissions } from '@/hooks/usePermissions';
import { AddLeaveRequestDialog } from '@/components/dialogs/AddLeaveRequestDialog';
import type { LeaveRequest } from "@/types";

const statusColors: Record<string, string> = {
  APPROVED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
  PENDING: 'bg-warning/10 text-warning border-warning/20',
};

export function LeaveManagementPanel() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { canCreate } = usePermissions();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{leaveRequests.filter(r => r.status === 'PENDING').length}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">On Leave Today</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">1</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Month</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">5</div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>Manage employee leave applications</CardDescription>
          </div>
          {canCreate('hr') && (
            <Button size="sm" className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          )}
        </CardHeader>
        <CardContent>
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
              {leaveRequests.map((request: LeaveRequest) => (
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
                    {request.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success hover:bg-success/10">
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AddLeaveRequestDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
