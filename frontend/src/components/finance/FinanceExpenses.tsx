import { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Loader2, Trash2, Edit, MoreHorizontal, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, subMonths } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { toast } from 'sonner';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-warning/10 text-warning border-warning/20',
  APPROVED: 'bg-success/10 text-success border-success/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusIcons: Record<string, React.ElementType> = {
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

interface FinanceExpensesProps {
    refreshTrigger?: number;
}

export function FinanceExpenses({ refreshTrigger = 0 }: FinanceExpensesProps) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRangePreset>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [expensesRes, suppliersRes] = await Promise.all([
            axios.get('http://localhost:5000/api/expenses', { headers }),
            axios.get('http://localhost:5000/api/suppliers', { headers })
        ]);

        setExpenses(expensesRes.data);
        setSuppliers(suppliersRes.data);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        toast.error('Failed to load expenses');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this expense?')) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        
        await axios.delete(`http://localhost:5000/api/expenses/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        toast.success('Expense deleted successfully');
        fetchData(); // Refresh list
      } catch (error) {
          console.error('Delete error', error);
          toast.error('Failed to delete expense');
      }
  };

  const categories = [...new Set(expenses.map(e => e.category))];

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || (expense.supplierId === supplierFilter);
    
    // Date Filtering
    let matchesDate = true;
    const expenseDate = new Date(expense.incurredDate);
    const now = new Date();

    if (dateRange !== 'all') {
        if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
             matchesDate = isWithinInterval(expenseDate, { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) });
        } else {
             let start, end;
             switch (dateRange) {
                 case 'today':
                     start = startOfDay(now);
                     end = endOfDay(now);
                     break;
                 case 'last24h':
                     start = subDays(now, 1);
                     end = now;
                     break;
                 case 'last7days':
                     start = subDays(now, 7);
                     end = now;
                     break;
                 case 'last30days':
                     start = subDays(now, 30);
                     end = now;
                     break;
                 case 'thisMonth':
                     start = startOfMonth(now);
                     end = endOfDay(now);
                     break;
                 case 'lastMonth':
                     start = startOfMonth(subMonths(now, 1));
                     end = endOfDay(subMonths(startOfMonth(now), 0)); // End of last month? actually date-fns endOfMonth(subMonths(now, 1))
                     break;
             }
             if (start) {
                  // Fix for lastMonth end calculation if needed, but simplified:
                  if (dateRange === 'lastMonth') {
                      const lastMonthStart = startOfMonth(subMonths(now, 1));
                      const lastMonthEnd = subDays(startOfMonth(now), 1);
                      matchesDate = isWithinInterval(expenseDate, { start: lastMonthStart, end: endOfDay(lastMonthEnd) });
                  } else {
                      matchesDate = isWithinInterval(expenseDate, { start, end: end || now });
                  }
             }
        }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesDate;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                 <CardTitle>Expense Management</CardTitle>
                 <CardDescription>Track and approve business expenses</CardDescription>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" size="icon" onClick={fetchData} title="Refresh">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                 </Button>
                 <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                 </Button>
              </div>
           </div>
        </CardHeader>
        <CardContent>
          {/* Advanced Filters Toolbar */}
          <div className="flex flex-col xl:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
             <div className="relative flex-1 min-w-[200px] flex items-center">
               <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search description or category..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10 bg-background"
               />
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xl:flex xl:gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full xl:w-[160px] bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full xl:w-[160px] bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-full xl:w-[160px] bg-background">
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(s => (
                       <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DateRangePicker 
                    value={dateRange}
                    onValueChange={setDateRange}
                    customRange={customDateRange}
                    onCustomRangeChange={setCustomDateRange}
                    className="w-full xl:w-auto"
                    align="end"
                    showSelectedTag={false}
                />
             </div>
          </div>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "No expenses found matching your filters."}
                            </td>
                        </tr>
                    )}
                    {!loading && filteredExpenses.map((expense) => {
                      const StatusIcon = statusIcons[expense.status] || Clock;
                      return (
                        <tr key={expense.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {expense.description}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="font-normal">
                                {expense.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {expense.supplierName || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-base">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {format(new Date(expense.incurredDate), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={`gap-1 ${statusColors[expense.status]}`}>
                              <StatusIcon className="w-3 h-3" />
                              {expense.status === 'PENDING_APPROVAL' ? 'Pending' : expense.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => toast.info('View details not implemented yet')}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info('Edit not implemented yet')}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(expense.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
             <div>Showing {filteredExpenses.length} records</div>
             <div className="flex gap-2">
               <Button variant="outline" size="sm" disabled>Previous</Button>
               <Button variant="outline" size="sm" disabled>Next</Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
