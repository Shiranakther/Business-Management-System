import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Client for Auth verification (can use Anon or Service, Service is fine)
// We'll use a Service Role client for backend checks to bypass RLS
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // getUser(token) works with Service Role client too, validating the token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    // Check if user has admin role in user_roles table
    // Using supabaseAdmin (Service Role) bypasses RLS, ensuring we can read checks without recursion
    const { data: roles, error } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const isAdmin = roles.some(role => role.role_id === 'admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Internal server error during authorization' });
  }
};
