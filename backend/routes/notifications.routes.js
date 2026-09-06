import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Fetch user's notifications (org-wide + user-specific)
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', userId)
            .single();

        const orgId = profile?.organization_id;
        if (!orgId) {
            return res.status(403).json({ error: 'No organization found' });
        }

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('organization_id', orgId)
            // Get org-wide (user_id is null) OR specific to this user
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(50); // Get latest 50

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark single notification as read
router.put('/:id/read', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all as read
router.put('/read-all', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', userId)
            .single();

        const orgId = profile?.organization_id;
        if (!orgId) return res.status(403).json({ error: 'No org found' });

        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('organization_id', orgId)
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
