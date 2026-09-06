import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DollarSign, FileText, Loader2, Check, X } from 'lucide-react';
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
import { AddSalaryAdvanceDialog } from '@/components/dialogs/AddSalaryAdvanceDialog';
import { CreatePaymentDialog } from '@/components/dialogs/CreatePaymentDialog';
import type { PayrollRecord, SalaryAdvanceRequest } from "@/types";
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

export function PayrollPanel() {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancesLoading, setAdvancesLoading] = useState(true);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/payroll`, { headers });
      const data = res.data.map((item: any) => ({
        ...item,
        payPeriodStart: new Date(item.payPeriodStart),
        payPeriodEnd: new Date(item.payPeriodEnd),
        paymentDate: item.paymentDate ? new Date(item.paymentDate) : undefined,
      }));
      setPayrollRecords(data);
    } catch (error) {
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvances = async () => {
    try {
      setAdvancesLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/advances`, { headers });
      const data = res.data.map((item: any) => ({
        ...item,
        requestDate: new Date(item.requestDate),
      }));
      setAdvances(data);
    } catch (error) {
      toast.error('Failed to load salary advances');
    } finally {
      setAdvancesLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
    fetchAdvances();
  }, []);

  const totalPayroll = payrollRecords.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
  const pendingAdvances = advances.filter(a => a.status === 'PENDING').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const avgNetSalary = payrollRecords.length > 0 ? totalPayroll / payrollRecords.length : 0;

  const handleAdvanceStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/hr/advances/${id}`, { status: newStatus }, { headers });
      toast.success(`Advance request ${newStatus.toLowerCase()} successfully`);
      fetchAdvances();
    } catch (error) {
      toast.error(`Failed to ${newStatus.toLowerCase()} advance request`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPayroll)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Advances</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(pendingAdvances)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Net Salary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgNetSalary)}</div>
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
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : payrollRecords.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No payroll records found.
                        </div>
                    ) : (
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
                                        <TableCell className="text-right text-success">+{formatCurrency(record.bonuses || 0)}</TableCell>
                                        <TableCell className="text-right text-destructive">-{formatCurrency(record.deductions || 0)}</TableCell>
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
                    )}
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
                    {advancesLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : advances.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No advance requests found.
                        </div>
                    ) : (
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
                                {advances.map((request: SalaryAdvanceRequest) => (
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
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="text-success hover:text-success hover:bg-success/10" onClick={() => handleAdvanceStatus(request.id, 'APPROVED')}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAdvanceStatus(request.id, 'REJECTED')}>
                                                        <X className="h-4 w-4" />
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
      </Tabs>
      
      <AddSalaryAdvanceDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog} onSuccess={fetchAdvances} />
      <CreatePaymentDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} onSuccess={fetchPayroll} />
    </div>
  );
}
