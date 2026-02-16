import { useState, useMemo } from 'react';
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { customers, inventoryItems } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface OrderItemForm {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ManualCustomer {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
}

export function AddSaleDialog({ open, onOpenChange }: AddSaleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customer selection
  const [customerType, setCustomerType] = useState<'existing' | 'manual'>('existing');
  const [customerId, setCustomerId] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Manual customer details
  const [manualCustomer, setManualCustomer] = useState<ManualCustomer>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [notes, setNotes] = useState('');

  // Shipping address
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  // Filter customers by search query (name or phone)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.companyName.toLowerCase().includes(query) ||
        customer.contactName.toLowerCase().includes(query) ||
        (customer.phone && customer.phone.includes(query))
    );
  }, [customerSearchQuery]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const addProduct = () => {
    setOrderItems([...orderItems, { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeProduct = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, productId: string) => {
    const product = inventoryItems.find(p => p.id === productId);
    if (product) {
      const newItems = [...orderItems];
      newItems[index] = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.unitPrice,
        total: product.unitPrice,
      };
      setOrderItems(newItems);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].unitPrice;
    setOrderItems(newItems);
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const shippingCost = shippingMethod === 'EXPRESS' ? 25 : shippingMethod === 'OVERNIGHT' ? 50 : 10;
  const total = subtotal + tax + shippingCost;

  const handleSubmit = async () => {
    if (customerType === 'existing' && !customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (customerType === 'manual' && (!manualCustomer.companyName || !manualCustomer.contactName)) {
      toast.error('Please fill in customer details');
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const orderData = {
        customerType,
        customerId: customerType === 'existing' ? customerId : null,
        manualCustomer: customerType === 'manual' ? manualCustomer : null,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        shippingMethod,
        subtotal,
        tax,
        shippingCost,
        total,
        notes,
      };
      console.log('New order:', orderData);
      toast.success('Order created successfully!');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerType('existing');
    setCustomerId('');
    setCustomerSearchQuery('');
    setManualCustomer({ companyName: '', contactName: '', email: '', phone: '' });
    setPaymentMethod('CREDIT_CARD');
    setShippingMethod('STANDARD');
    setOrderItems([]);
    setNotes('');
    setShippingAddress({ street: '', city: '', state: '', zipCode: '', country: 'United States' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
            
            {/* Customer Type Toggle */}
            <RadioGroup
              value={customerType}
              onValueChange={(value) => setCustomerType(value as 'existing' | 'manual')}
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

            {/* Existing Customer Search */}
            {customerType === 'existing' && (
              <div className="space-y-2">
                <Label>Search Customer (by name or phone) *</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.companyName} - ${selectedCustomer.contactName}`
                        : "Search by name or phone..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name or phone..."
                        value={customerSearchQuery}
                        onValueChange={setCustomerSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {filteredCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              onSelect={() => {
                                setCustomerId(customer.id);
                                setCustomerSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.companyName}</span>
                                <span className="text-xs text-muted-foreground">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={manualCustomer.companyName}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, companyName: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={manualCustomer.contactName}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, contactName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={manualCustomer.email}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={manualCustomer.phone}
                    onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Order Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </Button>
            </div>
            
            {orderItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                No products added yet. Click "Add Product" to start.
              </p>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <ProductLineItem
                    key={index}
                    item={item}
                    index={index}
                    onProductChange={updateProduct}
                    onQuantityChange={updateQuantity}
                    onRemove={removeProduct}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Shipping Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={shippingAddress.zipCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Shipping Method */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Payment & Shipping</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="WIRE">Wire Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shipping Method</Label>
                <Select value={shippingMethod} onValueChange={setShippingMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard ($10)</SelectItem>
                    <SelectItem value="EXPRESS">Express ($25)</SelectItem>
                    <SelectItem value="OVERNIGHT">Overnight ($50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Separate component for product line item with search
interface ProductLineItemProps {
  item: OrderItemForm;
  index: number;
  onProductChange: (index: number, productId: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

function ProductLineItem({ item, index, onProductChange, onQuantityChange, onRemove }: ProductLineItemProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const availableProducts = inventoryItems.filter(p => p.status !== 'OUT_OF_STOCK');
  
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return availableProducts;
    const query = searchQuery.toLowerCase();
    return availableProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [searchQuery, availableProducts]);

  const selectedProduct = inventoryItems.find(p => p.id === item.productId);

  return (
    <div className="flex items-end gap-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1 space-y-2">
        <Label>Product</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedProduct
                ? `${selectedProduct.name} - ${formatCurrency(selectedProduct.unitPrice)}`
                : "Search product by name..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name, SKU, or category..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => {
                        onProductChange(index, product.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          item.productId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          SKU: {product.sku} • {product.category} • {formatCurrency(product.unitPrice)}
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
      <div className="w-24 space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 1)}
        />
      </div>
      <div className="w-28 space-y-2">
        <Label>Total</Label>
        <Input value={formatCurrency(item.total)} readOnly className="bg-muted" />
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
