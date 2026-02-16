import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from 'date-fns';

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

// --- SALES REPORTS ---
router.get('/sales', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { from, to, customers, orderStatus, paymentStatus, salesChannel, categories, minValue, maxValue } = req.query;
        let query = supabaseAdmin
            .from('orders')
            .select(`
                id,
                order_number,
                total_amount,
                status,
                payment_status,
                payment_method,
                created_at,
                customer_id,
                customers ( name, company_name ),
                order_items (
                    quantity,
                    unit_price,
                    inventory_item_id,
                    products ( name, category )
                )
            `)
            .eq('organization_id', orgId);

        // Apply Filters
        if (from) query = query.gte('created_at', startOfDay(new Date(from)).toISOString());
        if (to) query = query.lte('created_at', endOfDay(new Date(to)).toISOString());
        if (minValue) query = query.gte('total_amount', minValue);
        if (maxValue) query = query.lte('total_amount', maxValue);
        
        // Handle array filters (support both 'val1,val2' string and array formats)
        const parseArray = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return val;
            return val.split(',');
        };

        const customerIds = parseArray(customers);
        const orderStatuses = parseArray(orderStatus);
        const paymentStatuses = parseArray(paymentStatus);
        const channels = parseArray(salesChannel);
        const categoryList = parseArray(categories);

        if (customerIds && customerIds.length > 0) query = query.in('customer_id', customerIds);
        if (orderStatuses && orderStatuses.length > 0) query = query.in('status', orderStatuses);
        if (paymentStatuses && paymentStatuses.length > 0) query = query.in('payment_status', paymentStatuses);
        
        if (channels && channels.length > 0) {
            // salesChannel logic skipped as per previous thought: no column available
        } else {
             if (!orderStatuses || !orderStatuses.includes('CANCELLED')) {
                 query = query.neq('status', 'CANCELLED');
             }
        }

        let { data: orders, error } = await query;
        if (error) throw error;

        // Filter by Category in JS (since it's a nested relation property)
        if (categoryList && categoryList.length > 0) {
             orders = orders.filter(order => 
                order.order_items.some(item => 
                    item.products?.category && categoryList.includes(item.products.category)
                )
            );
        }

        // Metrics Calculation
        const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Sales Over Time (Group by day)
        const salesOverTime = {};
        orders.forEach(o => {
            const date = format(new Date(o.created_at), 'yyyy-MM-dd');
            salesOverTime[date] = (salesOverTime[date] || 0) + o.total_amount;
        });

        // Top Selling Products
        const productSales = {};
        orders.forEach(o => {
            o.order_items.forEach(item => {
                const productName = item.products?.name || 'Unknown';
                productSales[productName] = (productSales[productName] || 0) + (item.quantity * item.unit_price);
            });
        });
        const topProducts = Object.entries(productSales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        res.json({
            summary: {
                totalRevenue,
                totalOrders,
                averageOrderValue
            },
            charts: {
                salesOverTime: Object.entries(salesOverTime).map(([date, amount]) => ({ date, amount })),
                topProducts
            },
            details: orders.map(o => ({
                orderNumber: o.order_number || o.id.slice(0, 8),
                customer: o.customers?.company_name || o.customers?.name || 'Guest',
                date: format(new Date(o.created_at), 'yyyy-MM-dd'),
                amount: o.total_amount,
                status: o.status
            }))
        });

    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- INVENTORY REPORTS ---
router.get('/inventory', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('organization_id', orgId);

        if (error) throw error;

        const totalItems = products.length;
        const totalStockValue = products.reduce((sum, p) => sum + (p.quantity_on_hand * p.cost_price || 0), 0);
        const lowStockItems = products.filter(p => p.status === 'LOW_STOCK').length;
        const outOfStockItems = products.filter(p => p.status === 'OUT_OF_STOCK').length;

        // Category Distribution
        const categoryCount = {};
        const categoryValue = {};
        products.forEach(p => {
            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
            categoryValue[p.category] = (categoryValue[p.category] || 0) + (p.quantity_on_hand * p.cost_price || 0);
        });

        res.json({
            summary: {
                totalItems,
                totalStockValue,
                lowStockItems,
                outOfStockItems
            },
            charts: {
                byCategory: Object.entries(categoryCount).map(([name, value]) => ({ name, value })),
                valueByCategory: Object.entries(categoryValue).map(([name, value]) => ({ name, value }))
            }
        });

    } catch (error) {
        console.error('Inventory report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- EXPENSE REPORTS ---
router.get('/expenses', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { from, to } = req.query;
        let query = supabaseAdmin
            .from('expenses')
            .select('*')
            .eq('organization_id', orgId)
            .neq('status', 'REJECTED');

        if (from) query = query.gte('incurred_date', startOfDay(new Date(from)).toISOString());
        if (to) query = query.lte('incurred_date', endOfDay(new Date(to)).toISOString());

        const { data: expenses, error } = await query;
        if (error) throw error;

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        // By Category
        const byCategory = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });

        // Expenses Over Time
        const expensesOverTime = {};
        expenses.forEach(e => {
            const date = format(new Date(e.incurred_date), 'yyyy-MM-dd');
            expensesOverTime[date] = (expensesOverTime[date] || 0) + e.amount;
        });

        res.json({
            summary: {
                totalExpenses,
                count: expenses.length
            },
            charts: {
                byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
                expensesOverTime: Object.entries(expensesOverTime).map(([date, amount]) => ({ date, amount }))
            }
        });

    } catch (error) {
        console.error('Expense report error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
