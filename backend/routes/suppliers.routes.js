import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper to get Org ID
const getOrgId = async (userId) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();
    return profile?.organization_id;
};

// GET /api/suppliers - List all suppliers
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: suppliers, error } = await supabaseAdmin
            .from('suppliers')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map snake_case to camelCase
        const mappedSuppliers = suppliers.map(s => ({
            id: s.id,
            companyName: s.company_name,
            contactName: s.contact_name,
            email: s.email,
            phone: s.phone,
            mobile: s.mobile,
            address: s.address,
            city: s.city,
            state: s.state,
            zipCode: s.zip_code,
            country: s.country,
            website: s.website,
            taxId: s.tax_id,
            bankName: s.bank_name,
            bankAccount: s.bank_account,
            paymentTerms: s.payment_terms,
            leadTime: s.lead_time,
            minOrderValue: s.min_order_value,
            rating: s.rating,
            notes: s.notes,
            status: s.status,
            createdAt: s.created_at,
        }));

        res.json(mappedSuppliers);
    } catch (error) {
        console.error('Fetch suppliers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/suppliers - Create new supplier
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const {
            companyName, contactName, email, phone, mobile,
            address, city, state, zipCode, country,
            website, taxId, bankName, bankAccount,
            paymentTerms, leadTime, minOrderValue, rating, notes
        } = req.body;

        const { data: supplier, error } = await supabaseAdmin
            .from('suppliers')
            .insert([{
                organization_id: orgId,
                company_name: companyName,
                contact_name: contactName,
                email,
                phone,
                mobile,
                address,
                city,
                state,
                zip_code: zipCode,
                country,
                website,
                tax_id: taxId,
                bank_name: bankName,
                bank_account: bankAccount,
                payment_terms: paymentTerms,
                lead_time: leadTime || 0,
                min_order_value: minOrderValue || 0,
                rating: rating || 3,
                notes,
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(supplier);

    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const updates = req.body;
        const map = {};

        if (updates.companyName) map.company_name = updates.companyName;
        if (updates.contactName) map.contact_name = updates.contactName;
        if (updates.email) map.email = updates.email;
        if (updates.phone) map.phone = updates.phone;
        if (updates.mobile) map.mobile = updates.mobile;
        if (updates.address) map.address = updates.address;
        if (updates.city) map.city = updates.city;
        if (updates.state) map.state = updates.state;
        if (updates.zipCode) map.zip_code = updates.zipCode;
        if (updates.country) map.country = updates.country;
        if (updates.website) map.website = updates.website;
        if (updates.taxId) map.tax_id = updates.taxId;
        if (updates.bankName) map.bank_name = updates.bankName;
        if (updates.bankAccount) map.bank_account = updates.bankAccount;
        if (updates.paymentTerms) map.payment_terms = updates.paymentTerms;
        if (updates.leadTime !== undefined) map.lead_time = updates.leadTime;
        if (updates.minOrderValue !== undefined) map.min_order_value = updates.minOrderValue;
        if (updates.rating !== undefined) map.rating = updates.rating;
        if (updates.notes) map.notes = updates.notes;
        
        map.updated_at = new Date();

        const { data: updated, error } = await supabaseAdmin
            .from('suppliers')
            .update(map)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);

    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/suppliers/:id/status - Toggle Status
router.patch('/:id/status', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expect 'ACTIVE' or 'INACTIVE'
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: updated, error } = await supabaseAdmin
            .from('suppliers')
            .update({ status, updated_at: new Date() })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);

    } catch (error) {
        console.error('Update supplier status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { error } = await supabaseAdmin
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
