import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Truck, Lock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddSupplierDialog } from '@/components/dialogs/AddSupplierDialog';
import { SupplierDetailsDialog } from '@/components/dialogs/SupplierDetailsDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Supplier } from '@/types';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border-success/20',
  INACTIVE: 'bg-muted text-muted-foreground border-muted',
};

export default function Suppliers() {
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('all'); // Advanced Filter
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null); // For Edit Mode

  const { canRead, canCreate, isAdmin } = usePermissions();

  const fetchSuppliers = useCallback(async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          const res = await fetch('http://localhost:5000/api/suppliers', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          
          if (res.ok) {
              const data = await res.json();
              setSuppliersList(data);
          } else {
              throw new Error('Failed to fetch');
          }
      } catch (error) {
          console.error("Error fetching suppliers:", error);
          toast.error("Failed to load suppliers");
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      if (canRead('suppliers')) {
          fetchSuppliers();
      } else {
          setIsLoading(false);
      }
  }, [fetchSuppliers, canRead]);

  const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'INACTIVE') => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const res = await fetch(`http://localhost:5000/api/suppliers/${id}/status`, {
              method: 'PATCH',
              headers: { 
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ status: newStatus })
          });

          if (!res.ok) throw new Error('Failed to update status');

          // Optimistic update
          setSuppliersList(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
          
          // Also update selected supplier if detail view is open
          if (selectedSupplier && selectedSupplier.id === id) {
              setSelectedSupplier(prev => prev ? { ...prev, status: newStatus } : null);
          }

          toast.success(`Supplier marked as ${newStatus.toLowerCase()}`);

      } catch (error) {
          console.error('Status update failed:', error);
          toast.error("Failed to update status");
      }
  };

  if (!canRead('suppliers') && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view suppliers.</p>
      </div>
    );
  }

  const filteredSuppliers = suppliersList.filter(supplier => {
    const matchesSearch = 
        supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    const matchesPayment = paymentTermsFilter === 'all' || supplier.paymentTerms === paymentTermsFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const activeSuppliersCount = suppliersList.filter(s => s.status === 'ACTIVE').length;
  const uniquePaymentTerms = [...new Set(suppliersList.map(s => s.paymentTerms))];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Suppliers</h1>
          <p className="page-description">Manage your supply chain partners</p>
        </div>
        {canCreate('suppliers') && (
          <Button className="gap-2" onClick={() => {
              setEditingSupplier(null); // Clear for new addition
              setShowAddDialog(true);
          }}>
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        )}
      </div>

      <AddSupplierDialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
                setEditingSupplier(null); // Reset on close
                fetchSuppliers(); 
            }
        }} 
        supplier={editingSupplier}
      />

      <SupplierDetailsDialog 
         open={showDetailsDialog}
         onOpenChange={setShowDetailsDialog}
         supplier={selectedSupplier}
         onStatusChange={isAdmin() ? handleStatusChange : undefined}
         onEdit={(supplier) => {
             setEditingSupplier(supplier);
             setShowDetailsDialog(false); // Close details
             setShowAddDialog(true); // Open edit form
         }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Truck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-xl font-semibold">{suppliersList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Truck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="text-xl font-semibold">{activeSuppliersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:items-end">
             {/* Search */}
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                />
             </div>
             
             {/* Filter Status */}
             <div className="w-full sm:w-[180px]">
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                     <SelectTrigger>
                         <div className="flex items-center gap-2">
                             <Filter className="w-4 h-4 text-muted-foreground" /> 
                             <SelectValue placeholder="Status" />
                         </div>
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="all">All Statuses</SelectItem>
                         <SelectItem value="ACTIVE">Active</SelectItem>
                         <SelectItem value="INACTIVE">Inactive</SelectItem>
                     </SelectContent>
                 </Select>
             </div>

             {/* Filter Payment Terms */}
             <div className="w-full sm:w-[180px]">
                 <Select value={paymentTermsFilter} onValueChange={setPaymentTermsFilter}>
                     <SelectTrigger>
                         <SelectValue placeholder="Payment Terms" />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="all">All Terms</SelectItem>
                         {uniquePaymentTerms.map(term => (
                             <SelectItem key={term} value={term || 'unknown'}>{term?.replace('_', ' ') || 'Unknown'}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suppliers ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Supplier</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment Terms</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map((supplier) => (
                            <tr 
                                key={supplier.id} 
                                className="data-table-row cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                    setSelectedSupplier(supplier);
                                    setShowDetailsDialog(true);
                                }}
                            >
                                <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {supplier.companyName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{supplier.companyName}</span>
                                </div>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">{supplier.contactName}</td>
                                <td className="py-3 px-4 text-muted-foreground">{supplier.email}</td>
                                <td className="py-3 px-4 text-muted-foreground">{supplier.phone || '—'}</td>
                                <td className="py-3 px-4">
                                <Badge variant="outline">{supplier.paymentTerms?.replace('_', ' ') || 'N/A'}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                <Badge variant="outline" className={statusColors[supplier.status]}>
                                    {supplier.status}
                                </Badge>
                                </td>
                            </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No suppliers found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
