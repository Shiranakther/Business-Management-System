import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { createNotification, checkAndNotifyLowStock } from '../utils/notifications.js';

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

// GET /api/orders - List all orders
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: orders, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    inventory_item_id,
                    quantity,
                    unit_price,
                    total_price,
                    products (name, cost_price)
                ),
                customers (
                    id,
                    name,
                    company_name,
                    email,
                    phone
                ),
                courier_partners (id, name, tracking_url_template)
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map response
        const mappedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            customerId: order.customer_id,
            customerName: order.customers ? (order.customers.company_name || order.customers.name) : 'Unknown',
            customerEmail: order.customers?.email,
            customerPhone: order.customers?.phone,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total_amount,
            status: order.status,
            paymentStatus: order.payment_status,
            paymentMethod: order.payment_method,
            shippingMethod: order.shipping_method,
            shippingAddress: order.shipping_address,
            billingAddress: order.billing_address,
            notes: order.notes,
            orderSource: order.order_source || null,
            courierPartnerId: order.courier_partner_id,
            courierPartnerName: order.courier_partners?.name || null,
            trackingNumber: order.tracking_number || null,
            trackingUrlTemplate: order.courier_partners?.tracking_url_template || null,
            createdAt: order.created_at,
            items: order.order_items.map(item => ({
                id: item.id,
                inventoryItemId: item.inventory_item_id,
                name: item.products?.name || 'Unknown Item',
                quantity: item.quantity,
                unitPrice: item.unit_price,
                costPrice: item.products?.cost_price || 0,
                total: item.total_price
            }))
        }));

        res.json(mappedOrders);
    } catch (error) {
        console.error('Fetch orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/orders - Create new order
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const {
            customerType, // 'existing' or 'manual'
            customerId,
            manualCustomer,
            items,
            shippingAddress,
            billingAddress,
            notes,
            paymentMethod,
            shippingMethod,
            status,
            paymentStatus,
            total,
            tax,
            subtotal,
            courierPartnerId,
            trackingNumber,
            orderSource
        } = req.body;

        let finalCustomerId = customerId;

        // Handle Manual Customer Creation
        if (customerType === 'manual' && manualCustomer) {
            const { data: newCustomer, error: customerError } = await supabaseAdmin
                .from('customers')
                .insert({
                    organization_id: orgId,
                    company_name: null,
                    name: manualCustomer.contactName, // Using contact name as primary name fallback
                    email: manualCustomer.email,
                    phone: manualCustomer.phone,
                    mobile: manualCustomer.phone,
                    customer_type: 'B2C',
                    billing_address_line1: manualCustomer.address,
                    city: manualCustomer.city,
                    status: 'ACTIVE',
                    is_quick_customer: true
                })
                .select()
                .single();
            
            if (customerError) throw customerError;
            finalCustomerId = newCustomer.id;
        }

        // Generate Order Number (Simple logic, could be improved)
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

        // Create Order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                organization_id: orgId,
                order_number: orderNumber,
                customer_id: finalCustomerId,
                subtotal,
                tax,
                total_amount: total,
                status: status || 'PENDING',
                payment_status: paymentStatus || 'PENDING',
                payment_method: paymentMethod,
                shipping_method: shippingMethod,
                shipping_address: shippingAddress,
                billing_address: billingAddress,
                notes,
                order_source: orderSource,
                courier_partner_id: courierPartnerId,
                tracking_number: trackingNumber
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create Order Items
        const orderItemsData = items.map(item => ({
            organization_id: orgId,
            order_id: order.id,
            inventory_item_id: item.inventoryItemId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.quantity * item.unitPrice
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsData);

        if (itemsError) throw itemsError;

        // Update Inventory (Deduct stock)
        for (const item of items) {
            const { data: invItem } = await supabaseAdmin
                .from('products')
                .select('name, quantity_on_hand, reorder_point')
                .eq('id', item.inventoryItemId)
                .single();

            if (invItem) {
                const newQty = invItem.quantity_on_hand - item.quantity;
                let newStatus = 'IN_STOCK';
                if (newQty <= 0) newStatus = 'OUT_OF_STOCK';
                else if (newQty <= (invItem.reorder_point || 0)) newStatus = 'LOW_STOCK';

                await supabaseAdmin
                    .from('products')
                    .update({ 
                        quantity_on_hand: newQty,
                        status: newStatus,
                        updated_at: new Date()
                    })
                    .eq('id', item.inventoryItemId);
                
                // Track inventory transaction
                await supabaseAdmin
                    .from('inventory_transactions')
                    .insert({
                        organization_id: orgId,
                        item_id: item.inventoryItemId,
                        product_id: item.inventoryItemId,
                        transaction_type: 'OUT',
                        quantity: item.quantity,
                        reference_type: 'ORDER',
                        reference_id: order.id,
                        notes: `Order ${orderNumber}`
                    });

                // Trigger Low Stock / Out of Stock notification if needed
                try {
                    await checkAndNotifyLowStock(orgId, {
                        id: item.inventoryItemId,
                        name: invItem.name,
                        quantity_on_hand: newQty,
                        reorder_point: invItem.reorder_point
                    });
                } catch (stockNotifErr) {
                    console.error('Low stock notification error:', stockNotifErr);
                }
            }
        }

        // Emit Notification
        try {
            await createNotification(
                orgId, 
                null, 
                'New Order Placed', 
                `Order ${orderNumber} for $${total} has been created.`, 
                'SUCCESS', 
                '/orders'
            );
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        res.status(201).json(order);

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/orders/:id
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);

        // Fetch order items to restore inventory
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                order_items (
                    inventory_item_id,
                    quantity
                )
            `)
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (fetchError) throw fetchError;

        // Prevent deletes if the order is already part of an approved return process
        if (order.status === 'RETURN_APPROVED' || order.status === 'RETURNED') {
            return res.status(400).json({ error: 'Cannot delete an order that has an approved return' });
        }

        // Restore Inventory (Add stock back)
        if (order && order.status !== 'CANCELLED') { // Only restore if not already cancelled (because cancelled orders already restored stock)
             for (const item of order.order_items) {
                const { data: invItem } = await supabaseAdmin
                    .from('products')
                    .select('quantity_on_hand')
                    .eq('id', item.inventory_item_id)
                    .single();

                if (invItem) {
                    const newQty = invItem.quantity_on_hand + item.quantity;
                    await supabaseAdmin
                        .from('products')
                        .update({ quantity_on_hand: newQty })
                        .eq('id', item.inventory_item_id);
                }
            }
        }

        // Delete order
        const { error } = await supabaseAdmin
            .from('orders')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/orders/:id - Update order status
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        const updates = req.body;

        // Fetch current order to check status and handle inventory
        const { data: currentOrder } = await supabaseAdmin
            .from('orders')
            .select('status, order_items(inventory_item_id, quantity)')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Prevent updates if the order is already part of an approved return process
        if (currentOrder.status === 'RETURN_APPROVED' || currentOrder.status === 'RETURNED') {
            return res.status(400).json({ error: 'Cannot update an order that has an approved return' });
        }

        // Check for status change to handle inventory
        if (updates.status) {
            if (currentOrder) {
                const cancelling = (currentOrder.status !== 'CANCELLED' && updates.status === 'CANCELLED');
                const returning = (currentOrder.status !== 'RETURNED' && updates.status === 'RETURNED');
                const unCancelling = (currentOrder.status === 'CANCELLED' && updates.status !== 'CANCELLED');
                const unReturning = (currentOrder.status === 'RETURNED' && updates.status !== 'RETURNED');

                // Restore Stock (Cancelling or Returning)
                if (cancelling || returning) {
                    for (const item of currentOrder.order_items) {
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
                // Deduct Stock (Re-opening a cancelled/returned order)
                else if (unCancelling || unReturning) {
                     for (const item of currentOrder.order_items) {
                        const { data: invItem } = await supabaseAdmin
                            .from('products')
                            .select('quantity_on_hand')
                            .eq('id', item.inventory_item_id)
                            .single();
                        
                        if (invItem) {
                             await supabaseAdmin
                                .from('products')
                                .update({ quantity_on_hand: invItem.quantity_on_hand - item.quantity })
                                .eq('id', item.inventory_item_id);
                        }
                    }
                }
            }
        }

        const updatePayload = {
            status: updates.status,
            payment_status: updates.paymentStatus,
            updated_at: new Date()
        };

        if (updates.courierPartnerId !== undefined) {
            updatePayload.courier_partner_id = updates.courierPartnerId;
        }
        if (updates.trackingNumber !== undefined) {
            updatePayload.tracking_number = updates.trackingNumber;
        }

        const { data: updated, error } = await supabaseAdmin
            .from('orders')
            .update(updatePayload)
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

export default router;
