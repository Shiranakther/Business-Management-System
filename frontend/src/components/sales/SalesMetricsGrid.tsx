import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, RefreshCcw, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconClass: string;
  compact?: boolean;
}

function MetricCard({ title, value, change, changeLabel, icon, iconBgClass, iconClass, compact = false }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card className="stat-card hover:shadow-lg transition-shadow">
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-3">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-3">
            <div className={`rounded-xl ${compact ? "p-2" : "p-3"} ${iconBgClass}`}>
              <div className={iconClass}>{icon}</div>
            </div>
            <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
          </div>

          {/* Value and Change */}
          <div className="space-y-1">
            <p className={`${compact ? "text-xl" : "text-2xl"} font-bold tracking-tight text-foreground`}>{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-semibold">{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                {changeLabel && <span className="text-xs text-muted-foreground ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SalesMetricsGridProps {
  totalRevenue: number;
  revenueChange: number;
  paidOrders: number;
  ordersChange: number;
  averageOrderValue: number;
  aovChange: number;
  conversionRate: number;
  totalCustomers: number;
  newCustomers: number;
  refundRate: number;
  refundedAmount: number;
  pendingRevenue: number;
  avgItemsPerOrder: number;
  customerLifetimeValue: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesMetricsGrid({
  totalRevenue,
  revenueChange,
  paidOrders,
  ordersChange,
  averageOrderValue,
  aovChange,
  conversionRate,
  totalCustomers,
  newCustomers,
  refundRate,
  refundedAmount,
  pendingRevenue,
  avgItemsPerOrder,
  customerLifetimeValue,
}: SalesMetricsGridProps) {
  return (
    <div className="space-y-4">
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          change={revenueChange}
          changeLabel="vs previous period"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgClass="bg-success/10"
          iconClass="text-success"
        />
        <MetricCard
          title="Paid Orders"
          value={paidOrders.toString()}
          change={ordersChange}
          changeLabel="vs previous period"
          icon={<ShoppingCart className="w-5 h-5" />}
          iconBgClass="bg-primary/10"
          iconClass="text-primary"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(averageOrderValue)}
          change={aovChange}
          changeLabel="vs previous period"
          icon={<Package className="w-5 h-5" />}
          iconBgClass="bg-accent/10"
          iconClass="text-accent"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgClass="bg-warning/10"
          iconClass="text-warning"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Customers"
          value={totalCustomers.toString()}
          icon={<Users className="w-5 h-5" />}
          iconBgClass="bg-primary/10"
          iconClass="text-primary"
          compact={true}
        />
        <MetricCard
          title="New Customers"
          value={newCustomers.toString()}
          icon={<Users className="w-5 h-5" />}
          iconBgClass="bg-success/10"
          iconClass="text-success"
          compact={true}
        />
        <MetricCard
          title="Refund Rate"
          value={`${refundRate.toFixed(1)}%`}
          icon={<RefreshCcw className="w-5 h-5" />}
          iconBgClass="bg-destructive/10"
          iconClass="text-destructive"
          compact={true}
        />
        <MetricCard
          title="Refunded Amount"
          value={formatCurrency(refundedAmount)}
          icon={<RefreshCcw className="w-5 h-5" />}
          iconBgClass="bg-destructive/10"
          iconClass="text-destructive"
          compact={true}
        />
        <MetricCard
          title="Pending Revenue"
          value={formatCurrency(pendingRevenue)}
          icon={<Clock className="w-5 h-5" />}
          iconBgClass="bg-warning/10"
          iconClass="text-warning"
          compact={true}
        />
        <MetricCard
          title="Avg Items/Order"
          value={avgItemsPerOrder.toFixed(1)}
          icon={<Package className="w-5 h-5" />}
          iconBgClass="bg-accent/10"
          iconClass="text-accent"
          compact={true}
        />
      </div>

      {/* CLV Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Customer Lifetime Value (CLV)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(customerLifetimeValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Based on {totalCustomers} customers</p>
              <p className="text-xs text-muted-foreground">Total historical spend</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
