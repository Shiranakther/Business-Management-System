import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Eye, FileText, ShoppingCart, Trash2, Check, ChevronsUpDown, Printer, Loader2, RotateCcw } from 'lucide-react';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
import { ReportTemplateSelector, type ReportTemplateType } from '@/components/reports/ReportTemplateSelector';
import type { ReportData } from '@/components/reports/templates/types';
import { InvoicePreviewDialog } from '@/components/orders/InvoicePreviewDialog';
import { useAppStore } from '@/stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Order, Customer, InventoryItem, CourierPartner } from '@/types';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  CONFIRMED: 'bg-primary/10 text-primary border-primary/20',
  SHIPPED: 'bg-accent/10 text-accent border-accent/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  RETURN_REQUESTED: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  RETURN_APPROVED: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RETURNED: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  PAID: 'bg-success/10 text-success border-success/20',
  REFUNDED: 'bg-destructive/10 text-destructive border-destructive/20',
};



function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

function formatDate(date: Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

interface NewOrderItem {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ManualCustomer {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  
  // Report generation state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('modern');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Invoice dialog state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  
  // Customer selection state
  const [customerType, setCustomerType] = useState<'existing' | 'manual'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState<ManualCustomer>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  
  // Product selection state
  const [orderItems, setOrderItems] = useState<NewOrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // Other order details
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [orderSource, setOrderSource] = useState('Direct Order');
  const [newOrderStatus, setNewOrderStatus] = useState('PENDING');
  const [newPaymentStatus, setNewPaymentStatus] = useState('PENDING');

  const [courierPartners, setCourierPartners] = useState<CourierPartner[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Fetch real data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, customDateRange]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) return;
          const headers = { Authorization: `Bearer ${session.access_token}` };
          
          const [ordersRes, customersRes, inventoryRes, couriersRes] = await Promise.all([
             axios.get(`${API_BASE_URL}/api/orders`, { headers }),
             axios.get(`${API_BASE_URL}/api/customers`, { headers }),
             axios.get(`${API_BASE_URL}/api/inventory`, { headers }),
             axios.get(`${API_BASE_URL}/api/couriers`, { headers })
          ]);

          setOrders(ordersRes.data);
          setCustomers(customersRes.data);
          setInventoryItems(inventoryRes.data);
          setCourierPartners(couriersRes.data.filter((c: CourierPartner) => c.isActive));
      } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to load orders data');
      } finally {
          setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Autofill addresses when customer is selected
  useEffect(() => {
    if (customerType === 'existing' && selectedCustomerId) {
       const customer = customers.find(c => c.id === selectedCustomerId);
       if (customer) {
           const billing = [
               customer.billingAddressLine1, 
               customer.billingAddressLine2, 
               customer.city, 
               customer.district
           ].filter(Boolean).join(', ');
           
           const shipping = [
               customer.deliveryAddressLine1, 
               customer.deliveryAddressLine2, 
               customer.deliveryCity, 
               customer.deliveryDistrict
           ].filter(Boolean).join(', ');

           setBillingAddress(billing);
           setShippingAddress(shipping || billing); // Fallback to billing if shipping empty
       }
    }
  }, [selectedCustomerId, customerType, customers]);

  const filteredOrders = orders.filter(order => {
    const orderNum = order.orderNumber || '';
    const custName = order.customerName || '';
    const matchesSearch = orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          custName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Date filtering logic
    let matchesDate = true;
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    
    if (dateFilter === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesDate = orderDate >= startOfToday;
    } else if (dateFilter === 'last24h') {
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      matchesDate = orderDate >= last24h;
    } else if (dateFilter === 'last7days') {
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = orderDate >= last7Days;
    } else if (dateFilter === 'last30days') {
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = orderDate >= last30Days;
    } else if (dateFilter === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchesDate = orderDate >= startOfMonth;
    } else if (dateFilter === 'lastMonth') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      matchesDate = orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
    } else if (dateFilter === 'custom' && customDateRange) {
      if (customDateRange.from && customDateRange.to) {
        const fromDate = new Date(customDateRange.from.getFullYear(), customDateRange.from.getMonth(), customDateRange.from.getDate());
        const toDate = new Date(customDateRange.to.getFullYear(), customDateRange.to.getMonth(), customDateRange.to.getDate(), 23, 59, 59);
        matchesDate = orderDate >= fromDate && orderDate <= toDate;
      } else if (customDateRange.from) {
        const fromDate = new Date(customDateRange.from.getFullYear(), customDateRange.from.getMonth(), customDateRange.from.getDate());
        matchesDate = orderDate >= fromDate;
      } else if (customDateRange.to) {
        const toDate = new Date(customDateRange.to.getFullYear(), customDateRange.to.getMonth(), customDateRange.to.getDate(), 23, 59, 59);
        matchesDate = orderDate <= toDate;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

  const totalRevenue = orders.reduce((sum, order) => order.paymentStatus === 'PAID' ? sum + order.total : sum, 0) || 0;
  const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
  // Handle case where no PAID orders to avoid division by zero (done via || 1)
  const paidOrdersCount = orders.filter(order => order.paymentStatus === 'PAID').length;
  const averageOrderValue = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

  // Filter customers by search (name or phone)
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      (c.companyName?.toLowerCase().includes(search) ?? false) ||
      (c.contactName?.toLowerCase().includes(search) ?? false) ||
      (c.name?.toLowerCase().includes(search)) || 
      (c.phone && c.phone.includes(search)) ||
      (c.mobile && c.mobile.includes(search))
    );
  }, [customerSearch, customers]);

  // Filter products by search (name, sku, category)
  const filteredProducts = useMemo(() => {
    const availableProducts = inventoryItems.filter(p => p.status !== 'OUT_OF_STOCK');
    if (!productSearch) return availableProducts;
    const search = productSearch.toLowerCase();
    return availableProducts.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  }, [productSearch, inventoryItems]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedProduct = inventoryItems.find(p => p.id === selectedProductId);

  const handleAddItem = () => {
    if (!selectedProductId || quantity < 1) return;
    
    const product = inventoryItems.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = orderItems.findIndex(item => item.inventoryItemId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += quantity;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        inventoryItemId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.unitPrice,
      }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const { currentTenant } = useAppStore();
  const taxPercentage = currentTenant?.taxPercentage ?? 0;

  const calculateSubtotal = () => orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculateTax = () => calculateSubtotal() * (taxPercentage / 100);
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const isCustomerValid = () => {
    if (customerType === 'existing') {
      return !!selectedCustomerId;
    }
    return manualCustomer.contactName.trim() && manualCustomer.email.trim();
  };

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const handleCreateOrder = async () => {
    if (!isCustomerValid() || orderItems.length === 0) {
      toast.error('Please complete customer details and add at least one item');
      return;
    }

    setIsCreatingOrder(true);
    try {
        const orderData = {
            customerType,
            customerId: selectedCustomerId,
            manualCustomer: customerType === 'manual' ? manualCustomer : null,
            items: orderItems,
            shippingAddress,
            billingAddress,
            notes,
            paymentMethod,
            shippingMethod,
            status: newOrderStatus,
            paymentStatus: newPaymentStatus,
            courierPartnerId: selectedCourierId || null,
            trackingNumber: trackingNumber || null,
            orderSource,
            total: calculateTotal(),
            subtotal: calculateSubtotal(), // Backend expects this
            tax: calculateTax() // Backend expects this
        };

        const { data: { session } } = await supabase.auth.getSession();
        const headers = { Authorization: `Bearer ${session?.access_token}` };

        await axios.post(`${API_BASE_URL}/api/orders`, orderData, {
            headers
        });

        // Refetch to get consistent data references
        const ordersRes = await axios.get(`${API_BASE_URL}/api/orders`, { headers });
        setOrders(ordersRes.data);

        toast.success('Order created successfully!');
        resetForm();
        setIsCreateDialogOpen(false);
    } catch (error: any) {
        console.error('Create order error:', error);
        toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
        setIsCreatingOrder(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
      if (!confirm('Are you sure you want to delete this order?')) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          await axios.delete(`${API_BASE_URL}/api/orders/${orderId}`, {
             headers: { Authorization: `Bearer ${session?.access_token}` }
          });
          setOrders(orders.filter(o => o.id !== orderId));
          toast.success('Order deleted');
          if (selectedOrder?.id === orderId) setSelectedOrder(null);
      } catch (error) {
          console.error('Delete error', error);
          toast.error('Failed to delete order');
      }
  };

  const handleUpdateStatus = async (orderId: string, updates: any) => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          await axios.put(`${API_BASE_URL}/api/orders/${orderId}`, updates, {
              headers: { Authorization: `Bearer ${session?.access_token}` }
          });
          
          // Update local state
          const updatedOrders = orders.map(o => o.id === orderId ? { ...o, ...updates } : o);
          setOrders(updatedOrders);
          if (selectedOrder && selectedOrder.id === orderId) {
              setSelectedOrder({ ...selectedOrder, ...updates });
          }
          toast.success('Order updated');
      } catch (error) {
          console.error('Update error', error);
          toast.error('Failed to update order');
      }
  };

  const resetForm = () => {
    setCustomerType('existing');
    setSelectedCustomerId('');
    setCustomerSearch('');
    setManualCustomer({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setOrderItems([]);
    setSelectedProductId('');
    setProductSearch('');
    setQuantity(1);
    setShippingAddress('');
    setBillingAddress('');
    setNotes('');
    setPaymentMethod('');
    setShippingMethod('');
    setOrderSource('Direct Order');
    setSelectedCourierId('');
    setTrackingNumber('');
    setNewOrderStatus('PENDING');
    setNewPaymentStatus('PENDING');
  };

  const generateOrdersReport = () => {
    const mockCompanyInfo = {
      name: 'Acme Corp Pvt Ltd',
      address: '123 Business Park, Colombo 03, Sri Lanka',
      email: 'reports@acmecorp.com',
      phone: '+94 11 234 5678',
      logoUrl: 'https://via.placeholder.com/150x50?text=ACME+CORP',
    };

    const data: ReportData = {
      title: 'Orders Report',
      subTitle: 'Complete Order History & Performance Analysis',
      generatedAt: new Date(),
      generatedBy: 'System Administrator',
      dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() }, // Last 30 days
      companyInfo: mockCompanyInfo,
      metrics: [
        { label: 'Total Orders', value: orders.length },
        { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
        { label: 'Pending Orders', value: pendingOrders, change: -5 },
        { label: 'Avg Order Value', value: formatCurrency(averageOrderValue), change: 8 },
      ],
      tableHeaders: ['Order #', 'Customer', 'Date', 'Items', 'Total', 'Status', 'Payment'],
      tableRows: filteredOrders.map(order => [
        order.orderNumber,
        order.customerName,
        formatDate(order.createdAt),
        `${order.items.length} items`,
        formatCurrency(order.total),
        order.status.charAt(0) + order.status.slice(1).toLowerCase(),
        order.paymentStatus,
      ]),
      footerText: 'This report contains confidential business information - Handle with care',
    };

    setReportData(data);
    setShowReportPreview(true);
    setShowReportDialog(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Orders</h1>
          <p className="page-description">Create and manage customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowReportDialog(true)}>
            <Printer className="w-4 h-4" />
            Generate Report
          </Button>
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-semibold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-semibold">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <ShoppingCart className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-semibold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-semibold">{formatCurrency(averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* First Row: Search and Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Second Row: Date Range Picker */}
            <DateRangePicker
              value={dateFilter}
              customRange={customDateRange}
              onValueChange={setDateFilter}
              onCustomRangeChange={setCustomDateRange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tracking #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <tr key={order.id} className="data-table-row">
                    <td className="py-3 px-4 font-medium font-mono">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.customerName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.items.length} items</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={paymentStatusColors[order.paymentStatus]}>
                        {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {order.trackingNumber ? (
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {order.trackingNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={order.status === 'RETURN_APPROVED' || order.status === 'RETURNED'}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-2 py-4 mt-2">
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
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Status</p>
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(value) => handleUpdateStatus(selectedOrder.id, { status: value })}
                    disabled={selectedOrder.status === 'RETURN_APPROVED' || selectedOrder.status === 'RETURNED'}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Source</p>
                  <p className="font-medium mt-1">{selectedOrder.orderSource || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium mt-1">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Payment</p>
                  <Select 
                    value={selectedOrder.paymentStatus} 
                    onValueChange={(value) => handleUpdateStatus(selectedOrder.id, { paymentStatus: value })}
                    disabled={selectedOrder.status === 'RETURN_APPROVED' || selectedOrder.status === 'RETURNED'}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedOrder.courierPartnerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Courier</p>
                    <p className="font-medium mt-1">{selectedOrder.courierPartnerName}</p>
                  </div>
                )}
                {selectedOrder.trackingNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-medium font-mono">{selectedOrder.trackingNumber}</p>
                      {selectedOrder.trackingUrlTemplate && (
                        <a
                          href={selectedOrder.trackingUrlTemplate.replace('{tracking}', selectedOrder.trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Track →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Order Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-2 px-3 text-sm font-medium">Item</th>
                        <th className="text-right py-2 px-3 text-sm font-medium">Qty</th>
                        <th className="text-right py-2 px-3 text-sm font-medium">Price</th>
                        <th className="text-right py-2 px-3 text-sm font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="py-2 px-3 text-right">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex w-full justify-between items-center gap-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInvoiceDialog(true);
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
              {selectedOrder && (selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'DELIVERED') && (
                <Button 
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={async () => {
                    const reason = window.prompt('Enter return reason:');
                    if (!reason) return;
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      await axios.post(`${API_BASE_URL}/api/returns`, 
                        { orderId: selectedOrder.id, reason },
                        { headers: { Authorization: `Bearer ${session?.access_token}` } }
                      );
                      const ordersRes = await axios.get(`${API_BASE_URL}/api/orders`, { 
                        headers: { Authorization: `Bearer ${session?.access_token}` } 
                      });
                      setOrders(ordersRes.data);
                      setSelectedOrder(null);
                      toast.success('Return request created successfully');
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || 'Failed to create return');
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Return
                </Button>
              )}
            </div>
            <Button 
              variant="ghost"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer & Address Section */}
            <div className="space-y-4">
              {/* Customer Type Selection */}
              <div>
                <Label className="mb-3 block">Customer Type</Label>
                <RadioGroup
                  value={customerType}
                  onValueChange={(value: 'existing' | 'manual') => {
                    setCustomerType(value);
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="cursor-pointer">Existing Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="cursor-pointer">New Customer</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Existing Customer Search */}
              {customerType === 'existing' && (
                <div>
                  <Label>Search Customer (by name or phone) *</Label>
                  <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerPopoverOpen}
                        className="w-full justify-between mt-1.5"
                      >
                        {selectedCustomer
                          ? `${selectedCustomer.companyName || selectedCustomer.name} ${selectedCustomer.contactName && selectedCustomer.contactName !== selectedCustomer.name ? `(${selectedCustomer.contactName})` : ''}`
                          : "Search and select customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search by name or phone..." 
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCustomers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.companyName} ${customer.contactName} ${customer.phone || ''}`}
                                onSelect={() => {
                                  setSelectedCustomerId(customer.id);
                                  setCustomerPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.companyName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {customer.contactName} {customer.phone && `• ${customer.phone}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Manual Customer Entry */}
              {customerType === 'manual' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground">New Customer Details</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="contactName">Customer Name *</Label>
                      <Input
                        id="contactName"
                        value={manualCustomer.contactName}
                        onChange={(e) => setManualCustomer({...manualCustomer, contactName: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={manualCustomer.email}
                        onChange={(e) => setManualCustomer({...manualCustomer, email: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={manualCustomer.phone}
                        onChange={(e) => setManualCustomer({...manualCustomer, phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={manualCustomer.address}
                      onChange={(e) => setManualCustomer({...manualCustomer, address: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={manualCustomer.city}
                        onChange={(e) => setManualCustomer({...manualCustomer, city: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={manualCustomer.state}
                        onChange={(e) => setManualCustomer({...manualCustomer, state: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={manualCustomer.zipCode}
                        onChange={(e) => setManualCustomer({...manualCustomer, zipCode: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter shipping address..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Same as shipping if left empty"
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="orderSource">Order Source</Label>
                <Select value={orderSource} onValueChange={setOrderSource}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Order Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct Order">Direct Order</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Repeat Buyer">Repeat Buyer</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Order Status</Label>
                  <Select value={newOrderStatus} onValueChange={setNewOrderStatus}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">Cash On Delivery (COD)</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="ez_cash">EZ Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="courierPartner">Courier Partner</Label>
                  <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {courierPartners.map(cp => (
                        <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, delivery notes..."
                  className="mt-1.5"
                  rows={2}
                />
              </div>
            </div>

            {/* Order Items Section */}
            <div className="space-y-4">
              <div>
                <Label>Add Products (search by name)</Label>
                <div className="flex gap-2 mt-1.5">
                  <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productPopoverOpen}
                        className="flex-1 justify-between"
                      >
                        {selectedProduct
                          ? `${selectedProduct.name} - ${formatCurrency(selectedProduct.unitPrice)}`
                          : "Search product..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0 z-50 bg-popover" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search by name, SKU, or category..." 
                          value={productSearch}
                          onValueChange={setProductSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {filteredProducts.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={`${product.name} ${product.sku} ${product.category}`}
                                onSelect={() => {
                                  setSelectedProductId(product.id);
                                  setProductPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {product.sku} • {formatCurrency(product.unitPrice)} • {product.quantityOnHand} in stock
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Button onClick={handleAddItem} size="icon" variant="secondary" disabled={!selectedProductId}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Order Items List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-sm font-medium">
                  Order Items ({orderItems.length})
                </div>
                {orderItems.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No items added yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({currentTenant?.taxPercentage ?? 0}%)</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t text-base">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={!isCustomerValid() || orderItems.length === 0 || isCreatingOrder}>
              {isCreatingOrder && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isCreatingOrder ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Template Selection Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Orders Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Report Template</Label>
              <ReportTemplateSelector selectedTemplate={selectedTemplate} onSelect={setSelectedTemplate} />
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Report includes:</strong> All {filteredOrders.length} orders shown in the current view, 
                with order details, customer information, and financial summary.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateOrdersReport}>
              <Printer className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Preview */}
      {reportData && (
        <ReportPreviewDialog 
          open={showReportPreview} 
          onOpenChange={setShowReportPreview}
          template={selectedTemplate}
          data={reportData}
        />
      )}

      {/* Invoice Preview */}
      <InvoicePreviewDialog 
        open={showInvoiceDialog} 
        onOpenChange={setShowInvoiceDialog}
        order={selectedOrder}
      />
    </div>
  );
}
