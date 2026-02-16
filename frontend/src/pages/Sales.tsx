
import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SalesFilterPanel } from '@/components/sales/SalesFilterPanel';
import type { SalesFilters } from '@/components/sales/SalesFilterPanel';
import { SalesMetricsGrid } from '@/components/sales/SalesMetricsGrid';
import { SalesChartsSection } from '@/components/sales/SalesChartsSection';
import { SalesDataTable } from '@/components/sales/SalesDataTable';
import { SalesInsightsPanel } from '@/components/sales/SalesInsightsPanel';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { toast } from 'sonner';
import type { Order, Customer, InventoryItem } from '@/types';
import { Loader2 } from 'lucide-react';

export default function Sales() {
  const [filters, setFilters] = useState<SalesFilters>({
    dateRange: { from: undefined, to: undefined },
    customers: [],
    categories: [],
    paymentStatus: [],
    orderStatus: [],
    salesChannel: [],
    priceRange: { min: undefined, max: undefined },
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error('Error fetching sales data:', error);
        toast.error('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get unique categories from inventory
  const categories = useMemo(() => 
    [...new Set(inventoryItems.map(item => item.category))].filter(Boolean),
    [inventoryItems]
  );

  // Customer list for filter (map to { id, name })
  const customerList = useMemo(() => 
    customers.map(c => ({ 
        id: c.id, 
        name: c.companyName || c.name || c.contactName || 'Unknown'
    })),
    [customers]
  );

  // Apply filters to orders
  // Apply filters to orders
  const filteredOrders = useMemo(() => {
    // Debug log
    console.log('Applying filters:', filters);

    return orders.filter(order => {
      // 1. Date Validation
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return false; // Invalid date
      
      // Date range filter
      if (filters.dateRange.from && orderDate < filters.dateRange.from) return false;
      if (filters.dateRange.to) {
          const endDate = new Date(filters.dateRange.to);
          endDate.setHours(23, 59, 59, 999);
          if (orderDate > endDate) return false;
      }

      // Customer filter
      if (filters.customers.length > 0 && (!order.customerId || !filters.customers.includes(order.customerId))) return false;

      // Payment status filter
      if (filters.paymentStatus.length > 0 && !filters.paymentStatus.includes(order.paymentStatus)) return false;

      // Order status filter
      if (filters.orderStatus.length > 0 && !filters.orderStatus.includes(order.status)) return false;

      // Category Filter (based on items in the order)
      if (filters.categories.length > 0) {
          if (!order.items || order.items.length === 0) return false;
          
          const orderCategories = new Set<string>();
          order.items.forEach(item => {
             // Find item in inventory to get category
             const invItem = inventoryItems?.find(i => i.id === item.inventoryItemId);
             if (invItem && invItem.category) orderCategories.add(invItem.category);
          });
          
          // Check if order has at least one item from selected categories
          const hasMatchingCategory = filters.categories.some(cat => orderCategories.has(cat));
          if (!hasMatchingCategory) return false;
      }

      // Price range filter
      if (filters.priceRange.min !== undefined && order.total < filters.priceRange.min) return false;
      if (filters.priceRange.max !== undefined && order.total > filters.priceRange.max) return false;

      return true;
    });
  }, [filters, orders, inventoryItems]);

  // State for backend metrics
  const [backendMetrics, setBackendMetrics] = useState<any>(null); // Use proper type if available or define one
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
      const fetchMetrics = async () => {
          // Only fetch if date range is set or initialized?
          // Fetch default metrics even if no date range
          try {
              setMetricsLoading(true);
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) return;
              
              const params: any = {};
              if (filters.dateRange.from) params.from = filters.dateRange.from.toISOString();
              if (filters.dateRange.to) params.to = filters.dateRange.to.toISOString();

              const response = await axios.get('http://localhost:5000/api/sales/metrics', {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                  params
              });

              setBackendMetrics(response.data);
          } catch (error) {
              console.error('Error fetching metrics:', error);
          } finally {
              setMetricsLoading(false);
          }
      };

      fetchMetrics();
  }, [filters.dateRange]); // Refetch when date range changes

  // Use backend metrics or fallback to calculation/zeros if loading/error
  // Merging with calculated metrics for fields deemed "client-side" if any, 
  // but preferably getting all from backend now.
  const metrics = useMemo(() => {
      if (backendMetrics) return backendMetrics;
      
      // Fallback/Loading state placeholder (can be improved)
      return {
          totalRevenue: 0,
          revenueChange: 0,
          paidOrders: 0,
          ordersChange: 0,
          averageOrderValue: 0,
          aovChange: 0,
          conversionRate: 0,
          totalCustomers: 0,
          newCustomers: 0,
          refundRate: 0,
          refundedAmount: 0,
          pendingRevenue: 0,
          avgItemsPerOrder: 0,
          customerLifetimeValue: 0,
      };
  }, [backendMetrics]);

  // Chart Data: Sales by Category
  const salesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; orders: number }>();
    
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const inventoryItem = inventoryItems.find(i => i.id === item.inventoryItemId);
        const category = inventoryItem?.category || 'Uncategorized';
        
        const current = categoryMap.get(category) || { revenue: 0, orders: 0 };
        categoryMap.set(category, {
          revenue: current.revenue + (item.total || 0),
          orders: current.orders + 1,
        });
      });
    });

    return Array.from(categoryMap.entries())
        .map(([category, data]) => ({
            category,
            revenue: data.revenue,
            orders: data.orders,
        }))
        .sort((a,b) => b.revenue - a.revenue);
  }, [filteredOrders, inventoryItems]);

  // Chart Data: Sales by Day of Week 
  const salesByDayOfWeek = useMemo(() => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayData = days.map(day => ({ day, orders: 0, revenue: 0 }));

      filteredOrders.forEach(order => {
          const d = new Date(order.createdAt);
          const dayIndex = d.getDay();
          dayData[dayIndex].orders += 1;
          dayData[dayIndex].revenue += order.total;
      });

      return dayData;
  }, [filteredOrders]);

  // Create a map for inventory items to quickly look up cost
  const inventoryMap = useMemo(() => {
    return new Map(inventoryItems.map(i => [i.id, i]));
  }, [inventoryItems]);

   // Customer Acquisition (Mock/Simulated as we don't have user join dates easily accessible here without extra logic)
   const customerAcquisition = useMemo(() => [
    { month: 'Jan', new: 12, returning: 28 },
    { month: 'Feb', new: 15, returning: 32 },
    { month: 'Mar', new: 18, returning: 35 },
    { month: 'Apr', new: 14, returning: 38 },
    { month: 'May', new: 20, returning: 42 },
    { month: 'Jun', new: 22, returning: 45 },
  ], []);

  // Revenue Goal State (persisted in localStorage)
  const [revenueGoal, setRevenueGoal] = useState(() => {
    const saved = localStorage.getItem('revenueGoal');
    return saved ? parseFloat(saved) : 1000000;
  });

  const handleGoalChange = (newGoal: number) => {
    setRevenueGoal(newGoal);
    localStorage.setItem('revenueGoal', newGoal.toString());
  };

  // Goal progress
  const goalProgress = useMemo(() => ({
    actual: metrics.totalRevenue,
    target: revenueGoal,
  }), [metrics.totalRevenue, revenueGoal]);

  // Low stock items
  const lowStockItems = useMemo(() => 
    inventoryItems
      .filter(item => item.quantityOnHand <= item.reorderPoint)
      .map(item => ({
        name: item.name,
        current: item.quantityOnHand,
        reorderPoint: item.reorderPoint,
      })),
    [inventoryItems]
  );

  // Insights data
  const insightsData = useMemo(() => ({
    lowStockItems,
    forecasts: metrics.forecastedRevenue || { nextDay: 0, nextWeek: 0, nextMonth: 0 },
    peakSalesDay: salesByDayOfWeek.length > 0 ? salesByDayOfWeek.reduce((a, b) => a.revenue > b.revenue ? a : b).day : 'N/A',
    peakSalesHour: '2:00 PM - 4:00 PM', // Hard to derive without time buckets
    topPerformingCategory: salesByCategory.length > 0 
      ? salesByCategory[0].category 
      : 'N/A',
    discountedOrdersPercentage: 0, // No discount logic yet
  }), [lowStockItems, metrics.totalRevenue, salesByCategory, salesByDayOfWeek]);

  // State for results dialog
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  if (loading) {
      return (
          <div className="flex h-[80vh] items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Sales Analytics</h1>
        <p className="page-description">
          Comprehensive sales insights, trends, and performance metrics
        </p>
      </div>

      {/* Filter Panel */}
      <SalesFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        customers={customerList}
        categories={categories}
        onViewResults={() => setShowResultsDialog(true)}
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Grid */}
          <SalesMetricsGrid {...metrics} />

          {/* Insights Panel */}
          <SalesInsightsPanel {...insightsData} />

          {/* Quick Charts */}
          <SalesChartsSection
            orders={orders}
            inventoryItems={inventoryItems}
            customerAcquisition={customerAcquisition}
            goalProgress={goalProgress}
            onTargetChange={handleGoalChange}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Full Charts View */}
          <SalesChartsSection
            orders={orders}
            inventoryItems={inventoryItems}
            customerAcquisition={customerAcquisition}
            goalProgress={goalProgress}
            onTargetChange={handleGoalChange}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Data Table */}
          <SalesDataTable orders={filteredOrders} />
        </TabsContent>
      </Tabs>

      {/* Filtered Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
                <DialogTitle>Filtered Results</DialogTitle>
                <DialogDescription>
                    Found {filteredOrders.length} orders matching your criteria.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 pt-4">
                 <SalesDataTable orders={filteredOrders} />
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
