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

// GET / - List all returns
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: returns, error } = await supabaseAdmin
            .from('order_returns')
            .select(`
                *,
                orders (
                    order_number,
                    customers (
                        name,
                        company_name
                    )
                )
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = returns.map(ret => ({
            id: ret.id,
            orderId: ret.order_id,
            returnNumber: ret.return_number,
            reason: ret.reason,
            status: ret.status,
            refundAmount: ret.refund_amount,
            notes: ret.notes,
            createdAt: ret.created_at,
            updatedAt: ret.updated_at,
            orderNumber: ret.orders?.order_number,
            customerName: ret.orders?.customers ? (ret.orders.customers.company_name || ret.orders.customers.name) : 'Unknown'
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Fetch returns error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST / - Create a return request
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { orderId, reason, notes } = req.body;

        // Get the order's total_amount
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('total_amount, status')
            .eq('id', orderId)
            .eq('organization_id', orgId)
            .single();
            
        if (orderError) throw orderError;
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

        const { data: newReturn, error: returnInsertError } = await supabaseAdmin
            .from('order_returns')
            .insert({
                organization_id: orgId,
                order_id: orderId,
                return_number: returnNumber,
                reason,
                status: 'PENDING',
                refund_amount: order.total_amount,
                notes
            })
            .select()
            .single();

        if (returnInsertError) throw returnInsertError;

        // Update order status
        const { error: updateOrderError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'RETURN_REQUESTED' })
            .eq('id', orderId)
            .eq('organization_id', orgId);

        if (updateOrderError) throw updateOrderError;

        res.status(201).json({
            id: newReturn.id,
            orderId: newReturn.order_id,
            returnNumber: newReturn.return_number,
            reason: newReturn.reason,
            status: newReturn.status,
            refundAmount: newReturn.refund_amount,
            notes: newReturn.notes,
            createdAt: newReturn.created_at,
            updatedAt: newReturn.updated_at
        });
    } catch (error) {
        console.error('Create return error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /:id - Update return status
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { status, notes } = req.body;

        const { data: currentReturn, error: fetchError } = await supabaseAdmin
            .from('order_returns')
            .select('order_id, status')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (fetchError) throw fetchError;
        if (!currentReturn) return res.status(404).json({ error: 'Return not found' });

        const { data: updatedReturn, error: updateError } = await supabaseAdmin
            .from('order_returns')
            .update({
                status,
                notes,
                updated_at: new Date()
            })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Handle order status transitions based on return status
        if (status !== currentReturn.status) {
            const orderId = currentReturn.order_id;
            let orderStatusUpdate = null;
            let orderPaymentStatusUpdate = null;

            if (status === 'APPROVED') {
                orderStatusUpdate = 'RETURN_APPROVED';
            } else if (status === 'REJECTED') {
                orderStatusUpdate = 'DELIVERED';
            } else if (status === 'COMPLETED') {
                orderStatusUpdate = 'RETURNED';
                orderPaymentStatusUpdate = 'REFUNDED';
                
                // Restore inventory when COMPLETED (and order status becomes RETURNED)
                const { data: orderWithItems, error: itemsError } = await supabaseAdmin
                    .from('orders')
                    .select('order_items(inventory_item_id, quantity)')
                    .eq('id', orderId)
                    .single();

                if (!itemsError && orderWithItems) {
                    for (const item of orderWithItems.order_items) {
                        const { data: invItem } = await supabaseAdmin
                            .from('products')
                            .select('quantity_on_hand')
                            .eq('id', item.inventory_item_id)
                            .single();
                        
                        if (invItem) {
                             await supabaseAdmin
                                .from('products')
                                .update({ quantity_on_hand: invItem.quantity_on_hand + item.quantity })
                                .eq('id', item.inventory_item_id);
                        }
                    }
                }
            }

            if (orderStatusUpdate) {
                const updatePayload = { status: orderStatusUpdate };
                if (orderPaymentStatusUpdate) {
                    updatePayload.payment_status = orderPaymentStatusUpdate;
                }
                
                await supabaseAdmin
                    .from('orders')
                    .update(updatePayload)
                    .eq('id', orderId)
                    .eq('organization_id', orgId);
            }
        }

        res.json({
            id: updatedReturn.id,
            orderId: updatedReturn.order_id,
            returnNumber: updatedReturn.return_number,
            reason: updatedReturn.reason,
            status: updatedReturn.status,
            refundAmount: updatedReturn.refund_amount,
            notes: updatedReturn.notes,
            createdAt: updatedReturn.created_at,
            updatedAt: updatedReturn.updated_at
        });
    } catch (error) {
        console.error('Update return error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
