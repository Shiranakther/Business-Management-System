import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ReportTemplateSelector, type ReportTemplateType } from './ReportTemplateSelector';
import { MultiSelect } from '@/components/ui/multi-select';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export interface ReportFilters {
  dateRange: { from: Date | undefined; to: Date | undefined };
  // Sales Report filters
  customers?: string[];
  paymentStatus?: string[];
  orderStatus?: string[];
  salesChannel?: string[];
  // Inventory Report filters
  categories?: string[];
  stockStatus?: string[];
  locations?: string[];
  // Expense Report filters
  expenseCategories?: string[];
  departments?: string[];
  expenseStatus?: string[];
  // HR Report filters
  employmentType?: string[];
  hrDepartments?: string[];
  employeeStatus?: string[];
  // Common
  minValue?: number;
  maxValue?: number;
}

interface ReportFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: 'sales' | 'inventory' | 'expenses' | 'hr';
  reportTitle: string;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onGenerateReport: (template: ReportTemplateType) => void;
}

const PAYMENT_STATUSES = ['PAID', 'PENDING', 'REFUNDED'];
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SALES_CHANNELS = ['Online', 'In-Store', 'Wholesale', 'Direct'];
const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];
const LOCATIONS = ['Warehouse A', 'Warehouse B', 'Store Front', 'Distribution Center'];
const EXPENSE_CATEGORIES = ['Office Supplies', 'Travel', 'Marketing', 'Software', 'Utilities', 'Salaries'];
const DEPARTMENTS = ['Sales', 'Marketing', 'Engineering', 'HR', 'Finance', 'Operations'];
const EXPENSE_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];

