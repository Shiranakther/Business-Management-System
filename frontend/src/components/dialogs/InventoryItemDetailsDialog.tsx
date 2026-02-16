import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Package, Barcode, MapPin, Tag, Truck, Scale, Calendar, Edit, Trash2 } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { format } from 'date-fns';

interface InventoryItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onEdit?: (item: InventoryItem) => void;
}

const statusColors: Record<string, string> = {
  IN_STOCK: 'bg-success/10 text-success border-success/20',
  LOW_STOCK: 'bg-warning/10 text-warning border-warning/20',
  OUT_OF_STOCK: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

export function InventoryItemDetailsDialog({ open, onOpenChange, item, onEdit }: InventoryItemDetailsDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-4">
             <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                    {item.name}
                    <Badge variant="outline" className={statusColors[item.status]}>
                        {item.status.replace(/_/g, ' ')}
                    </Badge>
                </DialogTitle>
                <DialogDescription className="mt-1.5 flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku}</span>
                    {item.barcode && <span className="font-mono text-xs text-muted-foreground flex items-center gap-1"><Barcode className="w-3 h-3" /> {item.barcode}</span>}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-6">
                {/* Product Image */}
                <div className="w-full md:w-1/3 aspect-square rounded-xl border bg-muted/50 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                    {item.imageUrl ? (
                        <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Package className="w-20 h-20 text-muted-foreground/20" />
                    )}
                </div>

                {/* Main Details */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                        <div className="text-sm text-foreground/90 leading-relaxed">
                            {item.description || <span className="text-muted-foreground italic">No description provided.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" /> Category
                            </span>
                            <p className="font-medium text-sm">{item.category}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" /> Brand
                            </span>
                            <p className="font-medium text-sm">{item.brand || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> Location
                            </span>
                            <p className="font-medium text-sm">{item.location || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Stock & Inventory */}
            <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Stock Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                         <p className="text-xs text-muted-foreground mb-1">Quantity On Hand</p>
                         <p className="font-bold text-2xl text-primary">{item.quantityOnHand}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                         <p className="text-xs text-muted-foreground mb-1">Reorder Point</p>
                         <p className="font-semibold text-lg">{item.reorderPoint}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                         <p className="text-xs text-muted-foreground mb-1">Max Stock</p>
                         <p className="font-semibold text-lg">{item.maxStock || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Pricing & Financials */}
            <div>
                 <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Pricing & Financials</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="p-3 bg-secondary/20 rounded-lg border">
                         <p className="text-xs text-muted-foreground mb-1">Unit Price</p>
                         <p className="font-bold text-lg">{formatCurrency(item.unitPrice)}</p>
                     </div>
                     <div className="p-3 bg-secondary/10 rounded-lg border">
                         <p className="text-xs text-muted-foreground mb-1">Cost Price</p>
                         <p className="font-medium">{item.costPrice ? formatCurrency(item.costPrice) : 'N/A'}</p>
                     </div>
                     <div className="p-3 bg-secondary/10 rounded-lg border">
                         <p className="text-xs text-muted-foreground mb-1">Avg. Cost</p>
                         <p className="font-medium">{formatCurrency(item.movingAverageCost)}</p>
                     </div>
                 </div>
            </div>

            <Separator />

            {/* Supplier & Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 text-sm">
                     <h4 className="font-medium flex items-center gap-2"><Truck className="w-4 h-4" /> Supplier Details</h4>
                     <p className="text-muted-foreground">
                        {item.supplier ? `Sourced from ${item.supplier}` : 'No primary supplier assigned'}
                     </p>
                </div>
                <div className="space-y-3 text-sm">
                     <h4 className="font-medium flex items-center gap-2"><Scale className="w-4 h-4" /> Physical Specs</h4>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-muted-foreground block text-xs">Weight</span>
                            <span>{item.weight ? `${item.weight} kg` : '-'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs">Dimensions</span>
                            <span>{item.dimensions || '-'}</span>
                        </div>
                     </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="flex gap-4 text-xs text-muted-foreground pt-4 border-t">
                 <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Last updated: {format(item.lastUpdated, 'MMM d, yyyy')}
                 </span>
            </div>

        </div>
        <div className="flex justify-between items-center pt-4 border-t mt-6">
            <Button variant="destructive" className="gap-2" onClick={() => {
                // Placeholder for delete logic
                console.log('Delete item:', item.id);
                onOpenChange(false);
            }}>
                <Trash2 className="w-4 h-4" />
                Delete Item
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button className="gap-2" onClick={() => {
                     console.log('Update Details clicked', item);
                     if (onEdit) {
                         onEdit(item);
                     } else {
                         console.log('Edit item:', item.id);
                     }
                }}>
                    <Edit className="w-4 h-4" />
                    Update Details
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
