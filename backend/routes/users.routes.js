import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser, requireAdmin } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get all users with their roles
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // Join profiles with roles
    // Supabase JS doesn't do deep joins easily for M:N without view or complex query, 
    // but here we can select from user_roles and map, or fetch profiles and enrich.
    // Let's fetch profiles and separate query for roles or use helper.
    
    // Better: Select profiles and fetch their roles.
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*');
    
    if (pError) throw pError;

    const { data: userRoles, error: rError } = await supabase
      .from('user_roles')
      .select('user_id, role_id, roles(name)'); // Join to get role name

    if (rError) throw rError;

    // Merge
    const usersWithRoles = profiles.map(profile => {
      const roles = userRoles
        .filter(ur => ur.user_id === profile.id)
        .map(ur => ({ 
            id: ur.role_id, 
            name: ur.roles?.name 
        }));
      return { ...profile, roles };
    });

    res.json(usersWithRoles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign role to user
router.post('/:userId/roles', authenticateUser, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { roleId } = req.body;

  try {
    // Check if assignment exists
    const { data: existing } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();
    
    if (existing) {
        return res.json(existing);
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove role from user
router.delete('/:userId/roles/:roleId', authenticateUser, requireAdmin, async (req, res) => {
    const { userId, roleId } = req.params;
    try {
        const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role_id', roleId);
        
        if (error) throw error;
        res.json({ message: 'Role removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Invite user
router.post('/invite', authenticateUser, requireAdmin, async (req, res) => {
  const { email, roleId } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // We need a Supabase client with SERVICE ROLE key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('Server misconfiguration: Missing Service Role Key');
    }
    
    // Create admin client
    const supabaseAdmin = createClient(process.env.SUPABASE_URL, serviceRoleKey);

    // Invite user via email
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) throw inviteError;
    
    // If successful, and we have a roleId, we should assign the role
    // The user might not exist in public.profiles yet until they accept and sign in? 
    // Actually, Supabase might create the user in auth.users immediately.
    // Our trigger 'on_auth_user_created' might run? 
    // The trigger runs on INSERT. updateUserByEmail might not trigger it if it only creates an invite.
    // inviteUserByEmail DOES create a user in auth.users with 'invited' state.
    
    const userId = userData.user.id;

    // Ensure profile exists (in case trigger failed or needed)
    // We can manually insert role into user_roles
    if (roleId) {
        // We might need to wait for trigger to create profile, or insert it ourselves if it doesn't exist
        // Let's try inserting role. If foreign key fails (profile not found), we know trigger delayed.
        
        // Wait a brief moment or retry?
        // Better: Insert role. 
        
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role_id: roleId });
            
        if (roleError) console.error("Error assigning role to invited user:", roleError);
    }

    res.json({ message: 'Invitation sent', user: userData.user });
  } catch (error) {
    console.error("Invite error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Revoke access)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Delete from Supabase Auth (Effective ban/remove)
    // We need the admin client (which we have as 'supabase')
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) throw authError;

    // 2. Delete from public.profiles (Cascade should handle user_roles)
    // Actually, if we delete from Auth, the 'profiles' table might need manual deletion 
    // depending on FK constraint 'on delete cascade' from auth.users.
    // Usually profiles.id references auth.users.id with ON DELETE CASCADE.
    // Let's verify or ensure we clean up.
    
    const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

    if (profileError) console.warn("Profile delete error (might be already deleted by cascade):", profileError);

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
