import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Users,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { RolesPermissionsTab } from '@/components/settings/RolesPermissionsTab';
import { TeamSettingsTab } from '@/components/settings/TeamSettingsTab';
import { usePermissions } from '@/hooks/usePermissions';

const businessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  type: z.string().min(1, 'Please select a business type'),
  slug: z.string().min(3, 'URL slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().default('USD'),
  timezone: z.string().default('America/New_York'),
  dateFormat: z.string().default('MM/DD/YYYY'),
  taxPercentage: z.coerce.number().min(0).max(100).default(9),
});

export default function Settings() {
  const { currentUser, currentTenant, setCurrentTenant } = useAppStore();
  const { isAdmin } = usePermissions();
  const [businessLogo, setBusinessLogo] = useState<string | undefined>(currentTenant?.settings?.logoUrl);
  const [businessLogoFile, setBusinessLogoFile] = useState<File | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema) as any,
    defaultValues: {
      name: currentTenant?.name || '',
      type: currentTenant?.type || '',
      slug: currentTenant?.slug || '',
      address: currentTenant?.address || '',
      city: currentTenant?.city || '',
      state: currentTenant?.state || '',
      zipCode: currentTenant?.zipCode || '',
      country: currentTenant?.country || '',
      registrationNumber: currentTenant?.registrationNumber || '',
      taxId: currentTenant?.taxId || '',
      currency: currentTenant?.settings?.currency || 'USD',
      timezone: currentTenant?.settings?.timezone || 'America/New_York',
      dateFormat: currentTenant?.settings?.dateFormat || 'MM/DD/YYYY',
      taxPercentage: currentTenant?.taxPercentage ?? 9,
    },
  });

  useEffect(() => {
    if (currentTenant) {
      form.reset({
        name: currentTenant.name,
        type: currentTenant.type || 'enterprise', // fallback
        slug: currentTenant.slug,
        address: currentTenant.address || '',
        city: currentTenant.city || '',
        state: currentTenant.state || '',
        zipCode: currentTenant.zipCode || '',
        country: currentTenant.country || '',
        registrationNumber: currentTenant.registrationNumber || '',
        taxId: currentTenant.taxId || '',
        currency: currentTenant.settings?.currency || 'USD',
        timezone: currentTenant.settings?.timezone || 'America/New_York',
        dateFormat: currentTenant.settings?.dateFormat || 'MM/DD/YYYY',
        taxPercentage: currentTenant.taxPercentage ?? 9,
      });
      setBusinessLogo(currentTenant.settings?.logoUrl);
    }
  }, [currentTenant, form]);

  const onBusinessSubmit = async (values: z.infer<typeof businessSchema>) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null) formData.append(key, value.toString());
      });
      
      if (businessLogoFile) {
          formData.append('logo', businessLogoFile);
      }

      const response = await fetch('http://localhost:5000/api/business', {
          method: 'PUT',
          headers: {
              'Authorization': `Bearer ${token}`
              // Content-Type must strictly NOT be set to allow browser to set multipart boundary
          },
          body: formData
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update business');
      }

      const updatedOrg = await response.json();
      
      // Update local store
      if (currentTenant) {
          setCurrentTenant({
              ...currentTenant,
              name: updatedOrg.name,
              slug: updatedOrg.slug,
              type: updatedOrg.type,
              address: updatedOrg.address,
              city: updatedOrg.city,
              state: updatedOrg.state,
              zipCode: updatedOrg.zip_code,
              country: updatedOrg.country,
              registrationNumber: updatedOrg.registration_number,
              taxId: updatedOrg.tax_id,
              taxPercentage: updatedOrg.tax_percentage,
              settings: {
                  ...currentTenant.settings,
                  logoUrl: updatedOrg.logo_url,
                  currency: updatedOrg.currency,
                  timezone: updatedOrg.timezone,
                  dateFormat: updatedOrg.date_format
              }
          });
      }

      toast.success('Business settings updated successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Manage your account and business preferences</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full lg:w-auto">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onBusinessSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col items-center sm:items-start gap-4">
                       <Label>Business Logo</Label>
                       <p className="text-sm text-muted-foreground mb-2">
                          Upload your company logo. It will be displayed on invoices and reports.
                       </p>
                       <ImageUpload 
                          value={businessLogo} 
                          onChange={setBusinessLogo}
                          onFileChange={setBusinessLogoFile} 
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Structure</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="llc">LLC</SelectItem>
                              <SelectItem value="corporation">Corporation</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                              <SelectItem value="startup">Startup</SelectItem>
                              <SelectItem value="non_profit">Non-Profit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business URL</FormLabel>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                              https://
                            </span>
                            <FormControl>
                              <Input {...field} className="rounded-l-none" />
                            </FormControl>
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground">
                              .app
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. BR-123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. US-123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Percentage (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="9" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Business St, City, Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="City" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                        <Input placeholder="State" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zip Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Zip Code" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Country" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="LKR">LKR (Rs)</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                             <SelectContent>
                               <SelectItem value="America/New_York">Eastern Time</SelectItem>
                               <SelectItem value="America/Chicago">Central Time</SelectItem>
                               <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                               <SelectItem value="Europe/London">London</SelectItem>
                               <SelectItem value="Asia/Colombo">Colombo</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                             <SelectContent>
                               <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                               <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                               <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>

                 <div className="flex justify-end">
                   <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                   </Button>
                 </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{currentTenant?.subscriptionPlan} Plan</span>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unlimited users • Priority support • Advanced analytics
                    </p>
                  </div>
                </div>
                <Button variant="outline">Manage Plan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {currentUser?.firstName[0]}{currentUser?.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={currentUser?.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={currentUser?.lastName} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={currentUser?.email} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your password regularly</p>
                </div>
                <Button variant="outline">Update</Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <TeamSettingsTab />
        </TabsContent>

        {/* Roles & Permissions - Admin Only */}
        {isAdmin() && (
          <TabsContent value="roles" className="space-y-6">
            <RolesPermissionsTab />
          </TabsContent>
        )}

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Order Notifications</p>
                  <p className="text-sm text-muted-foreground">Get notified when orders are placed</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when inventory is running low</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Payment Notifications</p>
                  <p className="text-sm text-muted-foreground">Notify on payment success or failure</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Weekly Reports</p>
                  <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Updates about new features and tips</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-card border">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                  </div>
                </div>
                <Button variant="outline">Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Download past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">January 2024</p>
                    <p className="text-sm text-muted-foreground">Enterprise Plan</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">$299.00</span>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">December 2023</p>
                    <p className="text-sm text-muted-foreground">Enterprise Plan</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">$299.00</span>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
