
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

// Helper: Get start/end dates for comparison
const getPeriodDates = (from, to) => {
    const currentEnd = to ? new Date(to) : new Date();
    const currentStart = from ? new Date(from) : new Date(new Date().setDate(currentEnd.getDate() - 30));
    
    const duration = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime()); // Previous period ends where current starts (roughly)
    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
        current: { start: currentStart.toISOString(), end: currentEnd.toISOString() },
        previous: { start: previousStart.toISOString(), end: previousEnd.toISOString() }
    };
};

const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

const calculateForecast = (orders, periodEndDate) => {
    // Simple forecast: Average Daily Sell * 30 days
    // 1. Group by day
    if (!orders || orders.length === 0) return 0;
    
    // Sort orders
    const sorted = [...orders].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    const firstDate = new Date(sorted[0].created_at);
    const lastDate = periodEndDate ? new Date(periodEndDate) : new Date();
    
    const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === 'PAID' ? o.total_amount : 0), 0);
    const dailyAverage = totalRevenue / daysDiff;
    
    // Forecast next periods
    return {
        nextDay: Math.round(dailyAverage * 1),
        nextWeek: Math.round(dailyAverage * 7),
        nextMonth: Math.round(dailyAverage * 30)
    };
};

// GET /api/sales/metrics - Get Sales Trends & Metrics
router.get('/metrics', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { from, to } = req.query;
        const { current, previous } = getPeriodDates(from, to);

        // Fetch Orders for Current Period
        const { data: currentOrders, error: currentError } = await supabaseAdmin
            .from('orders')
            .select('id, total_amount, payment_status, created_at, customer_id, order_items(quantity)')
            .eq('organization_id', orgId)
            .gte('created_at', current.start)
            .lte('created_at', current.end);

        if (currentError) throw currentError;

        // Fetch Orders for Previous Period
        const { data: previousOrders, error: prevError } = await supabaseAdmin
            .from('orders')
            .select('id, total_amount, payment_status, created_at, customer_id')
            .eq('organization_id', orgId)
            .gte('created_at', previous.start)
            .lte('created_at', previous.end);

        if (prevError) throw prevError;

        // --- Calculate Metrics ---

        // Helper to sum totals
        const sumTotal = (orders) => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const countOrders = (orders) => orders.length;
        const countPaid = (orders) => orders.filter(o => o.payment_status === 'PAID').length;

        // 1. Total Revenue (Paid + Pending generally usually Counted as Sales, strictly Paid is Cash Flow. Let's use Total of all non-cancelled/refunded for "Sales")
        // Filtering out REFUNDED or CANCELLED if you have that status. Assuming 'REFUNDED' is a payment_status.
        // Let's filter for Revenue = Paid Orders Only for strict accounting, or All NON-REFUNDED for Booked Revenue.
        // The frontend used: paidOrders.reduce...
        const currentPaid = currentOrders.filter(o => o.payment_status === 'PAID');
        const previousPaid = previousOrders.filter(o => o.payment_status === 'PAID');

        const currentRevenue = currentPaid.reduce((sum, o) => sum + o.total_amount, 0);
        const previousRevenue = previousPaid.reduce((sum, o) => sum + o.total_amount, 0);

        // 2. Orders Count (All valid orders)
        const currentTotalOrders = currentOrders.length;
        const previousTotalOrders = previousOrders.length;

        // 3. Average Order Value
        const currentAOV = currentPaid.length > 0 ? currentRevenue / currentPaid.length : 0;
        const previousAOV = previousPaid.length > 0 ? previousRevenue / previousPaid.length : 0;

        // 4. Conversion Rate (This usually requires "Sessions" which we don't have. Frontend calculated it as Paid / Total. Let's stick to that.)
        const currentConversion = currentTotalOrders > 0 ? (currentPaid.length / currentTotalOrders) * 100 : 0;
        const previousConversion = previousTotalOrders > 0 ? (previousPaid.length / previousTotalOrders) * 100 : 0;

        // 5. Refunds
        const currentRefunded = currentOrders.filter(o => o.payment_status === 'REFUNDED');
        const currentRefundAmount = currentRefunded.reduce((sum, o) => sum + o.total_amount, 0);
        const currentRefundRate = currentTotalOrders > 0 ? (currentRefunded.length / currentTotalOrders) * 100 : 0;

        // 6. Pending Revenue
        const currentPending = currentOrders.filter(o => o.payment_status === 'PENDING');
        const currentPendingRevenue = currentPending.reduce((sum, o) => sum + o.total_amount, 0);

        // 7. Avg Items Per Order
        // Note: 'order_items' might be null if not joined properly or empty. 
        // We selected 'order_items(quantity)'.
        let currentTotalItems = 0;
        currentOrders.forEach(o => {
            if (o.order_items) {
                o.order_items.forEach(i => currentTotalItems += i.quantity);
            }
        });
        const currentAvgItems = currentTotalOrders > 0 ? currentTotalItems / currentTotalOrders : 0;

        // 8. Customers
        const currentUniqueCustomers = new Set(currentOrders.map(o => o.customer_id)).size;
        const previousUniqueCustomers = new Set(previousOrders.map(o => o.customer_id)).size;

        // --- Compile Response ---
        const responseCallback = {
            totalRevenue: currentRevenue,
            revenueChange: calculateGrowth(currentRevenue, previousRevenue),
            
            paidOrders: currentPaid.length,
            ordersChange: calculateGrowth(currentPaid.length, previousPaid.length), 
            
            totalOrders: currentTotalOrders,
            totalOrdersChange: calculateGrowth(currentTotalOrders, previousTotalOrders),

            averageOrderValue: currentAOV,
            aovChange: calculateGrowth(currentAOV, previousAOV),

            conversionRate: currentConversion,
            conversionChange: calculateGrowth(currentConversion, previousConversion),

            refundRate: currentRefundRate,
            refundedAmount: currentRefundAmount,

            pendingRevenue: currentPendingRevenue,
            
            avgItemsPerOrder: currentAvgItems,
            
            totalCustomers: currentUniqueCustomers,
            newCustomers: Math.max(0, currentUniqueCustomers - previousUniqueCustomers), // Naive estimate
            customerLifetimeValue: 0, // Needs complex lookup
            forecastedRevenue: calculateForecast(currentOrders, current.end),
        };
        

        
        res.json(responseCallback);

    } catch (error) {
        console.error('Error calculating sales metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
