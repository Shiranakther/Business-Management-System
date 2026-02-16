import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Package, 
  Users, 
  Truck, 
  DollarSign, 
  UserCog,
  TrendingUp,
  ClipboardList,
  FileText,
  Settings,
  RotateCcw,
  Check,
  X,
  Loader2
} from 'lucide-react';
import type { PermissionModule, PermissionAction, Role } from '@/types/permissions';
import { defaultModulePermissions } from '@/types/permissions';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { usePermissionsStore } from '@/stores/permissionsStore';

const moduleConfig: { module: PermissionModule; label: string; icon: React.ElementType }[] = [
  { module: 'inventory', label: 'Inventory', icon: Package },
  { module: 'customers', label: 'Customers', icon: Users },
  { module: 'suppliers', label: 'Suppliers', icon: Truck },
  { module: 'finance', label: 'Finance', icon: DollarSign },
  { module: 'hr', label: 'HR', icon: UserCog },
  { module: 'sales', label: 'Sales', icon: TrendingUp },
  { module: 'orders', label: 'Orders', icon: ClipboardList },
  { module: 'reports', label: 'Reports', icon: FileText },
  { module: 'settings', label: 'Settings', icon: Settings },
];

const actionLabels: Record<PermissionAction, string> = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
};

export function RolesPermissionsTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  
  const { setCurrentUserRole, currentUserRoleId } = usePermissionsStore();

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  useEffect(() => {
      fetchRoles();
  }, []);

    const fetchRoles = async () => {
        try {
            // Fetch roles from backend
             const { data: { session } } = await supabase.auth.getSession();
             const token = session?.access_token;
             if (!token) return;

             const response = await fetch('http://localhost:5000/api/roles', {
                 headers: {
                     'Authorization': `Bearer ${token}`
                 }
             });

            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            
            // Transform data if needed, or ensure it matches Role type
            const formattedRoles: Role[] = data.map((r: any) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                isSystem: r.is_system,
                permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
            }));
            
            setRoles(formattedRoles);
            
            if (formattedRoles.length > 0 && !selectedRoleId) {
                // If there's an 'admin' role, select it by default, otherwise first one
                const adminRole = formattedRoles.find(r => r.name === 'Admin');
                setSelectedRoleId(adminRole ? adminRole.id : formattedRoles[0].id);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('Failed to load roles');
        } finally {
            setIsLoading(false);
        }
    };

  const handlePermissionChange = async (
    module: PermissionModule, 
    action: PermissionAction, 
    value: boolean
  ) => {
    if (!selectedRole) return;
    
    // Prevent modifying admin role core permissions
    if (selectedRole.isSystem && selectedRole.name === 'Admin' && module === 'settings') {
      toast.error('Cannot modify admin settings permissions');
      return;
    }
    
    const updatedPermissions = {
        ...selectedRole.permissions,
        [module]: {
            ...selectedRole.permissions[module],
            [action]: value
        }
    };
    
    // Update local state first for responsiveness
    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPermissions } : r));

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`http://localhost:5000/api/roles/${selectedRole.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                permissions: updatedPermissions
            })
        });

        if (!response.ok) throw new Error('Failed to update permission');
        toast.success(`Updated ${module} ${action} permission`);
    } catch (error) {
        toast.error('Failed to save permission change');
        fetchRoles(); // Revert
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    
    const newPermissions = {
        inventory: { ...defaultModulePermissions },
        customers: { ...defaultModulePermissions },
        suppliers: { ...defaultModulePermissions },
        finance: { ...defaultModulePermissions },
        hr: { ...defaultModulePermissions },
        sales: { ...defaultModulePermissions },
        orders: { ...defaultModulePermissions },
        reports: { ...defaultModulePermissions },
        settings: { ...defaultModulePermissions },
    };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const response = await fetch('http://localhost:5000/api/roles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newRoleName,
                description: newRoleDescription,
                is_system: false,
                permissions: newPermissions
            })
        });

        if (!response.ok) throw new Error('Failed to create role');
        
        toast.success(`Role "${newRoleName}" created`);
        setNewRoleName('');
        setNewRoleDescription('');
        setIsAddDialogOpen(false);
        fetchRoles();
    } catch (error) {
        toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete role "${role?.name}"?`)) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`http://localhost:5000/api/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete role');
        
        toast.success('Role deleted');
        if (selectedRoleId === roleId) {
            setSelectedRoleId(roles[0]?.id || '');
        }
        fetchRoles();
    } catch (error) {
        toast.error('Failed to delete role');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !newRoleName.trim()) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`http://localhost:5000/api/roles/${selectedRole.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newRoleName,
                description: newRoleDescription
            })
        });

        if (!response.ok) throw new Error('Failed to update role');
        
        toast.success('Role updated');
        setIsEditDialogOpen(false);
        fetchRoles();
    } catch (error) {
         toast.error('Failed to update role');
    }
  };

  const openEditDialog = () => {
    if (selectedRole) {
      setNewRoleName(selectedRole.name);
      setNewRoleDescription(selectedRole.description);
      setIsEditDialogOpen(true);
    }
  };

  const handleSwitchRole = (roleId: string) => {
    setCurrentUserRole(roleId); // This updates the local "demo" state in usePermissionsStore
    toast.success(`Switched to ${roles.find(r => r.id === roleId)?.name} role`);
  };

  if (isLoading) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Role Switcher - For Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Current User Role (Demo)
          </CardTitle>
          <CardDescription>
            Switch roles to test different permission levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={currentUserRoleId} onValueChange={handleSwitchRole}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {roles.find(r => r.id === currentUserRoleId)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Manage roles and their access permissions for each module
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Selector */}
          <div className="flex items-center gap-4">
            <Label>Select Role to Edit:</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedRole && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={openEditDialog}>
                  <Edit className="w-4 h-4" />
                </Button>
                {!selectedRole.isSystem && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRole(selectedRoleId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {selectedRole && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
            </div>
          )}

          {/* Permissions Grid */}
          {selectedRole && (
            <Accordion type="multiple" className="w-full" defaultValue={['inventory', 'customers']}>
              {moduleConfig.map(({ module, label, icon: Icon }) => {
                const perms = selectedRole.permissions[module];
                // Safety check if perms is missing (e.g. new module added later)
                if (!perms) return null;
                
                const allEnabled = perms.create && perms.read && perms.update && perms.delete;
                const noneEnabled = !perms.create && !perms.read && !perms.update && !perms.delete;
                
                return (
                  <AccordionItem key={module} value={module}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{label}</span>
                        <div className="flex gap-1 ml-auto mr-4">
                          {allEnabled ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              Full Access
                            </Badge>
                          ) : noneEnabled ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Access
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              Limited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
                        {(Object.keys(actionLabels) as PermissionAction[]).map((action) => (
                          <div 
                            key={action} 
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {perms[action] ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Label htmlFor={`${module}-${action}`} className="cursor-pointer">
                                {actionLabels[action]}
                              </Label>
                            </div>
                            <Switch
                              id={`${module}-${action}`}
                              checked={perms[action]}
                              onCheckedChange={(value) => 
                                handlePermissionChange(module, action, value)
                              }
                              disabled={
                                selectedRole.isSystem && selectedRole.name === 'Admin' && module === 'settings'
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a custom role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Warehouse Staff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Describe what this role can do..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRoleDescription">Description</Label>
              <Textarea
                id="editRoleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
