import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('Checking if tables exist...');
  
  // Check courier_partners
  const { error: cpCheck } = await supabase.from('courier_partners').select('id').limit(1);
  if (cpCheck) {
    console.log('courier_partners: MISSING - ' + cpCheck.message);
  } else {
    console.log('courier_partners: EXISTS');
  }
  
  // Check order_returns
  const { error: orCheck } = await supabase.from('order_returns').select('id').limit(1);
  if (orCheck) {
    console.log('order_returns: MISSING - ' + orCheck.message);
  } else {
    console.log('order_returns: EXISTS');
  }
  
  // Check orders has new columns
  const { data: orderData, error: ocCheck } = await supabase.from('orders').select('courier_partner_id, tracking_number').limit(1);
  if (ocCheck) {
    console.log('orders columns: MISSING - ' + ocCheck.message);
  } else {
    console.log('orders new columns: EXISTS');
  }

  // Print the SQL that needs to be run if tables are missing
  if (cpCheck || orCheck || ocCheck) {
    console.log('\n========================================');
    console.log('TABLES ARE MISSING. Run this SQL in Supabase SQL Editor:');
    console.log('========================================\n');
    console.log(`
-- Create courier_partners table
CREATE TABLE IF NOT EXISTS courier_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  tracking_url_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_returns table
CREATE TABLE IF NOT EXISTS order_returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  refund_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add courier columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_partner_id UUID REFERENCES courier_partners(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Disable RLS for service role access (consistent with existing tables)
ALTER TABLE courier_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role on courier_partners" ON courier_partners FOR ALL USING (true);
CREATE POLICY "Allow all for service role on order_returns" ON order_returns FOR ALL USING (true);
    `);
  } else {
    console.log('\\nAll tables and columns exist! Database is ready.');
  }
}

checkTables().catch(console.error);
