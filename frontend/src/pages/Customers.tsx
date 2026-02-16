import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Building2, Lock, User as UserIcon, Loader2, TrendingUp, Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddCustomerDialog } from '@/components/dialogs/AddCustomerDialog';
import { CustomerDetailsDialog } from '@/components/dialogs/CustomerDetailsDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import type { Customer, Order } from '@/types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border-success/20',
  INACTIVE: 'bg-muted text-muted-foreground border-muted',
  SUSPENDED: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { canRead, canCreate, canDelete } = usePermissions();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [customersRes, ordersRes] = await Promise.all([
        fetch('http://localhost:5000/api/customers', { headers }),
        fetch('http://localhost:5000/api/orders', { headers })
      ]);
      
      if (!customersRes.ok || !ordersRes.ok) throw new Error('Failed to fetch data');
      
      const customersData = await customersRes.json();
      const ordersData = await ordersRes.json();
      
      setCustomers(customersData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerStats = (customerId: string) => {
    const customerOrders = orders.filter(o => o.customerId === customerId);
    
    const totalOrders = customerOrders.length;
    
    const ltv = customerOrders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        
    const outstanding = customerOrders
        .filter(o => o.status !== 'CANCELLED' && o.paymentStatus === 'PENDING')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        
    return { totalOrders, ltv, outstanding };
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`http://localhost:5000/api/customers/${customer.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete');

        toast.success('Customer deleted successfully');
        setShowDetailsDialog(false);
        fetchData();
    } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete customer');
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  // Check if user has read permission
  if (!canRead('customers')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view customers.</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      (customer.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.companyName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.mobile?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || customer.customerType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || customer.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const savedCustomers = filteredCustomers.filter(c => !c.isQuickCustomer);
  const quickCustomers = filteredCustomers.filter(c => c.isQuickCustomer);

  const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length;
  // Recalculate global LTV based on orders to be consistent
  const totalLTV = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const renderCustomerGrid = (customerList: Customer[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customerList.map((customer) => {
        const stats = getCustomerStats(customer.id);
        return (
          <Card 
            key={customer.id} 
            className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/40 group"
            onClick={() => handleCustomerClick(customer)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 transition-transform group-hover:scale-105">
                  <AvatarFallback className={`${customer.customerType === 'B2B' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                    {customer.customerType === 'B2B' ? <Building2 className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {customer.customerType === 'B2B' ? customer.companyName : customer.name}
                    </h3>
                    <Badge variant="outline" className={statusColors[customer.status]}>
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-secondary/30">
                          {customer.customerType}
                      </Badge>
                      <p className="text-sm text-muted-foreground truncate">{customer.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary/60" />
                  <span className="truncate">{customer.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary/60" />
                  <span>{customer.mobile}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders</p>
                  <p className="font-semibold">{stats.totalOrders}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
                    <p className={`font-semibold ${stats.outstanding > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatCurrency(stats.outstanding)}
                    </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">LTV</p>
                  <p className="font-semibold text-primary">{formatCurrency(stats.ltv)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {customerList.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
              <UserIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">No customers found</p>
              <p className="text-sm">Try adjusting your filters or add a new customer</p>
          </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Customers</h1>
          <p className="page-description">Manage your customer relationships</p>
        </div>
        {canCreate('customers') && (
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        )}
      </div>

      <AddCustomerDialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) setSelectedCustomer(null);
        }} 
        onSuccess={fetchData}
        customer={selectedCustomer as any}
      />

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onEdit={(customer) => {
            setShowDetailsDialog(false);
            setSelectedCustomer(customer);
            setShowAddDialog(true);
        }}
        onDelete={canDelete('customers') ? handleDeleteCustomer : undefined}
        stats={selectedCustomer ? getCustomerStats(selectedCustomer.id) : undefined}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <UserIcon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-xl font-semibold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-xl font-semibold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Value</p>
                <p className="text-xl font-semibold">{formatCurrency(totalLTV)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
             </div>
             <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                    <SelectTrigger className="w-[140px]">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <SelectValue placeholder="Type" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="B2C">Individual (B2C)</SelectItem>
                        <SelectItem value="B2B">Business (B2B)</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                </Select>

                {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            setTypeFilter('ALL');
                            setStatusFilter('ALL');
                            setSearchQuery('');
                        }}
                        title="Clear Filters"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Content */}
      {isLoading ? (
          <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      ) : (
        <Tabs defaultValue="saved" className="space-y-6">
            <TabsList className="bg-background border w-full justify-start overflow-x-auto">
                <TabsTrigger value="saved" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    Saved Customers ({savedCustomers.length})
                </TabsTrigger>
                <TabsTrigger value="quick" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    Quick Order Customers ({quickCustomers.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="mt-0">
                {renderCustomerGrid(savedCustomers)}
            </TabsContent>
            
            <TabsContent value="quick" className="mt-0">
                {renderCustomerGrid(quickCustomers)}
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
