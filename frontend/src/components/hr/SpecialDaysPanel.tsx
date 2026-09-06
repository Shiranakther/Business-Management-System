import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpecialDay {
  id: string;
  date: string;
  name: string;
  type: string;
  isPaidHoliday: boolean;
  isRecurring: boolean;
  otMultiplier: number | null;
}

export function SpecialDaysPanel() {
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('HOLIDAY');
  const [isPaidHoliday, setIsPaidHoliday] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [otMultiplier, setOtMultiplier] = useState('');

  const fetchSpecialDays = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get(`${API_BASE_URL}/api/hr/special-days`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      setSpecialDays(response.data);
    } catch (error: any) {
      console.error('Error fetching special days:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch special days');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialDays();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name || !type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        date,
        name,
        type,
        isPaidHoliday,
        isRecurring,
        otMultiplier: otMultiplier ? parseFloat(otMultiplier) : null,
      };

      await axios.post(`${API_BASE_URL}/api/hr/special-days`, payload, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      toast.success('Special day added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchSpecialDays();
    } catch (error: any) {
      console.error('Error adding special day:', error);
      toast.error(error.response?.data?.message || 'Failed to add special day');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this special day?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await axios.delete(`${API_BASE_URL}/api/hr/special-days/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      toast.success('Special day deleted successfully');
      fetchSpecialDays();
    } catch (error: any) {
      console.error('Error deleting special day:', error);
      toast.error(error.response?.data?.message || 'Failed to delete special day');
    }
  };

  const resetForm = () => {
    setDate('');
    setName('');
    setType('HOLIDAY');
    setIsPaidHoliday(true);
    setIsRecurring(true);
    setOtMultiplier('');
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HOLIDAY': return <Badge variant="secondary">Holiday</Badge>;
      case 'POYA': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Poya</Badge>;
      case 'SPECIAL_OT': return <Badge variant="default">Special OT</Badge>;
      case 'FULL_DAY_OT': return <Badge variant="default" className="bg-orange-500">Full Day OT</Badge>;
      case 'DOUBLE_OT': return <Badge variant="default" className="bg-red-500">Double OT</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Special Days</h2>
          <p className="text-muted-foreground text-sm">
            Manage company holidays, Poya days, and special OT days.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Special Day
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Special Day</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Vesak Poya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                    <SelectItem value="POYA">Poya Day</SelectItem>
                    <SelectItem value="SPECIAL_OT">Special OT</SelectItem>
                    <SelectItem value="FULL_DAY_OT">Full Day OT</SelectItem>
                    <SelectItem value="DOUBLE_OT">Double OT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isPaidHoliday">Paid Holiday</Label>
                <Switch
                  id="isPaidHoliday"
                  checked={isPaidHoliday}
                  onCheckedChange={setIsPaidHoliday}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isRecurring">Recurring Yearly</Label>
                <Switch
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otMultiplier">OT Multiplier (Optional)</Label>
                <Input
                  id="otMultiplier"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 1.5"
                  value={otMultiplier}
                  onChange={(e) => setOtMultiplier(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" className="mr-2" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Paid Holiday</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>OT Multiplier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : specialDays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No special days found.
                </TableCell>
              </TableRow>
            ) : (
              specialDays.map((day) => (
                <TableRow key={day.id}>
                  <TableCell>
                    {day.date ? format(new Date(day.date), 'MMM dd, yyyy') : ''}
                  </TableCell>
                  <TableCell className="font-medium">{day.name}</TableCell>
                  <TableCell>{getTypeBadge(day.type)}</TableCell>
                  <TableCell>{day.isPaidHoliday ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{day.isRecurring ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{day.otMultiplier || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(day.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
