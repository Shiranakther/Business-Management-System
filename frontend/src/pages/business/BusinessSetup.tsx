
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Globe, MapPin, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/appStore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

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
});

export default function BusinessSetup() {
  const navigate = useNavigate();
  const { setCurrentTenant } = useAppStore();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema) as any,
    defaultValues: {
      name: '',
      type: '',
      slug: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      registrationNumber: '',
      taxId: '',
      currency: 'USD',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
    },
  });

  const onSubmit = async (values: z.infer<typeof businessSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('No authentication token found');

      // Create FormData
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
          if (value) formData.append(key, value);
      });
      
      if (logoFile) {
          formData.append('logo', logoFile);
      }

      const response = await fetch('http://localhost:5000/api/business/setup', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`
          },
          body: formData
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to setup business');
      }

      const data = await response.json();
      
      // Update store
      // We need to match Tenant interface
      if (data.organization) {
          setCurrentTenant({
              id: data.organization.id,
              name: data.organization.name,
              slug: data.organization.slug,
              status: 'ACTIVE' as 'ACTIVE',
              subscriptionPlan: 'ENTERPRISE' as 'ENTERPRISE',
              type: data.organization.type,
              address: data.organization.address,
              city: data.organization.city,
              state: data.organization.state,
              zipCode: data.organization.zip_code,
              country: data.organization.country,
              registrationNumber: data.organization.registration_number,
              taxId: data.organization.tax_id,
              settings: {
                  logoUrl: data.organization.logo_url,
                  currency: data.organization.currency,
                  timezone: data.organization.timezone,
                  dateFormat: data.organization.date_format
              }
          });
      }

      toast.success('Business profile created successfully!');
      navigate('/'); // Go to dashboard
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLogoFile(e.target.files[0]);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader className="text-center border-b bg-card">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Setup Your Business</CardTitle>
                <CardDescription>
                    Tell us about your organization to get started. 
                    This information will appear on your invoices and reports.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" /> 
                                Business Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Acme Corp" {...field} />
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
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select business type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                                                    <SelectItem value="partnership">Partnership</SelectItem>
                                                    <SelectItem value="llc">LLC</SelectItem>
                                                    <SelectItem value="corporation">Corporation</SelectItem>
                                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                                    <SelectItem value="startup">Startup</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Business Logo</Label>
                                <div className="flex items-center gap-4">
                                    <div className="border-2 border-dashed border-input rounded-lg p-4 hover:bg-muted/50 transition-colors w-full cursor-pointer relative">
                                        <Input 
                                            type="file" 
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleLogoChange}
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            {logoFile ? (
                                                <>
                                                    <span className="text-primary font-medium">{logoFile.name}</span>
                                                    <span className="text-xs">{(logoFile.size / 1024).toFixed(1)} KB</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 opacity-50" />
                                                    <span className="text-sm">Click to upload logo</span>
                                                    <span className="text-xs">JPG, PNG up to 2MB</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Location */}
                        <div className="space-y-4">
                             <h3 className="text-lg font-medium flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" /> 
                                Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Street Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123 Main St" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="New York" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>State</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="NY" {...field} />
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
                                                    <Input placeholder="10001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input placeholder="United States" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />
                        
                        {/* Settings */}
                         <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" /> 
                                Regional Settings
                            </h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Workspace URL</FormLabel>
                                            <div className="flex">
                                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground">
                                                    app.com/
                                                </span>
                                                <FormControl>
                                                    <Input {...field} className="rounded-l-none" placeholder="slug" />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select currency" />
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
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select timezone" />
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
                             </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            {/* <Button variant="outline" type="button" onClick={() => navigate('/')}>Skip (Dev Only)</Button> */}
                            <Button type="submit" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating Service...' : 'Create Business Profile'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
