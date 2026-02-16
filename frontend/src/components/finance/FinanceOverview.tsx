import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subDays, differenceInDays, isSameDay, isSameMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';

export function FinanceOverview() {
  const currentTenant = useAppStore((state) => state.currentTenant);
  const currency = currentTenant?.settings.currency || 'LKR';

  const [orders, setOrders] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRangePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [ordersRes, expensesRes] = await Promise.all([
            axios.get('http://localhost:5000/api/orders', { headers }),
            axios.get('http://localhost:5000/api/expenses', { headers })
        ]);

        setOrders(ordersRes.data);
        setExpensesList(expensesRes.data);
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get start/end dates from preset
  const getDateRangeInterval = () => {
      const now = new Date();
      let start = startOfMonth(now);
      let end = endOfDay(now);

      if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
          return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
      }

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
              end = endOfMonth(subMonths(now, 1));
              break;
          case 'all':
              start = new Date(0); // Beginning of time
              end = now;
              break;
      }
      return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRangeInterval();

  // Filter Data by Date
  const filteredData = useMemo(() => {
      const filteredOrders = orders.filter(o => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          if (isNaN(d.getTime())) return false;
          return isWithinInterval(d, { start: rangeStart, end: rangeEnd }) && o.status !== 'CANCELLED';
      });

      const filteredExpenses = expensesList.filter(e => {
          if (!e.incurredDate) return false;
          const d = new Date(e.incurredDate);
          if (isNaN(d.getTime())) return false;
          return isWithinInterval(d, { start: rangeStart, end: rangeEnd }) && e.status !== 'REJECTED';
      });

      return { orders: filteredOrders, expenses: filteredExpenses };
  }, [orders, expensesList, rangeStart, rangeEnd]);

  // Summary Metrics (Cards)
  const summaryMetrics = useMemo(() => {
      const revenue = filteredData.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const expenses = filteredData.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Calculate Previous Period for "Change"
      // Simple logic: subtract the duration from the start date to get previous period
      const duration = rangeEnd.getTime() - rangeStart.getTime();
      const prevStart = new Date(rangeStart.getTime() - duration);
      const prevEnd = new Date(rangeEnd.getTime() - duration);

      const prevOrders = orders.filter(o => {
          const d = new Date(o.createdAt);
          return isWithinInterval(d, { start: prevStart, end: prevEnd }) && o.status !== 'CANCELLED';
      });
      const prevExpenses = expensesList.filter(e => {
           const d = new Date(e.incurredDate);
           return isWithinInterval(d, { start: prevStart, end: prevEnd }) && e.status !== 'REJECTED';
      });

      const prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const prevExpTotal = prevExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      const expensesChange = prevExpTotal > 0 ? ((expenses - prevExpTotal) / prevExpTotal) * 100 : 0;

      return { revenue, expenses, profit, margin, revenueChange, expensesChange };
  }, [filteredData, orders, expensesList, rangeStart, rangeEnd]);


  // Chart Data (Bar Chart)
  const chartData = useMemo(() => {
      const daysDiff = differenceInDays(rangeEnd, rangeStart);
      const isMonthly = daysDiff > 60; // Group by month if range > 60 days
      
      let intervals;
      if (isMonthly) {
          intervals = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
      } else {
          intervals = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      }

      return intervals.map(date => {
          const label = isMonthly ? format(date, 'MMM yyyy') : format(date, 'MMM dd');
          
          // Filter for this specific interval (day or month)
          const intervalOrders = filteredData.orders.filter(o => {
              const d = new Date(o.createdAt);
              return isMonthly ? isSameMonth(d, date) : isSameDay(d, date);
          });
          
          const intervalExpenses = filteredData.expenses.filter(e => {
              const d = new Date(e.incurredDate);
              return isMonthly ? isSameMonth(d, date) : isSameDay(d, date);
          });

          return {
              name: label,
              revenue: intervalOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
              expenses: intervalExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
          };
      });
  }, [filteredData, rangeStart, rangeEnd]);

  // Expense by Category (Pie Chart) - uses filtered data
  const expenseByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    filteredData.expenses.forEach(e => {
         data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.keys(data).map(key => ({
      name: key,
      value: data[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  if (loading) return <div className="h-[200px] flex items-center justify-center">Loading...</div>;

  return (
    <div className="space-y-6">
      
      {/* Date Filter */}
      <div className="flex justify-end">
          <DateRangePicker 
            value={dateRange}
            onValueChange={setDateRange}
            customRange={customDateRange}
            onCustomRangeChange={setCustomDateRange}
            align="end"
            className="w-full sm:w-auto"
          />
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.revenue)}</div>
             <p className={`text-xs ${summaryMetrics.revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                 {summaryMetrics.revenueChange >= 0 ? '+' : ''}{summaryMetrics.revenueChange.toFixed(1)}% from prev. period
             </p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.expenses)}</div>
             <p className={`text-xs ${summaryMetrics.expensesChange <= 0 ? 'text-success' : 'text-destructive'}`}>
                 {summaryMetrics.expensesChange > 0 ? '+' : ''}{summaryMetrics.expensesChange.toFixed(1)}% from prev. period
             </p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
           </CardHeader>
           <CardContent>
             <div className={`text-2xl font-bold ${summaryMetrics.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                 {formatCurrency(summaryMetrics.profit)}
             </div>
             <p className="text-xs text-muted-foreground">Margin: {summaryMetrics.margin.toFixed(1)}%</p>
           </CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Run Rate (Annual)</CardTitle>
           </CardHeader>
           <CardContent>
             {/* Simple projection: Average daily revenue of selection * 365 */}
             <div className="text-2xl font-bold">
                {formatCurrency((summaryMetrics.revenue / (Math.max(1, differenceInDays(rangeEnd, rangeStart)))) * 365)}
             </div>
             <p className="text-xs text-muted-foreground">Projected based on selection</p>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue vs Expenses Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Revenue vs Expenses ({format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                  <YAxis 
                      tickFormatter={(value) => `${currency} ${value / 1000}k`}
                      width={80}
                  />
                  <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
            <CardDescription>Breakdown by Category ({format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')})</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[350px] w-full min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {expenseByCategory.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
