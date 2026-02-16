import { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/appStore';
import { formatCurrency } from '@/lib/currency';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';
import { startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { toast } from 'sonner';
import type { Order, Customer, InventoryItem } from '@/types';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconColor: string;
}

function StatCard({ title, value, change, icon: Icon, iconColor }: StatCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card className="stat-card hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl", iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
          </div>

          {/* Value and Change */}
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <div className={cn(
              "flex items-center gap-1.5",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">{Math.abs(change).toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(date: string | Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  CONFIRMED: 'bg-primary/10 text-primary border-primary/20',
  SHIPPED: 'bg-accent/10 text-accent border-accent/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

// Chart colors matching theme
const COLORS = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
  chart: [
    'hsl(var(--primary))',
    'hsl(var(--accent))', 
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))'
  ]
};

export default function Dashboard() {
  const currentTenant = useAppStore((state) => state.currentTenant);
  const currency = currentTenant?.settings.currency || 'LKR';

  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateRangePreset>('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [ordersRes, customersRes, inventoryRes] = await Promise.all([
          axios.get('http://localhost:5000/api/orders', { headers }),
          axios.get('http://localhost:5000/api/customers', { headers }),
          axios.get('http://localhost:5000/api/inventory', { headers })
        ]);

        setOrders(ordersRes.data);
        setCustomers(customersRes.data);
        setInventoryItems(inventoryRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Determine Date Range
  const { from, to } = useMemo(() => {
    const now = new Date();
    let from: Date, to: Date;

    switch (dateFilter) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'last7days':
        from = startOfDay(subDays(now, 7));
        to = endOfDay(now);
        break;
      case 'last30days':
        from = startOfDay(subDays(now, 30));
        to = endOfDay(now);
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          from = startOfDay(customDateRange.from);
          to = endOfDay(customDateRange.to);
        } else {
          from = startOfDay(subDays(now, 30));
          to = endOfDay(now);
        }
        break;
      default:
        from = startOfDay(new Date('2020-01-01')); 
        to = endOfDay(now);
    }
    return { from, to };
  }, [dateFilter, customDateRange]);

  // 2. Filter Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return isWithinInterval(orderDate, { start: from, end: to });
    });
  }, [orders, from, to]);

  // 3. Aggregate Data for Charts

  // Sales Trend (Daily Revenue)
  const salesTrendData = useMemo(() => {
    if (loading) return [];
    
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const dataMap = new Map<string, number>();
    
    const showByMonth = diffDays > 60;
    
    if (showByMonth) {
      const currentDate = new Date(from);
      while (currentDate <= to) {
        const monthKey = format(currentDate, 'MMM yyyy');
        dataMap.set(monthKey, 0);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
      const days = eachDayOfInterval({ start: from, end: to });
      days.forEach(day => {
        dataMap.set(format(day, 'MMM dd'), 0); 
      });
    }

    filteredOrders.forEach(order => {
      if (order.status !== 'CANCELLED') {
        const dateKey = format(new Date(order.createdAt), showByMonth ? 'MMM yyyy' : 'MMM dd');
        dataMap.set(dateKey, (dataMap.get(dateKey) || 0) + order.total);
      }
    });

    const result = Array.from(dataMap.entries()).map(([date, revenue]) => ({
      date,
      revenue
    }));

    return result.sort((a, b) => {
      const dateA = showByMonth 
        ? new Date(a.date + ' 01') 
        : new Date(new Date().getFullYear() + ' ' + a.date);
      const dateB = showByMonth 
        ? new Date(b.date + ' 01') 
        : new Date(new Date().getFullYear() + ' ' + b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredOrders, from, to, loading]);

  // Inventory Status
  const inventoryStatus = useMemo(() => {
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;
      
      inventoryItems.forEach(item => {
          if (item.status === 'IN_STOCK') inStock++;
          else if (item.status === 'LOW_STOCK') lowStock++;
          else if (item.status === 'OUT_OF_STOCK') outOfStock++;
      });

      return [
        { name: 'In Stock', value: inStock, color: COLORS.success },
        { name: 'Low Stock', value: lowStock, color: COLORS.warning },
        { name: 'Out of Stock', value: outOfStock, color: COLORS.destructive },
      ];
  }, [inventoryItems]);

  // Payment Status
  const paymentStatusData = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let refunded = 0;

    filteredOrders.forEach(order => {
        if (order.paymentStatus === 'PAID') paid++;
        else if (order.paymentStatus === 'PENDING') pending++;
        else if (order.paymentStatus === 'REFUNDED') refunded++;
    });

    return [
       { name: 'Paid', value: paid, color: COLORS.success },
       { name: 'Pending', value: pending, color: COLORS.warning },
       { name: 'Refunded', value: refunded, color: COLORS.destructive }, 
    ].filter(i => i.value > 0);
  }, [filteredOrders]);

  // Category Performance
  const categoryPerformanceData = useMemo(() => {
      const catMap = new Map<string, number>();
      
      filteredOrders.forEach(order => {
          if (order.status !== 'CANCELLED') {
            order.items.forEach(item => {
                const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                const category = invItem?.category || 'Uncategorized';
                catMap.set(category, (catMap.get(category) || 0) + item.total);
            });
          }
      });
      
      return Array.from(catMap.entries())
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
  }, [filteredOrders, inventoryItems]);

  // Top Customers
  const topCustomersData = useMemo(() => {
      const custMap = new Map<string, { orders: number, spent: number, lastOrder: Date }>();
      
      filteredOrders.forEach(order => {
          if (order.status !== 'CANCELLED') {
              const current = custMap.get(order.customerName) || { orders: 0, spent: 0, lastOrder: new Date(0) };
              custMap.set(order.customerName, {
                  orders: current.orders + 1,
                  spent: current.spent + order.total,
                  lastOrder: new Date(order.createdAt) > current.lastOrder ? new Date(order.createdAt) : current.lastOrder
              });
          }
      });

      return Array.from(custMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);
  }, [filteredOrders]);

  // Low Stock Items
  const lowStockItemsData = useMemo(() => 
    inventoryItems
      .filter(item => item.quantityOnHand <= item.reorderPoint)
      .map(item => ({
          product: item.name,
          current: item.quantityOnHand,
          reorder: item.reorderPoint,
          urgency: item.quantityOnHand === 0 ? 'high' : 'medium'
      }))
      .slice(0, 5),
    [inventoryItems]
  );

  // Metrics (with Change %)
  const dashboardMetrics = useMemo(() => {
    // Current Period Metrics (based on filters)
    const currentRevenue = filteredOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);
    
    const currentOrders = filteredOrders.length;
    const currentInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantityOnHand * item.unitPrice), 0);
    
    // To calculate change, we need the "previous period"
    // For simplicity, let's assume "previous period" matches the duration of the current filter 
    // shifted back by that duration.
    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration);
    const prevTo = from;

    const prevOrdersData = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= prevFrom && d < prevTo;
    });

    const prevRevenue = prevOrdersData
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);
    
    const prevOrdersCount = prevOrdersData.length;

    // Calculate % changes
    const revenueChange = prevRevenue === 0 ? 100 : ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    const ordersChange = prevOrdersCount === 0 ? 100 : ((currentOrders - prevOrdersCount) / prevOrdersCount) * 100;
    
    // Inventory change is tricky without snapshots. defaulting to 0 or mock
    const inventoryChange = 0; 
    
    // Expenses (Mock for now, as no endpoints exist)
    const pendingExpenses = 0;
    const expensesChange = 0;

    return {
      revenue: currentRevenue,
      revenueChange,
      orders: currentOrders,
      ordersChange,
      inventoryValue: currentInventoryValue,
      inventoryChange,
      pendingExpenses,
      expensesChange,
    };
  }, [filteredOrders, orders, inventoryItems, from, to]);


  if (loading) {
      return (
          <div className="flex h-[80vh] items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome back! Here's an overview of your business performance.
        </p>
      </div>

      {/* Date Filter */}
      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <DateRangePicker
          value={dateFilter}
          customRange={customDateRange}
          onValueChange={setDateFilter}
          onCustomRangeChange={setCustomDateRange}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(dashboardMetrics.revenue)}
          change={dashboardMetrics.revenueChange} 
          icon={DollarSign}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Total Orders"
          value={dashboardMetrics.orders.toLocaleString()}
          change={dashboardMetrics.ordersChange}
          icon={ShoppingCart}
          iconColor="bg-accent/10 text-accent"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(dashboardMetrics.inventoryValue)} 
          change={dashboardMetrics.inventoryChange}
          icon={Package}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Pending Expenses"
          value={formatCurrency(dashboardMetrics.pendingExpenses)}
          change={dashboardMetrics.expensesChange}
          icon={Receipt}
          iconColor="bg-warning/10 text-warning"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${currency} ${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.accent}
                    strokeWidth={3}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ value }) => value}
                    labelLine={false}
                  >
                    {inventoryStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${currency} ${value / 1000}k`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill={COLORS.accent}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ value }) => value}
                    labelLine={false}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {paymentStatusData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                   No payment data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Orders</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomersData.length > 0 ? topCustomersData.map((customer, index) => (
                    <tr key={index} className="data-table-row">
                      <td className="py-3 px-2 font-medium">{customer.name}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground">{customer.orders}</td>
                      <td className="py-3 px-2 text-right font-medium text-success">{formatCurrency(customer.spent)}</td>
                    </tr>
                  )) : (
                    <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">No customers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Product</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Stock</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItemsData.length > 0 ? lowStockItemsData.map((item, index) => (
                    <tr key={index} className="data-table-row">
                      <td className="py-3 px-2 font-medium">{item.product}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground">{item.current}/{item.reorder}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge 
                          variant="outline" 
                          className={item.urgency === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}
                        >
                          {item.urgency === 'high' ? 'Critical' : 'Low'}
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">No low stock items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
          <a href="/orders" className="text-sm text-accent hover:underline">View all</a>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="data-table-row">
                    <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.customerName}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">No orders found for selected date range</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}