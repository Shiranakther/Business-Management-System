import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/stores/appStore';
import { Order, InventoryItem } from '@/types';
import { subDays, isAfter, startOfDay } from 'date-fns';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

interface SalesChartsSectionProps {
  orders: Order[]; // Raw orders (or globally filtered, but we will filter further)
  inventoryItems: InventoryItem[];
  customerAcquisition: { month: string; new: number; returning: number }[]; // Keeping this passed down as it's mocked/complex
  goalProgress: { actual: number; target: number };
  onTargetChange?: (target: number) => void;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function SalesChartsSection({
  orders,
  inventoryItems,
  customerAcquisition,
  goalProgress,
  onTargetChange,
}: SalesChartsSectionProps) {
  const currentTenant = useAppStore((state) => state.currentTenant);
  const currency = currentTenant?.settings.currency || 'LKR';

  // Individual Filter States
  const [revenueRange, setRevenueRange] = useState<TimeRange>('all');
  const [statusRange, setStatusRange] = useState<TimeRange>('all');
  const [categoryRange, setCategoryRange] = useState<TimeRange>('all');
  const [productsRange, setProductsRange] = useState<TimeRange>('all');
  const [dayRange, setDayRange] = useState<TimeRange>('all');
  const [velocityRange, setVelocityRange] = useState<TimeRange>('all');
  
  // Goal Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(goalProgress.target.toString());

  const handleSaveGoal = () => {
      const val = parseFloat(tempTarget);
      if (!isNaN(val) && val > 0 && onTargetChange) {
          onTargetChange(val);
          setIsEditing(false);
      }
  };

  // Helper to filter orders
  const getFilteredOrders = (range: TimeRange) => {
    if (range === 'all') return orders;
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = subDays(startOfDay(now), days);
    return orders.filter(o => isAfter(new Date(o.createdAt), cutoff));
  };

  // 1. Revenue Data
  const revenueData = useMemo(() => {
    const filtered = getFilteredOrders(revenueRange);
    const monthMap = new Map<string, { revenue: number; expenses: number }>();
    const sorted = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Create map for cost
    const invMap = new Map(inventoryItems.map(i => [i.id, i]));

    sorted.forEach(order => {
        const date = new Date(order.createdAt);
        // If range is short (7d), maybe show by Day? For now keeping Month for consistency or dynamic?
        // If 7d, showing "Jan" one bar is boring. Let's make it dynamic based on range?
        // For simplicity of this task, I will stick to the existing "Month" grouping BUT if data is essentially one month, it shows one point.
        // Actually, for "7d", day-by-day is better.
        const key = revenueRange === '7d' || revenueRange === '30d' 
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : date.toLocaleDateString('en-US', { month: 'short' });

        let cost = 0;
        order.items.forEach(item => {
            const inv = invMap.get(item.inventoryItemId);
            if (inv?.costPrice) cost += inv.costPrice * item.quantity;
        });

        const current = monthMap.get(key) || { revenue: 0, expenses: 0 };
        monthMap.set(key, { revenue: current.revenue + order.total, expenses: current.expenses + cost });
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data }));
  }, [orders, revenueRange, inventoryItems]);

  // 2. Status Data
  const salesByStatus = useMemo(() => {
     const filtered = getFilteredOrders(statusRange);
     return [
        { name: 'Paid', value: filtered.filter(o => o.paymentStatus === 'PAID').length },
        { name: 'Pending', value: filtered.filter(o => o.paymentStatus === 'PENDING').length },
        { name: 'Refunded', value: filtered.filter(o => o.paymentStatus === 'REFUNDED').length },
     ].filter(i => i.value > 0);
  }, [orders, statusRange]);

  // 3. Category Data
  const salesByCategory = useMemo(() => {
      const filtered = getFilteredOrders(categoryRange);
      const catMap = new Map<string, { revenue: number; orders: number }>();
      filtered.forEach(order => {
          order.items.forEach(item => {
              const inv = inventoryItems.find(i => i.id === item.inventoryItemId);
              const cat = inv?.category || 'Uncategorized';
              const curr = catMap.get(cat) || { revenue: 0, orders: 0 };
              catMap.set(cat, { revenue: curr.revenue + item.total, orders: curr.orders + 1 });
          });
      });
      return Array.from(catMap.entries())
        .map(([category, d]) => ({ category, ...d }))
        .sort((a,b) => b.revenue - a.revenue);
  }, [orders, categoryRange, inventoryItems]);

