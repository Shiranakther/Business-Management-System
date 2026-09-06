import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Edit, Trash2, Truck, Loader2 } from 'lucide-react';

interface Courier {
  id: string;
  name: string;
  contactNumber: string;
  email: string | null;
  trackingUrlTemplate: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function Couriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Selected
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  
  // Forms
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    email: '',
    trackingUrlTemplate: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCouriers();
  }, []);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/couriers`, { headers });
      setCouriers(res.data);
    } catch (error) {
      console.error('Failed to fetch couriers:', error);
      toast.error('Failed to load couriers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactNumber) {
      toast.error('Name and Contact Number are required');
      return;
    }
    try {
      setSubmitting(true);
      const headers = await getHeaders();
      await axios.post(`${API_BASE_URL}/api/couriers`, formData, { headers });
      toast.success('Courier added successfully');
      setIsCreateOpen(false);
      fetchCouriers();
      setFormData({ name: '', contactNumber: '', email: '', trackingUrlTemplate: '', isActive: true });
    } catch (error) {
      console.error('Failed to create courier:', error);
      toast.error('Failed to add courier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;
    if (!formData.name || !formData.contactNumber) {
      toast.error('Name and Contact Number are required');
      return;
    }
    try {
      setSubmitting(true);
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/couriers/${selectedCourier.id}`, formData, { headers });
      toast.success('Courier updated successfully');
      setIsEditOpen(false);
      fetchCouriers();
    } catch (error) {
      console.error('Failed to update courier:', error);
      toast.error('Failed to update courier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourier) return;
    try {
      setSubmitting(true);
      const headers = await getHeaders();
      await axios.delete(`${API_BASE_URL}/api/couriers/${selectedCourier.id}`, { headers });
      toast.success('Courier deactivated successfully');
      setIsDeleteOpen(false);
      fetchCouriers();
    } catch (error) {
      console.error('Failed to deactivate courier:', error);
      toast.error('Failed to deactivate courier');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (courier: Courier) => {
    setSelectedCourier(courier);
    setFormData({
      name: courier.name,
      contactNumber: courier.contactNumber,
      email: courier.email || '',
      trackingUrlTemplate: courier.trackingUrlTemplate || '',
      isActive: courier.isActive
    });
    setIsEditOpen(true);
  };

  const openDelete = (courier: Courier) => {
    setSelectedCourier(courier);
    setIsDeleteOpen(true);
  };

  const filteredCouriers = couriers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCouriers = couriers.length;
  const activeCouriers = couriers.filter(c => c.isActive).length;
  const inactiveCouriers = couriers.filter(c => !c.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courier Partners</h1>
          <p className="text-muted-foreground">Manage your delivery courier partners</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', contactNumber: '', email: '', trackingUrlTemplate: '', isActive: true });
          setIsCreateOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Courier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Couriers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCouriers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Couriers</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCouriers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Couriers</CardTitle>
            <Truck className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCouriers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search couriers by name..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact Number</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tracking URL Template</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredCouriers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No couriers found.
                  </td>
                </tr>
              ) : (
                filteredCouriers.map((courier) => (
                  <tr key={courier.id} className={`border-b transition-colors hover:bg-muted/50 ${!courier.isActive ? 'opacity-60' : ''}`}>
                    <td className="p-4 align-middle font-medium">{courier.name}</td>
                    <td className="p-4 align-middle">{courier.contactNumber}</td>
                    <td className="p-4 align-middle">{courier.email || '-'}</td>
                    <td className="p-4 align-middle text-muted-foreground truncate max-w-[200px]" title={courier.trackingUrlTemplate || ''}>
                      {courier.trackingUrlTemplate || '-'}
                    </td>
                    <td className="p-4 align-middle">
                      {courier.isActive ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(courier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(courier)} disabled={!courier.isActive}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Courier</DialogTitle>
            <DialogDescription>Create a new delivery courier partner.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number *</Label>
              <Input id="contact" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking URL Template</Label>
              <Input id="tracking" placeholder="https://track.example.com/?num={tracking}" value={formData.trackingUrlTemplate} onChange={e => setFormData({...formData, trackingUrlTemplate: e.target.value})} />
              <p className="text-xs text-muted-foreground">Use {'{tracking}'} as a placeholder for the tracking number.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Courier</DialogTitle>
            <DialogDescription>Update courier details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Number *</Label>
              <Input id="edit-contact" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tracking">Tracking URL Template</Label>
              <Input id="edit-tracking" placeholder="https://track.example.com/?num={tracking}" value={formData.trackingUrlTemplate} onChange={e => setFormData({...formData, trackingUrlTemplate: e.target.value})} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-active" checked={formData.isActive} onCheckedChange={checked => setFormData({...formData, isActive: checked})} />
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Courier</DialogTitle>
            <DialogDescription>
              This will deactivate the courier. Existing orders will still show this courier's information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
