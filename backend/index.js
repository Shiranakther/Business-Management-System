import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials in .env file');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Routes
import rolesRoutes from './routes/roles.routes.js';
import usersRoutes from './routes/users.routes.js';
import businessRoutes from './routes/business.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import customersRoutes from './routes/customers.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import courierRoutes from './routes/courier.routes.js';
import returnsRoutes from './routes/returns.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import salesRoutes from './routes/sales.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import hrRoutes from './routes/hr.routes.js';

app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/couriers', courierRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/hr', hrRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

import http from 'http';
import { initSocket } from './utils/socket.js';

// Export app for Vercel serverless function (Note: Socket.io might not work seamlessly on Vercel without special config)
export default app;

// Start server only when running directly (local development)
const port = process.env.PORT || 5001;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
