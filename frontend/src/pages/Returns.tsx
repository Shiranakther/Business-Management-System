import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';
import { startOfDay, subDays, startOfMonth, subMonths, isAfter, isBefore, endOfDay } from 'date-fns';

interface Return {
  id: string;
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  refundAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter, customDateRange]);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/returns`, { headers });
      setReturns(res.data);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    if (!selectedReturn) return;
    try {
      setSubmitting(true);
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/returns/${selectedReturn.id}`, { status, notes }, { headers });
      toast.success(`Return status updated to ${status}`);
      setIsViewOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Failed to update return status:', error);
      toast.error('Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const openView = (ret: Return) => {
    setSelectedReturn(ret);
    setNotes(ret.notes || '');
    setIsViewOpen(true);
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;

    // Date Filter (using updated date as requested)
    const filterDate = new Date(r.updatedAt || r.createdAt);
    const now = new Date();
    let matchesDate = true;

    switch (dateFilter) {
      case 'today':
        matchesDate = isAfter(filterDate, startOfDay(now));
        break;
      case 'last24h':
        matchesDate = isAfter(filterDate, subDays(now, 1));
        break;
      case 'last7days':
        matchesDate = isAfter(filterDate, subDays(now, 7));
        break;
      case 'last30days':
        matchesDate = isAfter(filterDate, subDays(now, 30));
        break;
      case 'thisMonth':
        matchesDate = isAfter(filterDate, startOfMonth(now));
        break;
      case 'lastMonth': {
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const thisMonthStart = startOfMonth(now);
        matchesDate = isAfter(filterDate, lastMonthStart) && isBefore(filterDate, thisMonthStart);
        break;
      }
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
            matchesDate = isAfter(filterDate, startOfDay(customDateRange.from)) && isBefore(filterDate, endOfDay(customDateRange.to));
        } else if (customDateRange.from) {
            matchesDate = isAfter(filterDate, startOfDay(customDateRange.from));
        }
        break;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredReturns.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentReturns = filteredReturns.slice(indexOfFirstRow, indexOfLastRow);

  const totalReturns = returns.length;
  const pendingReturns = returns.filter(r => r.status === 'PENDING').length;
  const approvedReturns = returns.filter(r => r.status === 'APPROVED').length;
  const completedReturns = returns.filter(r => r.status === 'COMPLETED').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'APPROVED': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
      case 'COMPLETED': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
        <p className="text-muted-foreground">Manage order returns and refunds</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <RotateCcw className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReturns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedReturns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <RotateCcw className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReturns}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Return # or Order #..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
            <DateRangePicker 
                value={dateFilter}
                onValueChange={setDateFilter}
                customRange={customDateRange}
                onCustomRangeChange={setCustomDateRange}
                className="w-full sm:w-auto"
            />
        </div>
      </div>

      <div className="border rounded-md">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Return #</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Order #</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Refund Amount</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : currentReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-24 text-center text-muted-foreground">
                    No returns found matching your filters.
                  </td>
                </tr>
              ) : (
                currentReturns.map((ret) => (
                  <tr key={ret.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{ret.returnNumber}</td>
                    <td className="p-4 align-middle">{ret.orderNumber}</td>
                    <td className="p-4 align-middle">{ret.customerName}</td>
                    <td className="p-4 align-middle truncate max-w-[200px]" title={ret.reason}>{ret.reason}</td>
                    <td className="p-4 align-middle font-medium">{formatCurrency(ret.refundAmount)}</td>
                    <td className="p-4 align-middle">{new Date(ret.updatedAt || ret.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 align-middle">
                      {getStatusBadge(ret.status)}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button variant="ghost" size="sm" onClick={() => openView(ret)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredReturns.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <p>Rows per page:</p>
              <Select 
                value={rowsPerPage.toString()} 
                onValueChange={(val) => {
                  setRowsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>Review return details and update status.</DialogDescription>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Return #</div>
                  <div className="font-medium">{selectedReturn.returnNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Order #</div>
                  <div className="font-medium">{selectedReturn.orderNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Customer</div>
                  <div className="font-medium">{selectedReturn.customerName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Date</div>
                  <div className="font-medium">{new Date(selectedReturn.updatedAt || selectedReturn.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Refund Amount</div>
                  <div className="font-medium text-lg">{formatCurrency(selectedReturn.refundAmount)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Current Status</div>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Reason for Return</div>
                <div className="bg-muted p-3 rounded-md text-sm">{selectedReturn.reason}</div>
              </div>

              {(selectedReturn.status === 'PENDING' || selectedReturn.status === 'APPROVED') ? (
                <div className="space-y-2">
                  <Label htmlFor="notes">Process Notes</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Add notes about this return (optional)..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              ) : selectedReturn.notes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Process Notes</div>
                  <div className="bg-muted p-3 rounded-md text-sm">{selectedReturn.notes}</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)}>Close</Button>
            
            {selectedReturn?.status === 'PENDING' && (
              <>
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="w-full sm:w-auto"
                  onClick={() => handleUpdateStatus('REJECTED')}
                  disabled={submitting}
                >
                  Reject
                </Button>
                <Button 
                  type="button" 
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleUpdateStatus('APPROVED')}
                  disabled={submitting}
                >
                  Approve
                </Button>
              </>
            )}
            
            {selectedReturn?.status === 'APPROVED' && (
              <Button 
                type="button" 
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={submitting}
              >
                Mark as Completed (Refund & Restock)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
