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
