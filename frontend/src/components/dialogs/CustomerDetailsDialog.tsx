import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  CreditCard, 
  BadgeCheck, 
  FileText,
  Clock,
  History,
  TrendingUp,
  Globe,
  Edit,
  Trash2
} from 'lucide-react';
import type { Customer } from '@/types';
import { format } from 'date-fns';

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  stats?: {
    totalOrders: number;
    ltv: number;
    outstanding: number;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  INACTIVE: 'bg-muted text-muted-foreground border-muted',
  SUSPENDED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function CustomerDetailsDialog({ customer, open, onOpenChange, onEdit, onDelete, stats }: CustomerDetailsDialogProps) {
  if (!customer) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const displayName = customer.customerType === 'B2B' ? customer.companyName : customer.name;

  // Use passed stats or fallback to customer object properties
  const displayTotalOrders = stats ? stats.totalOrders : (customer.totalOrders || 0);
  const displayLTV = stats ? stats.ltv : (customer.totalSpent || 0);
  const displayOutstanding = stats ? stats.outstanding : (customer.outstandingBalance || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
        {/* Header Section */}
        <div className="bg-primary/5 p-8 border-b border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
              {customer.customerType === 'B2B' ? <Building2 size={120} /> : <User size={120} />}
          </div>
          
          <div className="flex justify-between items-start relative z-10">
              <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner ${customer.customerType === 'B2B' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                   {customer.customerType === 'B2B' ? <Building2 size={40} /> : <User size={40} />}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-3xl font-bold tracking-tight">{displayName}</h2>
                    <Badge variant="outline" className={statusColors[customer.status]}>
                      {customer.status}
                    </Badge>
                    <Badge variant="secondary" className="bg-secondary/50">
                      {customer.customerType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
                    {customer.customerType === 'B2B' && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{customer.name} (Contact)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Since {format(new Date(customer.createdAt), 'MMM yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 mt-8 mr-2"
                onClick={() => onEdit?.(customer)}
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Main Content */}
          <div className="col-span-1 md:col-span-8 p-8 space-y-8">
            
            {/* Contact & Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                 <MessageSquare className="w-4 h-4" /> Reach Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Email</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>{customer.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Mobile</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>{customer.mobile}</span>
                  </div>
                </div>
                {customer.phone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Secondary Phone</p>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                    </div>
                  </div>
                )}
                {customer.whatsapp && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">WhatsApp</p>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <span>{customer.whatsapp}</span>
                    </div>
                  </div>
                )}
                {customer.preferredContactMethod && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Preferred Reach</p>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {customer.preferredContactMethod}
                    </Badge>
                  </div>
                )}
              </div>
            </section>

            {/* Address Information */}
            <section className="space-y-4">
               <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                 <MapPin className="w-4 h-4" /> Locations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Billing */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                  <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">Billing Address</p>
                  {customer.billingAddressLine1 ? (
                    <div className="text-sm space-y-1 leading-relaxed">
                      <p>{customer.billingAddressLine1}</p>
                      {customer.billingAddressLine2 && <p>{customer.billingAddressLine2}</p>}
                      <p>{customer.city}, {customer.district}</p>
                      <p className="font-mono text-xs">{customer.postalCode}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No billing address</p>
                  )}
                </div>
                
                {/* Delivery */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">Delivery Address</p>
                  {customer.deliveryAddressLine1 ? (
                    <div className="text-sm space-y-1 leading-relaxed">
                      <p>{customer.deliveryAddressLine1}</p>
                      {customer.deliveryAddressLine2 && <p>{customer.deliveryAddressLine2}</p>}
                      <p>{customer.deliveryCity}, {customer.deliveryDistrict}</p>
                      {customer.landmark && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> Near {customer.landmark}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Same as billing / Not specified</p>
                  )}
                </div>
              </div>
            </section>

            {/* B2B / B2C Specifics */}
            {customer.customerType === 'B2B' ? (
               <section className="space-y-4">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Business Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-secondary/10 p-5 rounded-2xl border">
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Registration #</p>
                        <p className="text-sm font-semibold">{customer.businessRegistrationNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">VAT Status</p>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{customer.vatRegistered ? `YES (${customer.vatPercentage}%)` : 'NO'}</p>
                            {customer.vatNumber && <Badge variant="outline" className="text-[10px] h-4">{customer.vatNumber}</Badge>}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Business Type</p>
                        <p className="text-sm font-semibold">{customer.businessType?.replace(/_/g, ' ') || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Website</p>
                        {customer.website ? (
                          <a href={customer.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                             <Globe size={12} /> Link
                          </a>
                        ) : <p className="text-sm font-semibold">N/A</p>}
                    </div>
                  </div>
               </section>
            ) : (
                <section className="space-y-4">
                   <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" /> Personal Verification
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-secondary/10 p-5 rounded-2xl border">
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">NIC Number</p>
                        <p className="text-sm font-semibold font-mono">{customer.nic || 'Not Provided'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Birth Date</p>
                        <p className="text-sm font-semibold">
                            {customer.dateOfBirth ? format(new Date(customer.dateOfBirth), 'dd MMM yyyy') : 'N/A'}
                        </p>
                    </div>
                  </div>
                </section>
            )}

            {customer.notes && (
                <section className="space-y-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase">Internal Management Notes</p>
                   <p className="text-sm p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg italic text-muted-foreground shadow-sm">
                      "{customer.notes}"
                   </p>
                </section>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="col-span-1 md:col-span-4 bg-muted/10 p-8 border-l border-border/50 space-y-8">
            {/* Financial Overview */}
            <div className="space-y-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                   <TrendingUp className="w-4 h-4" /> Financial Summary
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm flex items-center gap-4 group hover:border-primary transition-colors">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                          <History className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Orders</p>
                          <p className="text-base font-black">{displayTotalOrders}</p>
                      </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm flex items-center gap-4 group hover:border-primary transition-colors">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Lifetime Value</p>
                          <p className="text-base font-black">{formatCurrency(displayLTV)}</p>
                      </div>
                  </div>

                  <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${displayOutstanding > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-white dark:bg-zinc-900'}`}>
                      <div className={`p-2.5 rounded-xl ${displayOutstanding > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Outstanding</p>
                          <p className={`text-base font-black ${displayOutstanding > 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(displayOutstanding)}
                          </p>
                      </div>
                  </div>
                </div>
            </div>

            {/* Account Settings */}
            <div className="bg-secondary/5 rounded-2xl border border-secondary/20 overflow-hidden shadow-sm">
                <div className="bg-secondary/20 px-4 py-2 border-b border-secondary/20">
                    <p className="text-[10px] font-bold uppercase text-secondary-foreground flex items-center gap-1.2">
                      <BadgeCheck size={12} /> Account Privileges
                    </p>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Credit Support</span>
                        <Badge variant={customer.creditAllowed ? 'default' : 'secondary'} className={`rounded-full ${customer.creditAllowed ? 'bg-emerald-500 text-white' : ''}`}>
                            {customer.creditAllowed ? 'Enabled' : 'Disabled'}
                        </Badge>
                    </div>
                    {customer.creditAllowed && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Limit</span>
                        <span className="font-bold">{formatCurrency(customer.creditLimit || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Term</span>
                        <span className="font-bold underline decoration-dotted">{customer.paymentTerms?.replace(/_/g, ' ') || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-bold">{customer.defaultPaymentMethod?.replace(/_/g, ' ') || 'Not Set'}</span>
                    </div>
                </div>
            </div>

            {onDelete && (
                <div className="pt-4 mt-auto">
                     <Button 
                        variant="destructive" 
                        className="w-full text-sm font-medium gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20 border shadow-sm"
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
                                onDelete(customer);
                            }
                        }}
                    >
                       <Trash2 className="w-4 h-4" />
                       Delete Customer
                    </Button>
                </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