export function ReportFilterDialog({
  open,
  onOpenChange,
  reportType,
  reportTitle,
  filters,
  onFiltersChange,
  onGenerateReport,
}: ReportFilterDialogProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('modern');
  const [customerOptions, setCustomerOptions] = useState<{label: string, value: string}[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  // Load default template from localStorage on mount
  useEffect(() => {
    const savedTemplate = localStorage.getItem('defaultReportTemplate') as ReportTemplateType | null;
    if (savedTemplate && ['modern', 'classic', 'minimal'].includes(savedTemplate)) {
      setSelectedTemplate(savedTemplate);
    }
  }, []);

  // Fetch Customers & Inventory
  useEffect(() => {
      const fetchData = async () => {
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              
              const headers = { Authorization: `Bearer ${session.access_token}` };
              
              if (reportType === 'sales') {
                  const custRes = await axios.get('http://localhost:5000/api/customers', { headers });
                  setCustomerOptions(custRes.data.map((c:any) => ({ label: c.companyName || c.name, value: c.id })));
                  
                  // Also fetch inventory for categories in Sales report too
                  const invRes = await axios.get('http://localhost:5000/api/inventory', { headers });
                  const uniqueCategories = [...new Set(invRes.data.map((item: any) => item.category))].filter(Boolean) as string[];
                  setCategoryOptions(uniqueCategories);
              } else if (reportType === 'inventory') {
                  const invRes = await axios.get('http://localhost:5000/api/inventory', { headers });
                  const uniqueCategories = [...new Set(invRes.data.map((item: any) => item.category))].filter(Boolean) as string[];
                  setCategoryOptions(uniqueCategories);
              }
          } catch(err) {
              console.error("Failed to fetch filter data", err);
          }
      }
      fetchData();
  }, [reportType]);

  // Save template as default
  const handleSetAsDefault = (template: ReportTemplateType) => {
    localStorage.setItem('defaultReportTemplate', template);
    setSelectedTemplate(template);
  };

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof ReportFilters, value: string) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated as ReportFilters[typeof key]);
  };

  const clearFilters = () => {
    onFiltersChange({
      dateRange: filters.dateRange,
      customers: [],
      paymentStatus: [],
      orderStatus: [],
      salesChannel: [],
      categories: [],
      stockStatus: [],
      locations: [],
      expenseCategories: [],
      departments: [],
      expenseStatus: [],
      employmentType: [],
      hrDepartments: [],
      employeeStatus: [],
      minValue: undefined,
      maxValue: undefined,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.customers?.length) count++;
    if (filters.paymentStatus?.length) count++;
    if (filters.orderStatus?.length) count++;
    if (filters.salesChannel?.length) count++;
    if (filters.categories?.length) count++;
    if (filters.stockStatus?.length) count++;
    if (filters.locations?.length) count++;
    if (filters.expenseCategories?.length) count++;
    if (filters.departments?.length) count++;
    if (filters.expenseStatus?.length) count++;
    if (filters.employmentType?.length) count++;
    if (filters.hrDepartments?.length) count++;
    if (filters.employeeStatus?.length) count++;
    if (filters.minValue || filters.maxValue) count++;
    return count;
  };

  const generateReportData = () => {
     // Trigger report generation in parent (which uses ReportViewer with real data)
     onGenerateReport(selectedTemplate);
  };

  const renderSalesFilters = () => (
    <div className="space-y-4">
      {/* Customers */}
      <div className="space-y-2">
        <Label>Customers</Label>
        <MultiSelect 
            options={customerOptions}
            selected={filters.customers || []}
            onChange={(vals) => updateFilter('customers', vals)}
            placeholder="Select customers..."
        />
      </div>

      {/* Categories (Added for Sales Report) */}
      <div className="space-y-2">
        <Label>Product Categories</Label>
         <MultiSelect 
            options={categoryOptions.map(c => ({ label: c, value: c }))}
            selected={filters.categories || []}
            onChange={(vals) => updateFilter('categories', vals)}
            placeholder="Select categories..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Payment Status */}
        <div className="space-y-2">
          <Label>Payment Status</Label>
          <div className="space-y-1">
            {PAYMENT_STATUSES.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`payment-${status}`}
                  checked={filters.paymentStatus?.includes(status)}
                  onCheckedChange={() => toggleArrayFilter('paymentStatus', status)}
                />
                <label htmlFor={`payment-${status}`} className="text-sm cursor-pointer">
                  {status}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="space-y-2">
          <Label>Order Status</Label>
          <div className="space-y-1">
            {ORDER_STATUSES.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`order-${status}`}
                  checked={filters.orderStatus?.includes(status)}
                  onCheckedChange={() => toggleArrayFilter('orderStatus', status)}
                />
                <label htmlFor={`order-${status}`} className="text-sm cursor-pointer capitalize">
                  {status.toLowerCase()}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Channel */}
      <div className="space-y-2">
        <Label>Sales Channel</Label>
        <div className="flex flex-wrap gap-2">
          {SALES_CHANNELS.map(channel => (
            <div key={channel} className="flex items-center space-x-2">
              <Checkbox
                id={`channel-${channel}`}
                checked={filters.salesChannel?.includes(channel)}
                onCheckedChange={() => toggleArrayFilter('salesChannel', channel)}
              />
              <label htmlFor={`channel-${channel}`} className="text-sm cursor-pointer">
                {channel}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Value Range */}
      <div className="space-y-2">
        <Label>Order Value Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minValue ?? ''}
            onChange={(e) => updateFilter('minValue', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxValue ?? ''}
            onChange={(e) => updateFilter('maxValue', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderInventoryFilters = () => (
    <div className="space-y-4">
      {/* Categories */}
      <div className="space-y-2">
        <Label>Product Categories</Label>
         <MultiSelect 
            options={categoryOptions.map(c => ({ label: c, value: c }))}
            selected={filters.categories || []}
            onChange={(vals) => updateFilter('categories', vals)}
            placeholder="Select categories..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Stock Status */}
        <div className="space-y-2">
          <Label>Stock Status</Label>
          <div className="space-y-1">
            {STOCK_STATUSES.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`stock-${status}`}
                  checked={filters.stockStatus?.includes(status)}
                  onCheckedChange={() => toggleArrayFilter('stockStatus', status)}
                />
                <label htmlFor={`stock-${status}`} className="text-sm cursor-pointer">
                  {status.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <Label>Locations</Label>
          <div className="space-y-1">
            {LOCATIONS.map(location => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={`loc-${location}`}
                  checked={filters.locations?.includes(location)}
                  onCheckedChange={() => toggleArrayFilter('locations', location)}
                />
                <label htmlFor={`loc-${location}`} className="text-sm cursor-pointer">
                  {location}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Value Range */}
      <div className="space-y-2">
        <Label>Stock Value Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minValue ?? ''}
            onChange={(e) => updateFilter('minValue', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxValue ?? ''}
            onChange={(e) => updateFilter('maxValue', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderExpenseFilters = () => (
    <div className="space-y-4">
      {/* Expense Categories */}
      <div className="space-y-2">
        <Label>Expense Categories</Label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map(category => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`exp-${category}`}
                checked={filters.expenseCategories?.includes(category)}
                onCheckedChange={() => toggleArrayFilter('expenseCategories', category)}
              />
              <label htmlFor={`exp-${category}`} className="text-sm cursor-pointer">
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Departments */}
        <div className="space-y-2">
          <Label>Departments</Label>
          <div className="space-y-1">
            {DEPARTMENTS.map(dept => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`dept-${dept}`}
                  checked={filters.departments?.includes(dept)}
                  onCheckedChange={() => toggleArrayFilter('departments', dept)}
                />
                <label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                  {dept}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Status */}
        <div className="space-y-2">
          <Label>Approval Status</Label>
          <div className="space-y-1">
            {EXPENSE_STATUSES.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`expstat-${status}`}
                  checked={filters.expenseStatus?.includes(status)}
                  onCheckedChange={() => toggleArrayFilter('expenseStatus', status)}
                />
                <label htmlFor={`expstat-${status}`} className="text-sm cursor-pointer">
                  {status.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Amount Range */}
      <div className="space-y-2">
        <Label>Amount Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minValue ?? ''}
            onChange={(e) => updateFilter('minValue', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxValue ?? ''}
            onChange={(e) => updateFilter('maxValue', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderHRFilters = () => (
    <div className="space-y-4">
      {/* Departments */}
      <div className="space-y-2">
        <Label>Departments</Label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map(dept => (
            <div key={dept} className="flex items-center space-x-2">
              <Checkbox
                id={`hrdept-${dept}`}
                checked={filters.hrDepartments?.includes(dept)}
                onCheckedChange={() => toggleArrayFilter('hrDepartments', dept)}
              />
              <label htmlFor={`hrdept-${dept}`} className="text-sm cursor-pointer">
                {dept}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Employment Type */}
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <div className="space-y-1">
            {EMPLOYMENT_TYPES.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`emptype-${type}`}
                  checked={filters.employmentType?.includes(type)}
                  onCheckedChange={() => toggleArrayFilter('employmentType', type)}
                />
                <label htmlFor={`emptype-${type}`} className="text-sm cursor-pointer">
                  {type.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Status */}
        <div className="space-y-2">
          <Label>Employee Status</Label>
          <div className="space-y-1">
            {EMPLOYEE_STATUSES.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`empstat-${status}`}
                  checked={filters.employeeStatus?.includes(status)}
                  onCheckedChange={() => toggleArrayFilter('employeeStatus', status)}
                />
                <label htmlFor={`empstat-${status}`} className="text-sm cursor-pointer">
                  {status.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Range */}
      <div className="space-y-2">
        <Label>Salary Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minValue ?? ''}
            onChange={(e) => updateFilter('minValue', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxValue ?? ''}
            onChange={(e) => updateFilter('maxValue', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderFilters = () => {
    switch (reportType) {
      case 'sales':
        return renderSalesFilters();
      case 'inventory':
        return renderInventoryFilters();
      case 'expenses':
        return renderExpenseFilters();
      case 'hr':
        return renderHRFilters();
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{reportTitle} Configuration</span>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()} filters active
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
             {/* Template Section */}
             <div>
                <div className="flex items-center justify-between mb-3">
                   <Label className="text-base font-semibold">Report Template</Label>
                   <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSetAsDefault(selectedTemplate)}
                      className="text-xs"
                   >
                      Set as Default
                   </Button>
                </div>
                <ReportTemplateSelector selectedTemplate={selectedTemplate} onSelect={setSelectedTemplate} />
             </div>

             <Separator />
             
             {/* Date Range */}
             <div className="space-y-2">
              <Label className="text-base font-semibold mb-2 block">Filters & Data Scope</Label>
              <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                          filters.dateRange.to ? (
                            <>
                              {format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(filters.dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Select date range for this report</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[200] bg-popover" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from}
                        selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                        onSelect={(range) => updateFilter('dateRange', { from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
              </div>
            </div>

            {/* Report-specific filters */}
            {renderFilters()}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button onClick={generateReportData}>
              Generate & Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
