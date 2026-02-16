import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

import { type ReportTemplateType } from './ReportTemplateSelector';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import { useAppStore } from '@/stores/appStore';
import type { ReportData } from './templates/types';

interface ReportViewerProps {
  reportType: string;
  filters: any;
  template?: ReportTemplateType;
  onClose: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function ReportViewer({ reportType, filters, template = 'modern', onClose }: ReportViewerProps) {
  const { currentTenant, currentUser } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [reportType, filters]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Construct query params from filters
      // Construct query params from filters
      const params = new URLSearchParams();
      if (filters.dateRange?.from) params.append('from', filters.dateRange.from.toISOString());
      if (filters.dateRange?.to) params.append('to', filters.dateRange.to.toISOString());
      
      if (filters.customers?.length) filters.customers.forEach((c: string) => params.append('customers', c));
      if (filters.categories?.length) filters.categories.forEach((c: string) => params.append('categories', c));
      if (filters.orderStatus?.length) filters.orderStatus.forEach((s: string) => params.append('orderStatus', s));
      if (filters.paymentStatus?.length) filters.paymentStatus.forEach((s: string) => params.append('paymentStatus', s));
      if (filters.salesChannel?.length) filters.salesChannel.forEach((s: string) => params.append('salesChannel', s));
      if (filters.minValue !== undefined) params.append('minValue', filters.minValue.toString());
      if (filters.maxValue !== undefined) params.append('maxValue', filters.maxValue.toString());

      const res = await fetch(`http://localhost:5000/api/reports/${reportType}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to fetch report');
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(Number(val));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-96 text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p className="font-medium">Error generating report</p>
        <p className="text-sm mt-2 text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchReportData}>Try Again</Button>
      </div>
    );
  }

  const handlePreview = () => {
    if (!data) return;

    // Common Company Info
    const companyInfo = {
        name: currentTenant?.name || 'My Company',
        address: [currentTenant?.address, currentTenant?.city, currentTenant?.state, currentTenant?.country].filter(Boolean).join(', ') || 'Business Address',
        email: currentUser?.email || '',
        phone: '', // Phone not available on tenant root by default
        logoUrl: currentTenant?.settings?.logoUrl
    };

    let metrics: { label: string; value: string | number }[] = [];
    let tableHeaders: string[] = [];
    let tableRows: any[][] = [];

    if (reportType === 'sales') {
        metrics = [
            { label: 'Total Revenue', value: formatCurrency(data.summary.totalRevenue) },
            { label: 'Total Orders', value: data.summary.totalOrders },
            { label: 'Avg Order Value', value: formatCurrency(data.summary.averageOrderValue) }
        ];
        tableHeaders = ['Order #', 'Date', 'Customer', 'Status', 'Amount'];
        tableRows = (data.details || []).map((item: any) => [
            item.orderNumber,
            item.date,
            item.customer,
            item.status,
            formatCurrency(item.amount)
        ]);
    } else if (reportType === 'inventory') {
        metrics = [
             { label: 'Total Valuation', value: formatCurrency(data.summary.totalStockValue) },
             { label: 'Total Items', value: data.summary.totalItems },
             { label: 'Low Stock', value: data.summary.lowStockItems }
        ];
        tableHeaders = ['Item', 'Category', 'Stock', 'Value'];
        tableRows = (data.details || []).map((item: any) => [
            item.name,
            item.category,
            item.stock,
            formatCurrency(item.price * item.stock)
        ]);
    } else if (reportType === 'expenses') {
        metrics = [
            { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses) },
            { label: 'Records', value: data.summary.count }
        ];
        tableHeaders = ['Date', 'Category', 'Description', 'Amount'];
        tableRows = (data.details || []).map((item: any) => [
             item.date,
             item.category,
             item.description,
             formatCurrency(item.amount)
        ]);
    }

    const mappedData: ReportData = {
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        subTitle: `Generated Report for ${currentTenant?.name || 'Business'}`,
        generatedAt: new Date(),
        generatedBy: `${currentUser?.firstName} ${currentUser?.lastName}`,
        dateRange: filters.dateRange,
        companyInfo,
        metrics,
        tableHeaders,
        tableRows
    };

    setReportData(mappedData);
    setShowPreview(true);
  };


  const renderSalesContent = () => (
    <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <span className="text-2xl font-bold">{data.summary.totalOrders}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Avg. Order Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(data.summary.averageOrderValue)}</span>
                </CardContent>
            </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.charts.salesOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(val: any) => formatCurrency(val)} />
                            <Legend />
                            <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip formatter={(val: any) => formatCurrency(val)} />
                            <Legend />
                            <Bar dataKey="value" fill="#82ca9d" name="Sales Volume" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );

  const renderInventoryContent = () => (
    <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Total Valuation</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(data.summary.totalStockValue)}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Total Items</span>
                    <span className="text-2xl font-bold">{data.summary.totalItems}</span>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Low Stock</span>
                    <span className="text-2xl font-bold text-warning">{data.summary.lowStockItems}</span>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Out of Stock</span>
                    <span className="text-2xl font-bold text-destructive">{data.summary.outOfStockItems}</span>
                </CardContent>
            </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Stock Value by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                              data={data.charts.valueByCategory}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {data.charts.valueByCategory.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val: any) => formatCurrency(val)} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Item Count by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={data.charts.byCategory}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" name="Items" />
                         </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );

  const renderContent = () => {
    switch(reportType) {
        case 'sales': return renderSalesContent();
        case 'inventory': return renderInventoryContent();
        case 'expenses': 
             // Basic placeholder for expenses as I implemented similar structure
             return (
                 <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Total Expenses</span>
                                <span className="text-2xl font-bold text-destructive">{formatCurrency(data.summary.totalExpenses)}</span>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Record Count</span>
                                <span className="text-2xl font-bold">{data.summary.count}</span>
                            </CardContent>
                        </Card>
                      </div>
                      <Card>
                        <CardHeader><CardTitle>Expenses Over Time</CardTitle></CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.charts.expensesOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(val: any) => formatCurrency(val)} />
                                    <Line type="monotone" dataKey="amount" stroke="#ff0000" name="Expense" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                      </Card>
                 </div>
             );
        default: return <div>Report type not supported yet</div>;
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                 <h2 className="text-2xl font-bold tracking-tight capitalize">{reportType} Report</h2>
                 <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={onClose}>Close Report</Button>
                 <Button onClick={handlePreview}> <Download className="w-4 h-4 mr-2" /> Print / PDF</Button>
            </div>
        </div>
        
        {renderContent()}
        {reportData && (
            <ReportPreviewDialog 
                open={showPreview} 
                onOpenChange={setShowPreview}
                template={template || 'modern'} 
                data={reportData}
            />
        )}
    </div>
  );
}
