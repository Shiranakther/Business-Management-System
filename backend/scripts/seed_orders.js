
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function seedOrders() {
    console.log('Starting seed...');
    
    // Get Organization ID (assuming the first one found or specific one)
    // For simplicity, let's just get the first profile's org or a specific user's org if we knew it. 
    // We will just pick the first org we find in profiles or define one.
    // Actually, let's just pick any organization_id from the customers table to ensure consistency.
    const { data: customers, error: custError } = await supabaseAdmin.from('customers').select('id, organization_id');
    if (custError || !customers.length) {
        console.error('No customers found. Create customers first.');
        return;
    }
    
    const { data: products, error: prodError } = await supabaseAdmin.from('products').select('id, name, unit_price, organization_id');
    if (prodError || !products.length) {
        console.error('No products found. Create products first.');
        return;
    }

    const orgId = customers[0].organization_id;
    const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const paymentStatuses = ['PENDING', 'PAID', 'REFUNDED'];
    const paymentMethods = ['card', 'cash', 'bank_transfer', 'cod', 'cheque'];

    const ordersToCreate = [];
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    for (let i = 0; i < 20; i++) {
        const customer = getRandomItem(customers);
        const numItems = getRandomInt(1, 5);
        const orderItems = [];
        let subtotal = 0;

        for (let j = 0; j < numItems; j++) {
            const product = getRandomItem(products);
            const quantity = getRandomInt(1, 10);
            const total = quantity * product.unit_price;
            subtotal += total;
            orderItems.push({
                inventory_item_id: product.id,
                quantity,
                unit_price: product.unit_price,
                total_price: total
            });
        }

        const tax = subtotal * 0.09;
        const total = subtotal + tax;
        const createdAt = getRandomDate(threeMonthsAgo, now);

        ordersToCreate.push({
            organization_id: orgId,
            customer_id: customer.id,
            order_number: `ORD-SEED-${Date.now()}-${i}`,
            subtotal,
            tax,
            total_amount: total,
            status: getRandomItem(orderStatuses),
            payment_status: getRandomItem(paymentStatuses),
            payment_method: getRandomItem(paymentMethods),
            shipping_method: 'standard',
            shipping_address: '123 Fake St, Seed City',
            billing_address: '123 Fake St, Seed City',
            created_at: createdAt.toISOString(),
            order_items: orderItems
        });
    }

    // Insert Orders and Items
    for (const orderData of ordersToCreate) {
        const { order_items, ...orderFields } = orderData;
        
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert(orderFields)
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            continue;
        }

        const itemsWithOrderId = order_items.map(item => ({
            ...item,
            order_id: order.id,
            organization_id: orgId
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(itemsWithOrderId);

        if (itemsError) {
            console.error('Error creating items for order:', itemsError);
        } else {
            console.log(`Created order ${order.order_number}`);
        }
    }

    console.log('Seeding complete!');
}

seedOrders();
