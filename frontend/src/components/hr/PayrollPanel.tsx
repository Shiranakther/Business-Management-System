import { useState } from 'react';
import { format } from 'date-fns';
import { DollarSign, FileText } from 'lucide-react';
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
import { payrollRecords, salaryAdvanceRequests } from "@/data/mockData";
import { AddSalaryAdvanceDialog } from '@/components/dialogs/AddSalaryAdvanceDialog';
import { CreatePaymentDialog } from '@/components/dialogs/CreatePaymentDialog';
import type { PayrollRecord, SalaryAdvanceRequest } from "@/types";

const statusColors: Record<string, string> = {
  PAID: 'bg-success/10 text-success border-success/20',
  PROCESSED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  APPROVED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

export function PayrollPanel() {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll (Dec)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(13582)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Advances</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(1500)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Net Salary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(6791)}</div>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList>
            <TabsTrigger value="payroll">Payroll History</TabsTrigger>
            <TabsTrigger value="advances">Salary Advances</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payroll" className="mt-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Payroll History</CardTitle>
                            <CardDescription>View processed salaries and payments</CardDescription>
                        </div>
                        <Button onClick={() => setShowPaymentDialog(true)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Run Payroll
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Basic</TableHead>
                                <TableHead className="text-right">Additions</TableHead>
                                <TableHead className="text-right">Deductions</TableHead>
                                <TableHead className="text-right">Net Pay</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Payment Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payrollRecords.map((record: PayrollRecord) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                                    <TableCell>{format(record.payPeriodStart, 'MMM yyyy')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(record.basicSalary)}</TableCell>
                                    <TableCell className="text-right text-success">+{formatCurrency(record.bonuses)}</TableCell>
                                    <TableCell className="text-right text-destructive">-{formatCurrency(record.deductions)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(record.netSalary)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusColors[record.status]}>
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {record.paymentDate ? format(record.paymentDate, 'MMM d, yyyy') : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="advances" className="mt-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Salary Advance Requests</CardTitle>
                            <CardDescription>Manage employee advance requests</CardDescription>
                        </div>
                        <Button variant="secondary" onClick={() => setShowAdvanceDialog(true)}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            New Request
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salaryAdvanceRequests.map((request: SalaryAdvanceRequest) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.employeeName}</TableCell>
                                    <TableCell>{format(request.requestDate, 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{request.reason}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(request.amount)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusColors[request.status]}>
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {request.status === 'PENDING' && (
                                            <Button variant="outline" size="sm">Review</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <AddSalaryAdvanceDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog} />
      <CreatePaymentDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} />
    </div>
  );
}
