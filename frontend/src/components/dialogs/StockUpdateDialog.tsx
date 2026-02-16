import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types';

const stockUpdateSchema = z.object({
  itemId: z.string().min(1, 'Please select an item'),
  type: z.enum(['add', 'remove']),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason/Reference is required'),
  notes: z.string().optional(),
});

type StockUpdateFormData = z.infer<typeof stockUpdateSchema>;

interface StockUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedItemId?: string | null;
  items?: InventoryItem[];
  onSuccess?: () => void;
}

export function StockUpdateDialog({ open, onOpenChange, preselectedItemId, items = [], onSuccess }: StockUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockUpdateFormData>({
    resolver: zodResolver(stockUpdateSchema) as any,
    defaultValues: {
      type: 'add',
      quantity: 1,
    },
  });

  const watchType = watch('type');
  const watchItemId = watch('itemId');

  useEffect(() => {
    if (preselectedItemId) {
      setValue('itemId', preselectedItemId);
      const item = items.find(i => i.id === preselectedItemId);
      setSelectedItem(item || null);
    }
  }, [preselectedItemId, setValue, items]);

  useEffect(() => {
    if (watchItemId) {
      const item = items.find(i => i.id === watchItemId);
      setSelectedItem(item || null);
    }
  }, [watchItemId, items]);

  const onSubmit = async (data: StockUpdateFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('http://localhost:5000/api/inventory/stock-update', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(data)
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to update stock');
      }
      
      const action = data.type === 'add' ? 'Added' : 'Removed';
      toast.success(`Successfully ${action.toLowerCase()} ${data.quantity} units ${data.type === 'add' ? 'to' : 'from'} inventory`);
      
      reset();
      setSelectedItem(null);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stock Level</DialogTitle>
          <DialogDescription>
            Record inbound or outbound stock movements manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Transaction Type */}
            <div className="bg-muted p-2 rounded-lg flex justify-center">
              <RadioGroup
                defaultValue="add"
                value={watchType}
                onValueChange={(val) => setValue('type', val as 'add' | 'remove')}
                className="flex items-center space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="r1" />
                  <Label htmlFor="r1" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Plus className="w-4 h-4 text-success" /> Add Stock
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remove" id="r2" />
                  <Label htmlFor="r2" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Minus className="w-4 h-4 text-destructive" /> Remove Stock
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <Label htmlFor="itemId">Select Item</Label>
              <Select 
                onValueChange={(val) => setValue('itemId', val)} 
                defaultValue={preselectedItemId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search or select item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Current: {item.quantityOnHand})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.itemId && <p className="text-sm text-destructive">{errors.itemId.message}</p>}
            </div>

            {/* Current Stock Display */}
            {selectedItem && (
               <div className="text-sm rounded-md border p-3 flex justify-between items-center bg-card">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-bold">{selectedItem.quantityOnHand}</span>
               </div>
            )}

            {/* Quantity and Reason */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    type="number" 
                    id="quantity" 
                    {...register('quantity')} 
                    className="font-mono text-lg"
                    min="1"
                  />
                  {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
               </div>
               <div className="space-y-2">
                  <Label htmlFor="reason">Reference / Reason</Label>
                  <Input 
                    id="reason" 
                    {...register('reason')} 
                    placeholder={watchType === 'add' ? 'e.g. Purchase Order, Return' : 'e.g. Damage, Adjustment'} 
                  />
                  {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
               </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                {...register('notes')} 
                placeholder="Additional details..." 
                rows={2} 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
                type="submit" 
                disabled={isSubmitting}
                variant={watchType === 'remove' ? 'destructive' : 'default'}
                className="gap-2"
            >
              {watchType === 'add' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {watchType === 'add' ? 'Add to Inventory' : 'Remove from Inventory'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
