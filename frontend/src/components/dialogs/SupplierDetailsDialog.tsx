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
  import { 
      Building2, User, Phone, Mail, Globe, MapPin, 
      CreditCard, Clock, Star, FileText, CheckCircle, XCircle, Edit
  } from 'lucide-react';
  import { Avatar, AvatarFallback } from '@/components/ui/avatar';
  import type { Supplier } from '@/types';
  import { usePermissions } from '@/hooks/usePermissions';
  import { useState } from 'react';
  
  interface SupplierDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier | null;
    onStatusChange?: (id: string, newStatus: 'ACTIVE' | 'INACTIVE') => Promise<void>;
    onEdit?: (supplier: Supplier) => void;
  }
  
  export function SupplierDetailsDialog({ open, onOpenChange, supplier, onStatusChange, onEdit }: SupplierDetailsDialogProps) {
    const { isAdmin } = usePermissions();
    const [isUpdating, setIsUpdating] = useState(false);
  
    if (!supplier) return null;
  
    const handleToggleStatus = async () => {
        if (!onStatusChange) return;
        setIsUpdating(true);
        try {
            const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await onStatusChange(supplier.id, newStatus);
        } finally {
            setIsUpdating(false);
        }
    };
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
             <div className="flex items-start justify-between">
                 <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 border-2 border-border shadow-sm">
                          <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                              {supplier.companyName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                      </Avatar>
                      <div>
                          <div className="flex items-center gap-3">
                              <DialogTitle className="text-2xl font-bold">{supplier.companyName}</DialogTitle>
                              <Badge variant={supplier.status === 'ACTIVE' ? 'default' : 'secondary'} className={`${supplier.status === 'ACTIVE' ? 'bg-success hover:bg-success/90' : ''}`}>
                                  {supplier.status}
                              </Badge>
                          </div>
                          <DialogDescription className="mt-1 flex items-center gap-2">
                             {supplier.website && (
                                 <a href={supplier.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                                     <Globe className="w-3.5 h-3.5" /> {supplier.website.replace(/^https?:\/\//, '')}
                                 </a>
                             )}
                          </DialogDescription>
                      </div>
                 </div>
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(supplier)} className="gap-2 mt-8">
                      <Edit className="w-4 h-4" /> Edit
                  </Button>
             </div>
          </DialogHeader>
  
          <div className="space-y-6 mt-4">
              
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <User className="w-4 h-4" /> Primary Contact
                      </h4>
                      <div className="space-y-2">
                          <p className="font-semibold">{supplier.contactName}</p>
                          <div className="flex items-center gap-2 text-sm text-foreground/80">
                              <Mail className="w-4 h-4 text-muted-foreground" /> 
                              <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Phone className="w-4 h-4" /> Phone Numbers
                      </h4>
                      <div className="space-y-2 text-sm text-foreground/80">
                          {supplier.phone && (
                              <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground w-12">Office:</span> 
                                  {supplier.phone}
                              </div>
                          )}
                          {supplier.mobile && (
                              <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground w-12">Mobile:</span> 
                                  {supplier.mobile}
                              </div>
                          )}
                          {!supplier.phone && !supplier.mobile && <span className="italic text-muted-foreground">No phone provided</span>}
                      </div>
                  </div>
              </div>
  
              <Separator />
  
              {/* Business & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Address
                      </h4>
                      <div className="flex items-start gap-2 text-sm text-foreground/80">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                              <p>{supplier.address}</p>
                              <p>{[supplier.city, supplier.state, supplier.zipCode].filter(Boolean).join(', ')}</p>
                              <p>{supplier.country}</p>
                          </div>
                      </div>
                  </div>
  
                  <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                           <CreditCard className="w-4 h-4" /> Financials
                      </h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-1 border-border/50">
                              <span className="text-muted-foreground">Payment Terms</span>
                              <span className="font-medium">{supplier.paymentTerms?.replace('_', ' ') || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-border/50">
                              <span className="text-muted-foreground">Tax ID</span>
                              <span className="font-mono">{supplier.taxId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Bank Name</span>
                              <span>{supplier.bankName || 'N/A'}</span>
                          </div>
                      </div>
                  </div>
              </div>
  
              <Separator />
  
              {/* Performance & Logistics */}
              <div>
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Clock className="w-4 h-4" /> Performance Metrics
                   </h4>
                   <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-secondary/20 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Lead Time</p>
                            <p className="font-bold text-lg">{supplier.leadTime || 0} <span className="text-xs font-normal text-muted-foreground">days</span></p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Min. Order</p>
                            <p className="font-bold text-lg">${supplier.minOrderValue || 0}</p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground mb-1">Rating</p>
                            <div className="flex items-center justify-center gap-1 font-bold text-lg">
                                 {supplier.rating || 0} <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            </div>
                        </div>
                   </div>
              </div>
  
              {supplier.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                       <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-500 mb-1 flex items-center gap-2">
                           <FileText className="w-4 h-4" /> Notes
                       </h4>
                       <p className="text-sm text-yellow-800/80 dark:text-yellow-500/80 italic">
                           {supplier.notes}
                       </p>
                  </div>
              )}
  
          </div>
  
          {isAdmin() && (
              <div className="flex justify-end pt-4 border-t mt-6">
                   {/* Admin Actions */}
                   <Button 
                      variant={supplier.status === 'ACTIVE' ? 'destructive' : 'default'} 
                      onClick={handleToggleStatus}
                      disabled={isUpdating}
                      className={supplier.status === 'ACTIVE' ? '' : 'bg-success hover:bg-success/90'}
                  >
                      {supplier.status === 'ACTIVE' ? (
                          <><XCircle className="w-4 h-4 mr-2" /> Deactivate Supplier</>
                      ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Activate Supplier</>
                      )}
                   </Button>
              </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
  
