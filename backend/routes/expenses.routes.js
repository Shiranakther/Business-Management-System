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

// GET /api/expenses - List all expenses
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: expenses, error } = await supabaseAdmin
            .from('expenses')
            .select(`
                *,
                suppliers (company_name)
            `)
            .eq('organization_id', orgId)
            .order('incurred_date', { ascending: false });

        if (error) throw error;

        // Map response
        const mappedExpenses = expenses.map(expense => ({
            id: expense.id,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            incurredDate: expense.incurred_date,
            supplierId: expense.supplier_id,
            supplierName: expense.suppliers?.company_name,
            receiptUrl: expense.receipt_url,
            status: expense.status,
            createdAt: expense.created_at
        }));

        res.json(mappedExpenses);
    } catch (error) {
        console.error('Fetch expenses error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/expenses - Create new expense
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const {
            category,
            description,
            amount,
            incurredDate,
            supplierId,
            receiptUrl,
            status
        } = req.body;

        const { data: expense, error } = await supabaseAdmin
            .from('expenses')
            .insert({
                organization_id: orgId,
                category,
                description,
                amount,
                incurred_date: incurredDate,
                supplier_id: supplierId,
                receipt_url: receiptUrl,
                status: status || 'PENDING_APPROVAL'
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        const updates = req.body; // Expects camelCaso keys, need to map to snake_case if we map manually, or just pass what we need

        // Explicit mapping to be safe
        const dbUpdates = {};
        if (updates.category) dbUpdates.category = updates.category;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.amount) dbUpdates.amount = updates.amount;
        if (updates.incurredDate) dbUpdates.incurred_date = updates.incurredDate;
        if (updates.supplierId) dbUpdates.supplier_id = updates.supplierId;
        if (updates.receiptUrl) dbUpdates.receipt_url = updates.receiptUrl;
        if (updates.status) dbUpdates.status = updates.status;

        const { data: updated, error } = await supabaseAdmin
            .from('expenses')
            .update(dbUpdates)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        
        const { error } = await supabaseAdmin
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