  // 4. Top Products
  const topProducts = useMemo(() => {
      const filtered = getFilteredOrders(productsRange);
      const prodMap = new Map<string, { name: string, sales: number, revenue: number }>();
      filtered.forEach(order => {
          order.items.forEach(item => {
              const curr = prodMap.get(item.inventoryItemId) || { name: item.name, sales: 0, revenue: 0 };
              prodMap.set(item.inventoryItemId, {
                  name: item.name,
                  sales: curr.sales + item.quantity,
                  revenue: curr.revenue + item.total
              });
          });
      });
      return Array.from(prodMap.values()).sort((a,b) => b.sales - a.sales).slice(0, 5);
  }, [orders, productsRange]);

  // 5. Day of Week
  const salesByDayOfWeek = useMemo(() => {
      const filtered = getFilteredOrders(dayRange);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = days.map(d => ({ day: d, orders: 0, revenue: 0 }));
      filtered.forEach(order => {
          const d = new Date(order.createdAt).getDay();
          data[d].orders++;
          data[d].revenue += order.total;
      });
      return data;
  }, [orders, dayRange]);

  // 6. Velocity
  const salesVelocity = useMemo(() => {
      const filtered = getFilteredOrders(velocityRange);
      const dateMap = new Map<string, number>();
      const sorted = [...filtered].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      sorted.forEach(order => {
          const d = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateMap.set(d, (dateMap.get(d) || 0) + 1);
      });
      return Array.from(dateMap.entries()).map(([date, count]) => ({ date, orders: count }));
  }, [orders, velocityRange]);

  const goalPercentage = (goalProgress.actual / goalProgress.target) * 100;

  // Reusable Header Component
  const ChartHeader = ({ title, desc, value, onChange }: { title: string, desc: string, value: TimeRange, onChange: (v: TimeRange) => void }) => (
      <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
          </div>
          <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
              <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
          </Select>
      </CardHeader>
  );

  return (
    <div className="space-y-6">
      {/* Goal Progress - Kept Global/Simple */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle className="text-lg">Revenue Goal Progress</CardTitle>
                  <CardDescription>Target: {formatCurrency(goalProgress.target)}</CardDescription>
              </div>
              {onTargetChange && (
                  <Popover open={isEditing} onOpenChange={setIsEditing}>
                      <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                          <div className="space-y-2">
                              <h4 className="font-medium leading-none">Set Revenue Goal</h4>
                              <p className="text-sm text-muted-foreground">Enter monthly revenue target.</p>
                              <div className="flex gap-2">
                                  <Input type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} placeholder="1000000" />
                                  <Button size="icon" onClick={handleSaveGoal}><Check className="h-4 w-4" /></Button>
                              </div>
                          </div>
                      </PopoverContent>
                  </Popover>
              )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Actual: {formatCurrency(goalProgress.actual)}</span>
              <span className={goalPercentage >= 100 ? 'text-success' : 'text-warning'}>{goalPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${goalPercentage >= 100 ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${Math.min(goalPercentage, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <ChartHeader title="Revenue Trend" desc="Revenue vs Expenses" value={revenueRange} onChange={setRevenueRange} />
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value: any) => `${currency} ${Number(value) / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <ChartHeader title="Payment Status" desc="Order status distribution" value={statusRange} onChange={setStatusRange} />
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByStatus}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {salesByStatus.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <ChartHeader title="Sales by Category" desc="Revenue by category" value={categoryRange} onChange={setCategoryRange} />
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%" cy="50%" outerRadius={80}
                    dataKey="revenue"
                    nameKey="category"
                    label={({ category, percent }: any) => `${category} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {salesByCategory.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <ChartHeader title="Top Products" desc="Best selling items" value={productsRange} onChange={setProductsRange} />
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value: any) => `${currency} ${Number(value) / 1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Day of Week */}
        <Card>
          <ChartHeader title="Sales by Day of Week" desc="Weekly patterns" value={dayRange} onChange={setDayRange} />
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesByDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value: any) => `${currency} ${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value: any, name: any) => name === 'revenue' ? formatCurrency(Number(value)) : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="hsl(var(--primary))" name="Orders" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--success))" name="Revenue" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Acquisition (Mocked/Static for now so no filter header) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Acquisition</CardTitle>
            <CardDescription>New vs returning customers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={customerAcquisition}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} name="New Customers" />
                  <Area type="monotone" dataKey="returning" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="Returning" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Velocity */}
        <Card>
           <ChartHeader title="Sales Velocity" desc="Orders per day" value={velocityRange} onChange={setVelocityRange} />
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesVelocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
