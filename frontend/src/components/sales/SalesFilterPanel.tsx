import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface SalesFilters {
  dateRange: { from: Date | undefined; to: Date | undefined };
  customers: string[];
  categories: string[];
  paymentStatus: string[];
  orderStatus: string[];
  salesChannel: string[];
  priceRange: { min: number | undefined; max: number | undefined };
}

interface SalesFilterPanelProps {
  filters: SalesFilters;
  onFiltersChange: (filters: SalesFilters) => void;
  customers: { id: string; name: string }[];
  categories: string[];
  onViewResults: () => void;
}

const PAYMENT_STATUSES = ['PAID', 'PENDING', 'REFUNDED'];
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SALES_CHANNELS = ['Online', 'In-Store', 'Wholesale', 'Direct'];

export function SalesFilterPanel({ filters, onFiltersChange, customers, categories, onViewResults }: SalesFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Local state for buffering changes
  const [localFilters, setLocalFilters] = useState<SalesFilters>(filters);

  // Sync local state when prop filters change (e.g. external reset), but careful about loops if we were auto-saving.
  // Since we are adding an apply button, we only sync downwards if the parent changes from outside this component's action context.
  useEffect(() => {
     setLocalFilters(filters);
  }, [filters]);

  const updateLocalFilter = <K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'customers' | 'categories' | 'paymentStatus' | 'orderStatus' | 'salesChannel', value: string) => {
    const current = localFilters[key];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateLocalFilter(key, updated);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onViewResults();
  };

  const clearAllFilters = () => {
    const emptyFilters: SalesFilters = {
      dateRange: { from: undefined, to: undefined },
      customers: [],
      categories: [],
      paymentStatus: [],
      orderStatus: [],
      salesChannel: [],
      priceRange: { min: undefined, max: undefined },
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFilterCount = [
    localFilters.dateRange.from || localFilters.dateRange.to ? 1 : 0,
    localFilters.customers.length > 0 ? 1 : 0,
    localFilters.categories.length > 0 ? 1 : 0,
    localFilters.paymentStatus.length > 0 ? 1 : 0,
    localFilters.orderStatus.length > 0 ? 1 : 0,
    localFilters.salesChannel.length > 0 ? 1 : 0,
    localFilters.priceRange.min || localFilters.priceRange.max ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // MultiSelect Component Helper
  const MultiSelect = ({ 
      title, 
      options, 
      selectedValues, 
      onToggle, 
      onSelectAll 
  }: { 
      title: string, 
      options: { label: string, value: string }[], 
      selectedValues: string[], 
      onToggle: (val: string) => void,
      onSelectAll: () => void
  }) => {
      return (
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 border-dashed">
                      <span className="truncate">
                          {selectedValues.length === 0 
                              ? title 
                              : selectedValues.length === options.length 
                                  ? `All ${title}` 
                                  : `${selectedValues.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                      <CommandInput placeholder={`Search ${title}...`} />
                      <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                              <CommandItem onSelect={onSelectAll} className="font-medium">
                                  <div className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                      selectedValues.length === options.length ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                  )}>
                                      <Check className={cn("h-4 w-4")} />
                                  </div>
                                  <span>Select All</span>
                              </CommandItem>
                              <CommandSeparator className="my-1" />
                              {options.map((option) => {
                                  const isSelected = selectedValues.includes(option.value);
                                  return (
                                      <CommandItem
                                          key={option.value}
                                          value={option.label}
                                          onSelect={() => onToggle(option.value)}
                                      >
                                          <div
                                              className={cn(
                                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                  isSelected
                                                      ? "bg-primary text-primary-foreground"
                                                      : "opacity-50 [&_svg]:invisible"
                                              )}
                                          >
                                              <Check className={cn("h-4 w-4")} />
                                          </div>
                                          <span>{option.label}</span>
                                      </CommandItem>
                                  );
                              })}
                          </CommandGroup>
                      </CommandList>
                  </Command>
              </PopoverContent>
          </Popover>
      );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-primary" />
            <span className="font-medium text-lg">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                {activeFilterCount} Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button 
                size="sm" 
                onClick={applyFilters}
                className="h-8"
            >
                Apply Filters
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-4 space-y-6">
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !localFilters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateRange.from ? (
                      localFilters.dateRange.to ? (
                        <>
                          {format(localFilters.dateRange.from, "LLL dd")} - {format(localFilters.dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(localFilters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={localFilters.dateRange.from}
                    selected={{ from: localFilters.dateRange.from, to: localFilters.dateRange.to }}
                    onSelect={(range) => updateLocalFilter('dateRange', { from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Customers Dropdown */}
            <div className="space-y-2">
              <Label>Customers</Label>
              <MultiSelect 
                  title="Customers"
                  options={customers.map(c => ({ label: c.name, value: c.id }))}
                  selectedValues={localFilters.customers}
                  onToggle={(val) => toggleArrayFilter('customers', val)}
                  onSelectAll={() => {
                      if (localFilters.customers.length === customers.length) {
                          updateLocalFilter('customers', []);
                      } else {
                          updateLocalFilter('customers', customers.map(c => c.id));
                      }
                  }}
              />
            </div>

            {/* Categories Dropdown */}
            <div className="space-y-2">
              <Label>Product Categories</Label>
              <MultiSelect 
                  title="Categories"
                  options={categories.map(c => ({ label: c, value: c }))}
                  selectedValues={localFilters.categories}
                  onToggle={(val) => toggleArrayFilter('categories', val)}
                  onSelectAll={() => {
                      if (localFilters.categories.length === categories.length) {
                          updateLocalFilter('categories', []);
                      } else {
                          updateLocalFilter('categories', [...categories]);
                      }
                  }}
              />
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.priceRange.min ?? ''}
                  onChange={(e) => updateLocalFilter('priceRange', {
                    ...localFilters.priceRange,
                    min: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-full"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.priceRange.max ?? ''}
                  onChange={(e) => updateLocalFilter('priceRange', {
                    ...localFilters.priceRange,
                    max: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <Separator />

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Status */}
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_STATUSES.map(status => (
                  <Badge 
                    key={status}
                    variant={localFilters.paymentStatus.includes(status) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('paymentStatus', status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Order Status */}
            <div className="space-y-2">
              <Label>Order Status</Label>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map(status => (
                  <Badge 
                    key={status}
                    variant={localFilters.orderStatus.includes(status) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayFilter('orderStatus', status)}
                  >
                    {status.toLowerCase()}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sales Channel */}
            <div className="space-y-2">
              <Label>Sales Channel</Label>
              <div className="flex flex-wrap gap-2">
                {SALES_CHANNELS.map(channel => (
                  <Badge 
                    key={channel}
                    variant={localFilters.salesChannel.includes(channel) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('salesChannel', channel)}
                  >
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
