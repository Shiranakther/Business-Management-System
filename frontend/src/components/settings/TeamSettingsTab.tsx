import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { Loader2, Plus, Mail, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: { id: string; name: string }[];
}

interface Role {
  id: string;
  name: string;
}

export function TeamSettingsTab() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const { isAdmin } = usePermissions();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            role_id,
            roles (
              id,
              name
            )
          )
        `);

      if (error) throw error;

      const formattedUsers = data.map((user: any) => ({
        ...user,
        roles: user.user_roles.map((ur: any) => ur.roles),
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase.from('roles').select('id, name');
      if (error) throw error;
      setAvailableRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    
    // In a real app, this would use Supabase Auth Admin API (backend) to invite user
    // or send an email. Since we are client-side only for this part (unless we use backend proxy),
    // we can't create users directly without a backend function if signup is restricted.
    // However, if we assume open signup, we can't "invite" easily without edge functions.
    
    // For now, we will simulate an invitation by just showing a success message
    // and ideally, you'd have an Edge Function to handle `supabase.auth.admin.inviteUserByEmail`.
    
    // BUT! The user asked to "make member invitations... make all backend functions".
    // So I should have a backend endpoint for this.
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
            toast.error("You must be logged in to invite users");
            return;
        }

        const response = await fetch('http://localhost:5000/api/users/invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email: inviteEmail, roleId: inviteRole })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to send invite');
        }

        toast.success(`Invitation sent to ${inviteEmail}`);
        setIsInviteDialogOpen(false);
        setInviteEmail('');
        fetchUsers(); // Refresh list (might show the new invited user)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };
  
  const handleRemoveUser = async (userId: string) => {
      // Should call backend to remove user or remove their access
      toast.error("Removing users not yet fully implemented in backend");
  };

  if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to your workspace</CardDescription>
          </div>
          {isAdmin() && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.roles.map(role => (
                    <Badge key={role.id} variant="outline">{role.name}</Badge>
                ))}
                
                {isAdmin() && (
                   <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(user.id)}>
                       <Trash2 className="w-4 h-4 text-destructive" />
                   </Button>
                )}
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                  No team members found.
              </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={isInviting}>
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
