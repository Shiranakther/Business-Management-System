import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser, requireAdmin } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();

// Supabase Admin for DB writes (org creation, profile update)
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Multer setup - memory storage to handle file in buffer before uploading to Supabase
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Setup Business (Create Org + Update Profile)
router.post('/setup', authenticateUser, upload.single('logo'), async (req, res) => {
    try {
        const { 
            name, type, slug, address, city, state, zipCode, country, 
            registrationNumber, taxId, currency, timezone, dateFormat, taxPercentage 
        } = req.body;
        const userId = req.user.id;
        const file = req.file;

        let logoUrl = null;

        // 1. Upload Logo if exists
        if (file) {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `logo_${userId}_${Date.now()}.${fileExt}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from('logos')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabaseAdmin
                .storage
                .from('logos')
                .getPublicUrl(fileName);
                
            logoUrl = publicUrl;
        }

        // 2. Create Organization
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert([{
                name,
                slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                type,
                logo_url: logoUrl,
                address,
                city,
                state,
                zip_code: zipCode,
                country,
                registration_number: registrationNumber,
                tax_id: taxId,
                currency,
                timezone,
                date_format: dateFormat,
                tax_percentage: taxPercentage
            }])
            .select()
            .single();

        if (orgError) throw orgError;

        // 3. Link User to Organization
        const { error: linkError } = await supabaseAdmin
            .from('profiles')
            .update({ organization_id: org.id })
            .eq('id', userId);

        if (linkError) throw linkError;

        res.json({ message: 'Business setup successfully', organization: org });

    } catch (error) {
        console.error('Business setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Business Details
router.get('/', authenticateUser, async (req, res) => {
    try {
        // Fetch user's organization_id first
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', req.user.id)
            .single();

        if (!profile?.organization_id) {
            return res.status(404).json({ error: 'No organization found' });
        }

        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

        if (error) throw error;

        res.json(org);
    } catch (error) {
         res.status(500).json({ error: error.message });
    }
});

// Update Business Details
router.put('/', authenticateUser, requireAdmin, upload.single('logo'), async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body; // Contains simple text fields
        const file = req.file;

        // Get org id
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', userId)
            .single();
            
        if (!profile?.organization_id) {
            return res.status(404).json({ error: 'No organization found' });
        }
        
        const orgId = profile.organization_id;
        let logoUrl = undefined;

        if (file) {
             const fileExt = file.originalname.split('.').pop();
             const fileName = `logo_${orgId}_${Date.now()}.${fileExt}`;
             
             const { error: uploadError } = await supabaseAdmin
                 .storage
                 .from('logos')
                 .upload(fileName, file.buffer, {
                     contentType: file.mimetype,
                     upsert: true
                 });

             if (uploadError) throw uploadError;

             const { data: { publicUrl } } = supabaseAdmin
                 .storage
                 .from('logos')
                 .getPublicUrl(fileName);
                 
             logoUrl = publicUrl;
        }

        // Prepare update object
        const dbUpdates = {
            updated_at: new Date(),
            ...updates
        };
        // Clean up undefined/nulls if form didn't send them? Multer fields come as strings.
        // We might want to selectively pick fields to avoid pollution.
        
        // Helper: pick fields
        const allowed = ['name', 'type', 'slug', 'address', 'city', 'state', 'zip_code', 'country', 
                         'registration_number', 'tax_id', 'currency', 'timezone', 'date_format'];
        
        const cleanUpdates = {};
        allowed.forEach(key => {
            // Check camelCase mapping from frontend to snake_case db
             const frontendKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase()); // snake to camel check?
             // Actually, usually frontend sends camelCase. "zipCode", "registrationNumber"
             
             // Let's manually map common ones or assume frontend sends matching keys or we map them here.
             // Simplest is to map manually.
        });
        
        // Let's just map explicitly from req.body
        const map = {
            name: req.body.name,
            type: req.body.type,
            slug: req.body.slug,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            zip_code: req.body.zipCode,
            country: req.body.country,
            registration_number: req.body.registrationNumber,
            tax_id: req.body.taxId,
            currency: req.body.currency,
            timezone: req.body.timezone,
            date_format: req.body.dateFormat,
            tax_percentage: req.body.taxPercentage
        };
        
        // Remove undefined keys
        Object.keys(map).forEach(key => map[key] === undefined && delete map[key]);
        
        if (logoUrl) {
            map.logo_url = logoUrl;
        }

        const { data: updatedOrg, error: updateError } = await supabaseAdmin
            .from('organizations')
            .update(map)
            .eq('id', orgId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json(updatedOrg);

    } catch (error) {
        console.error('Business update error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
