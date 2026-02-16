import { useState } from 'react';
import { AlertTriangle, TrendingUp, Clock, BarChart3, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LowStockItem {
  name: string;
  current: number;
  reorderPoint: number;
}

interface SalesInsightsPanelProps {
  lowStockItems: LowStockItem[];
  forecasts: {
      nextDay: number;
      nextWeek: number;
      nextMonth: number;
  };
  peakSalesDay: string;
  peakSalesHour: string;
  topPerformingCategory: string;
  discountedOrdersPercentage: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesInsightsPanel({
  lowStockItems,
  forecasts,
  peakSalesDay,
  peakSalesHour,
  topPerformingCategory,
  discountedOrdersPercentage,
}: SalesInsightsPanelProps) {
  const [forecastPeriod, setForecastPeriod] = useState<string>('month');

  const getForecastValue = () => {
      switch(forecastPeriod) {
          case 'day': return forecasts.nextDay;
          case 'week': return forecasts.nextWeek;
          case 'month': return forecasts.nextMonth;
          default: return forecasts.nextMonth;
      }
  };

  const getForecastLabel = () => {
      switch(forecastPeriod) {
          case 'day': return 'Tomorrow';
          case 'week': return 'Next Week';
          case 'month': return 'Next Month';
          default: return 'Next Month';
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Low Stock Alerts */}
      <Card className="border-warning/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
          </div>
          <CardDescription>Products running low</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products are well stocked</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 3).map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{item.current}/{item.reorderPoint}</span>
                  </div>
                  <Progress
                    value={(item.current / item.reorderPoint) * 100}
                    className="h-2"
                  />
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{lowStockItems.length - 3} more items
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Forecast */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Revenue Forecast</CardTitle>
              </div>
              <CardDescription>Predicted for {getForecastLabel()}</CardDescription>
          </div>
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Tomorrow</SelectItem>
              <SelectItem value="week">Next Week</SelectItem>
              <SelectItem value="month">Next Month</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-primary">{formatCurrency(getForecastValue())}</p>
            <p className="text-sm text-muted-foreground">
              Based on current trends and historical data
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                AI Prediction
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Sales Times */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent-foreground" />
            <CardTitle className="text-base">Peak Sales Times</CardTitle>
          </div>
          <CardDescription>When customers buy most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Best Day</span>
              <Badge variant="secondary">{peakSalesDay}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Best Hour</span>
              <Badge variant="secondary">{peakSalesHour}</Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Schedule promotions during peak times for maximum impact
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Category */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-success" />
            <CardTitle className="text-base">Top Category</CardTitle>
          </div>
          <CardDescription>Best performing category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xl font-bold">{topPerformingCategory}</p>
            <p className="text-sm text-muted-foreground">
              Leading in revenue this period
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Discount Performance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">Discount Usage</CardTitle>
          </div>
          <CardDescription>Orders with discounts applied</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{discountedOrdersPercentage}%</p>
            <Progress value={discountedOrdersPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              of orders used promotional codes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
