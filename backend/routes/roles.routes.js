import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser, requireAdmin } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get all roles
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create role
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  const { name, description, permissions } = req.body;
  try {
    // Generate an ID from name (slugified) if not provided, or let user provide
    // For consistency with seed, we might want to slugify the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const { data, error } = await supabase
      .from('roles')
      .insert([{ id, name, description, permissions }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update role
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;
  
  try {
     // Check if system role
    const { data: roleCheck } = await supabase.from('roles').select('is_system').eq('id', id).single();
    if (roleCheck?.is_system && (name || description)) {
        // Allow updating permissions? The frontend says "cannot delete system roles", maybe "cannot modify core permissions".
        // Let's allow updating description/permissions.
    }

    const { data, error } = await supabase
      .from('roles')
      .update({ name, description, permissions, updated_at: new Date() })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete role
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: roleCheck } = await supabase.from('roles').select('is_system').eq('id', id).single();
    if (roleCheck?.is_system) {
        return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
