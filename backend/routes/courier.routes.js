import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getOrgId = async (userId) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();
    return profile?.organization_id;
};

// GET / - List all courier partners for the org
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: couriers, error } = await supabaseAdmin
            .from('courier_partners')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = couriers.map(c => ({
            id: c.id,
            name: c.name,
            contactNumber: c.contact_number,
            email: c.email,
            trackingUrlTemplate: c.tracking_url_template,
            isActive: c.is_active,
            createdAt: c.created_at,
            updatedAt: c.updated_at
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Fetch couriers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST / - Create a new courier partner
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { name, contactNumber, email, trackingUrlTemplate } = req.body;

        const { data: newCourier, error } = await supabaseAdmin
            .from('courier_partners')
            .insert({
                organization_id: orgId,
                name,
                contact_number: contactNumber,
                email,
                tracking_url_template: trackingUrlTemplate,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            id: newCourier.id,
            name: newCourier.name,
            contactNumber: newCourier.contact_number,
            email: newCourier.email,
            trackingUrlTemplate: newCourier.tracking_url_template,
            isActive: newCourier.is_active,
            createdAt: newCourier.created_at,
            updatedAt: newCourier.updated_at
        });
    } catch (error) {
        console.error('Create courier error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /:id - Update a courier partner
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { name, contactNumber, email, trackingUrlTemplate, isActive } = req.body;

        const { data: updatedCourier, error } = await supabaseAdmin
            .from('courier_partners')
            .update({
                name,
                contact_number: contactNumber,
                email,
                tracking_url_template: trackingUrlTemplate,
                is_active: isActive,
                updated_at: new Date()
            })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: updatedCourier.id,
            name: updatedCourier.name,
            contactNumber: updatedCourier.contact_number,
            email: updatedCourier.email,
            trackingUrlTemplate: updatedCourier.tracking_url_template,
            isActive: updatedCourier.is_active,
            createdAt: updatedCourier.created_at,
            updatedAt: updatedCourier.updated_at
        });
    } catch (error) {
        console.error('Update courier error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /:id - Soft delete
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { error } = await supabaseAdmin
            .from('courier_partners')
            .update({
                is_active: false,
                updated_at: new Date()
            })
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        res.json({ message: 'Courier partner deleted successfully' });
    } catch (error) {
        console.error('Delete courier error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
