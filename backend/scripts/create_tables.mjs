import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return response;
}

async function executeSQLViaPostgREST(sql) {
  // Use the SQL endpoint directly  
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed (${response.status}): ${text}`);
  }
  return await response.json();
}

async function main() {
  console.log('Attempting to create tables via Supabase SQL API...');
  
  const sqls = [
    `CREATE TABLE IF NOT EXISTS courier_partners (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL,
      name TEXT NOT NULL,
      contact_number TEXT,
      email TEXT,
      tracking_url_template TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS order_returns (
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
    );`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_partner_id UUID REFERENCES courier_partners(id);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;`,
    `ALTER TABLE courier_partners ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courier_partners' AND policyname = 'Allow all for service role on courier_partners') THEN
        CREATE POLICY "Allow all for service role on courier_partners" ON courier_partners FOR ALL USING (true);
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_returns' AND policyname = 'Allow all for service role on order_returns') THEN
        CREATE POLICY "Allow all for service role on order_returns" ON order_returns FOR ALL USING (true);
      END IF;
    END $$;`
  ];

  for (const sql of sqls) {
    try {
      const result = await executeSQLViaPostgREST(sql);
      console.log('OK:', sql.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (err) {
      console.log('FAILED:', err.message);
      console.log('SQL:', sql.substring(0, 80).replace(/\n/g, ' ') + '...');
    }
  }

  // Verify
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  const { error: cpCheck } = await supabase.from('courier_partners').select('id').limit(1);
  console.log('\ncourier_partners:', cpCheck ? 'MISSING' : 'OK');
  
  const { error: orCheck } = await supabase.from('order_returns').select('id').limit(1);
  console.log('order_returns:', orCheck ? 'MISSING' : 'OK');
  
  const { error: ocCheck } = await supabase.from('orders').select('courier_partner_id').limit(1);
  console.log('orders.courier_partner_id:', ocCheck ? 'MISSING' : 'OK');
}

main().catch(console.error);
