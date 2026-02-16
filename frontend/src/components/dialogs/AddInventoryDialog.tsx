import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from 'sonner';
import type { InventoryItem, Supplier } from '@/types';
import { Check, ChevronsUpDown, User, Mail, CreditCard, Building2, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const inventorySchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(50).optional(),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().max(50).optional(),
  supplier: z.string().max(100).optional(),
  quantityOnHand: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  reorderPoint: z.coerce.number().min(0, 'Reorder point must be 0 or more'),
  maxStock: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  costPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  dimensions: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  imageUrl: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSuccess?: () => void;
}

const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Hardware', 'Software', 'Other'];

export function AddInventoryDialog({ open, onOpenChange, itemToEdit, onSuccess }: AddInventoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productImage, setProductImage] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [openSupplier, setOpenSupplier] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema) as any,
    defaultValues: {
      quantityOnHand: 0,
      reorderPoint: 10,
      unitPrice: 0,
    },
  });

  const selectedSupplierName = watch('supplier');
  const selectedSupplierDetails = suppliersList.find(s => s.companyName === selectedSupplierName);

  useEffect(() => {
    if (open) {
      const fetchSuppliers = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const res = await fetch('http://localhost:5000/api/suppliers', {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
             const data = await res.json();
             setSuppliersList(data);
          }
        } catch (e) {
             console.error("Failed to fetch suppliers", e);
        }
      };
      
      fetchSuppliers();

      if (itemToEdit) {
        // Edit mode
        reset({
          sku: itemToEdit.sku,
          barcode: itemToEdit.barcode ?? undefined,
          name: itemToEdit.name,
          description: itemToEdit.description ?? undefined,
          category: itemToEdit.category,
          brand: itemToEdit.brand ?? undefined,
          supplier: itemToEdit.supplier ?? undefined,
          quantityOnHand: itemToEdit.quantityOnHand,
          reorderPoint: itemToEdit.reorderPoint,
          maxStock: itemToEdit.maxStock ?? undefined,
          unitPrice: itemToEdit.unitPrice,
          costPrice: itemToEdit.costPrice ?? undefined,
          weight: itemToEdit.weight ?? undefined,
          dimensions: itemToEdit.dimensions ?? undefined,
          location: itemToEdit.location ?? undefined,
          imageUrl: itemToEdit.imageUrl ?? undefined,
        });
        setProductImage(itemToEdit.imageUrl);
      } else {
        // Add mode
        reset({
          quantityOnHand: 0,
          reorderPoint: 10,
          unitPrice: 0,
        });
        setProductImage(undefined);
      }
      setImageFile(undefined);
    }
  }, [open, itemToEdit, reset]);

  const onSubmit = async (data: InventoryFormData) => {
    console.log('Form submitted:', data);
    setIsSubmitting(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) formData.append(key, value.toString());
        });
        
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const url = itemToEdit 
            ? `http://localhost:5000/api/inventory/${itemToEdit.id}`
            : 'http://localhost:5000/api/inventory';
            
        const method = itemToEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save product');
        }

      toast.success(itemToEdit ? 'Product updated successfully!' : 'Product added successfully!');
      
      onOpenChange(false);
      if (onSuccess) onSuccess();

      if (!itemToEdit) {
        reset();
        setProductImage(undefined);
        setImageFile(undefined);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
      console.error('Form validation errors:', errors);
      toast.error('Please check the form for errors');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Product Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Product Image</h3>
            <ImageUpload 
                value={productImage} 
                onChange={setProductImage}
                onFileChange={setImageFile} 
            />
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" {...register('sku')} placeholder="e.g., PROD-001" />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" {...register('barcode')} placeholder="e.g., 123456789012" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" {...register('name')} placeholder="Enter product name" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} placeholder="Product description..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register('brand')} placeholder="Brand name" />
              </div>
            </div>
          </div>

          {/* Inventory Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Inventory Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityOnHand">Quantity On Hand *</Label>
                <Input id="quantityOnHand" type="number" {...register('quantityOnHand')} />
                {errors.quantityOnHand && <p className="text-sm text-destructive">{errors.quantityOnHand.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point *</Label>
                <Input id="reorderPoint" type="number" {...register('reorderPoint')} />
                {errors.reorderPoint && <p className="text-sm text-destructive">{errors.reorderPoint.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input id="maxStock" type="number" {...register('maxStock')} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($) *</Label>
                <Input id="unitPrice" type="number" step="0.01" {...register('unitPrice')} />
                {errors.unitPrice && <p className="text-sm text-destructive">{errors.unitPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input id="costPrice" type="number" step="0.01" {...register('costPrice')} />
              </div>
            </div>
          </div>

          {/* Physical Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Physical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" step="0.01" {...register('weight')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions (LxWxH)</Label>
                <Input id="dimensions" {...register('dimensions')} placeholder="e.g., 10x5x3 cm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Warehouse Location</Label>
                <Input id="location" {...register('location')} placeholder="e.g., A-1-23" />
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Supplier</h3>
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="supplier">Supplier Name</Label>
              <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSupplier}
                    className="w-full justify-between"
                  >
                    {selectedSupplierName
                      ? suppliersList.find((s) => s.companyName === selectedSupplierName)?.companyName || selectedSupplierName
                      : "Select supplier..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search supplier..." />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
                      <CommandGroup>
                        {suppliersList.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.companyName}
                            onSelect={() => {
                              setValue('supplier', supplier.companyName);
                              setOpenSupplier(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSupplierName === supplier.companyName ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {supplier.companyName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedSupplierDetails && (
                 <div className="mt-3 p-4 rounded-lg bg-secondary/10 border shadow-sm animate-in fade-in-50 slide-in-from-top-2">
                     <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                         <div className="p-1.5 rounded-md bg-primary/10">
                            <Building2 className="w-4 h-4 text-primary" />
                         </div>
                         <span className="font-semibold text-base">{selectedSupplierDetails.companyName}</span>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                         <div className="flex items-center gap-2.5 text-muted-foreground group">
                             <User className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                             <span className="text-foreground font-medium">{selectedSupplierDetails.contactName}</span>
                         </div>
                         
                         <div className="flex items-center gap-2.5 text-muted-foreground group">
                             <Mail className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                             <span className="truncate text-foreground" title={selectedSupplierDetails.email}>{selectedSupplierDetails.email}</span>
                         </div>

                         {selectedSupplierDetails.phone && (
                              <div className="flex items-center gap-2.5 text-muted-foreground group">
                                 <Phone className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                                 <span className="text-foreground">{selectedSupplierDetails.phone}</span>
                             </div>
                         )}

                         <div className="flex items-center gap-2.5 text-muted-foreground group">
                             <CreditCard className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                             <span className="text-foreground capitalize">{selectedSupplierDetails.paymentTerms?.replace(/_/g, ' ').toLowerCase()}</span>
                         </div>
                         
                         {(selectedSupplierDetails.city || selectedSupplierDetails.country) && (
                             <div className="col-span-1 sm:col-span-2 flex items-center gap-2.5 text-muted-foreground group">
                                 <MapPin className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                                 <span className="text-foreground">{[selectedSupplierDetails.city, selectedSupplierDetails.country].filter(Boolean).join(', ')}</span>
                             </div>
                         )}
                     </div>
                 </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (itemToEdit ? 'Updating...' : 'Adding...') 
                : (itemToEdit ? 'Update Product' : 'Add Product')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
