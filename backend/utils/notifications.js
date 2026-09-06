import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { emitNotification } from './socket.js';

dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Create a new notification and emit it via Socket.io
 * 
 * @param {string} orgId 
 * @param {string|null} userId 
 * @param {string} title 
 * @param {string} message 
 * @param {string} type - 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
 * @param {string|null} link 
 */
export const createNotification = async (orgId, userId, title, message, type = 'INFO', link = null) => {
    try {
        const payload = {
            organization_id: orgId,
            user_id: userId,
            title,
            message,
            type,
            link
        };

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Failed to insert notification into DB:', error);
            return null;
        }

        // Emit real-time update
        emitNotification(data);

        return data;
    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
};

/**
 * Check a single product and create a notification if it is low on stock or out of stock
 */
export const checkAndNotifyLowStock = async (orgId, product) => {
    try {
        if (!product || product.reorder_point === null || product.reorder_point === undefined) return null;
        
        const qty = Number(product.quantity_on_hand ?? 0);
        const reorder = Number(product.reorder_point ?? 0);

        if (qty <= reorder) {
            const isOutOfStock = qty <= 0;
            const title = isOutOfStock ? 'Out of Stock Alert' : 'Low Stock Alert';
            const message = isOutOfStock
                ? `Product "${product.name}" is completely out of stock!`
                : `Product "${product.name}" is running low (${qty} remaining, reorder point: ${reorder}).`;

            // Check for existing unread notification for this product
            const { data: existing } = await supabaseAdmin
                .from('notifications')
                .select('id')
                .eq('organization_id', orgId)
                .eq('title', title)
                .ilike('message', `%${product.name}%`)
                .eq('is_read', false)
                .limit(1);

            if (!existing || existing.length === 0) {
                return await createNotification(
                    orgId,
                    null,
                    title,
                    message,
                    isOutOfStock ? 'ERROR' : 'WARNING',
                    '/inventory'
                );
            }
        }
        return null;
    } catch (err) {
        console.error('Error checking low stock notification:', err);
        return null;
    }
};

/**
 * Scan all products for an organization and create notifications for any low or out-of-stock items
 */
export const syncLowStockNotifications = async (orgId) => {
    try {
        if (!orgId) return;
        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('id, name, quantity_on_hand, reorder_point')
            .eq('organization_id', orgId);

        if (error || !products) return;

        for (const product of products) {
            if (product.reorder_point !== null && product.reorder_point !== undefined) {
                const qty = Number(product.quantity_on_hand ?? 0);
                const reorder = Number(product.reorder_point ?? 0);
                if (qty <= reorder) {
                    await checkAndNotifyLowStock(orgId, product);
                }
            }
        }
    } catch (err) {
        console.error('Error syncing low stock notifications:', err);
    }
};

