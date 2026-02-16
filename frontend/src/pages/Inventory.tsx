import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Plus, Search, Lock, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';
import { startOfDay, subDays, startOfMonth, subMonths, isAfter, isBefore, endOfDay } from 'date-fns';
import { AddInventoryDialog } from '@/components/dialogs/AddInventoryDialog';
import { InventoryItemDetailsDialog } from '@/components/dialogs/InventoryItemDetailsDialog';
import { StockUpdateDialog } from '@/components/dialogs/StockUpdateDialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { InventoryItem, InventoryTransaction } from '@/types';

const statusColors: Record<string, string> = {
  IN_STOCK: 'bg-success/10 text-success border-success/20',
  LOW_STOCK: 'bg-warning/10 text-warning border-warning/20',
  OUT_OF_STOCK: 'bg-destructive/10 text-destructive border-destructive/20',
};

const transactionTypeColors: Record<string, string> = {
  PURCHASE_RECEIPT: 'bg-success/10 text-success border-success/20',
  SALES_ORDER: 'bg-accent/10 text-accent border-accent/20',
  ADJUSTMENT: 'bg-warning/10 text-warning border-warning/20',
  RETURN: 'bg-primary/10 text-primary border-primary/20',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockUpdateDialog, setShowStockUpdateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  // Stock Update Filter State
  const [updateSearchQuery, setUpdateSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const { canRead, canCreate } = usePermissions();
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch Items
        const itemsRes = await fetch('http://localhost:5000/api/inventory', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (itemsRes.ok) {
            const data = await itemsRes.json();
            setItems(data);
        }

        // Fetch Transactions
        const txnsRes = await fetch('http://localhost:5000/api/inventory/transactions', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (txnsRes.ok) {
            const data = await txnsRes.json();
            setTransactions(data);
        }

    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        toast.error('Failed to load inventory data');
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead('inventory') && !hasFetched.current) {
        hasFetched.current = true;
        fetchData();
    }
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
         {/* Simple loader */}
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canRead('inventory')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view inventory.</p>
      </div>
    );
  }

  const categories = [...new Set(items.map(item => item.category))];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter Transactions
  const filteredTransactions = transactions.filter(txn => {
    // Search Filter
    const searchLower = updateSearchQuery.toLowerCase();
    const matchesSearch = 
        txn.itemName.toLowerCase().includes(searchLower) || 
        (txn.referenceId && txn.referenceId.toLowerCase().includes(searchLower)) ||
        txn.transactionType.toLowerCase().replace(/_/g, ' ').includes(searchLower);

    if (!matchesSearch) return false;

    // Date Filter
    const txnDate = new Date(txn.createdAt);
    const now = new Date();

    switch (dateRangePreset) {
      case 'today':
        return isAfter(txnDate, startOfDay(now));
      case 'last24h':
        return isAfter(txnDate, subDays(now, 1));
      case 'last7days':
        return isAfter(txnDate, subDays(now, 7));
      case 'last30days':
        return isAfter(txnDate, subDays(now, 30));
      case 'thisMonth':
        return isAfter(txnDate, startOfMonth(now));
      case 'lastMonth': {
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const thisMonthStart = startOfMonth(now);
        return isAfter(txnDate, lastMonthStart) && isBefore(txnDate, thisMonthStart);
      }
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
            return isAfter(txnDate, startOfDay(customDateRange.from)) && isBefore(txnDate, endOfDay(customDateRange.to));
        }
        if (customDateRange.from) {
            return isAfter(txnDate, startOfDay(customDateRange.from));
        }
        return true;
      default: // 'all'
        return true;
    }
  });

  const totalValue = items.reduce((sum, item) => sum + (item.quantityOnHand * (item.costPrice || 0)), 0);
  const lowStockCount = items.filter(item => item.status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter(item => item.status === 'OUT_OF_STOCK').length;

  const handleRowClick = (item: InventoryItem) => {
      setSelectedItem(item);
      setShowDetailsDialog(true);
  };

  const handleEditItem = (item: InventoryItem) => {
      console.log('handleEditItem called', item);
      setItemToEdit(item);
      setShowDetailsDialog(false);
      // Small timeout to allow the details dialog to close properly before opening the add dialog
      setTimeout(() => {
          console.log('Opening Add Dialog now');
          setShowAddDialog(true);
      }, 200);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Inventory</h1>
          <p className="page-description">Manage your products and stock levels</p>
        </div>
        <div className="flex gap-2">
           {canCreate('inventory') && (
            <>
                <Button variant="outline" className="gap-2" onClick={() => setShowStockUpdateDialog(true)}>
                    <ArrowRightLeft className="w-4 h-4" />
                    Update Stock
                </Button>
                <Button className="gap-2" onClick={() => {
                    setItemToEdit(null);
                    setShowAddDialog(true);
                }}>
                    <Plus className="w-4 h-4" />
                    Add Product
                </Button>
            </>
           )}
        </div>
      </div>

      <StockUpdateDialog 
        open={showStockUpdateDialog} 
        onOpenChange={setShowStockUpdateDialog} 
        onSuccess={fetchData}
        items={items}
      />
      <InventoryItemDetailsDialog 
        open={showDetailsDialog} 
        onOpenChange={setShowDetailsDialog} 
        item={selectedItem} 
        onEdit={handleEditItem}
      />
      <AddInventoryDialog 
        key={itemToEdit?.id || 'new'}
        open={showAddDialog} 
        onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        onSuccess={fetchData}
      />

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
            <TabsTrigger value="products" className="gap-2"><Package className="w-4 h-4"/> Products</TabsTrigger>
            <TabsTrigger value="updates" className="gap-2"><ArrowRightLeft className="w-4 h-4"/> Stock Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
             {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="stat-card">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                        <Package className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-xl font-semibold">{formatCurrency(totalValue)}</p>
                    </div>
                    </div>
                </CardContent>
                </Card>
                <Card className="stat-card">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                        <Package className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Low Stock Items</p>
                        <p className="text-xl font-semibold">{lowStockCount}</p>
                    </div>
                    </div>
                </CardContent>
                </Card>
                <Card className="stat-card">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                        <Package className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Out of Stock</p>
                        <p className="text-xl font-semibold">{outOfStockCount}</p>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                        <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                <CardTitle className="text-lg">Product List ({filteredItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SKU</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((item) => (
                        <tr 
                            key={item.id} 
                            className="data-table-row cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleRowClick(item)}
                        >
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {item.imageUrl ? (
                                            <img 
                                                src={item.imageUrl} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        {item.description && (
                                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                            {item.description}
                                        </p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono text-sm">{item.sku}</td>
                            <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                            <td className="py-3 px-4 text-right font-medium">{item.quantityOnHand}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-4">
                            <Badge variant="outline" className={statusColors[item.status]}>
                                {item.status.replace(/_/g, ' ')}
                            </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{formatDate(item.lastUpdated)}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
            {/* Updates Filters */}
           <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex-1">
                      <div className="flex items-center h-10 w-full rounded-md border border-input bg-background px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                        <input
                          className="flex h-full w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Search updates by item, type, or reference..."
                          value={updateSearchQuery}
                          onChange={(e) => setUpdateSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                        <DateRangePicker 
                            value={dateRangePreset}
                            onValueChange={setDateRangePreset}
                            customRange={customDateRange}
                            onCustomRangeChange={setCustomDateRange}
                            className="w-full sm:w-auto"
                        />
                    </div>
                  </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="text-lg">Internal Stock Updates ({filteredTransactions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Item</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Qty Change</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reference</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((txn) => (
                            <tr key={txn.id} className="data-table-row">
                                <td className="py-3 px-4 font-medium">{txn.itemName}</td>
                                <td className="py-3 px-4">
                                <Badge variant="outline" className={transactionTypeColors[txn.transactionType]}>
                                    {txn.transactionType.replace(/_/g, ' ')}
                                </Badge>
                                </td>
                                <td className={cn(
                                "py-3 px-4 text-right font-medium",
                                txn.quantityChange > 0 ? "text-success" : "text-destructive"
                                )}>
                                {txn.quantityChange > 0 ? '+' : ''}{txn.quantityChange}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                                {txn.referenceId || '—'}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                {new Intl.DateTimeFormat('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                }).format(new Date(txn.createdAt))}
                                </td>
                            </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                    No stock updates found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
