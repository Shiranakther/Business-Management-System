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

// GET /api/customers - List all customers
router.get('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: customers, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map snake_case to camelCase
        const mappedCustomers = customers.map(c => ({
            id: c.id,
            customerType: c.customer_type,
            name: c.name,
            mobile: c.mobile,
            phone: c.phone,
            email: c.email,
            status: c.status,
            notes: c.notes,
            billingAddressLine1: c.billing_address_line1,
            billingAddressLine2: c.billing_address_line2,
            city: c.city,
            district: c.district,
            postalCode: c.postal_code,
            deliveryAddressLine1: c.delivery_address_line1,
            deliveryAddressLine2: c.delivery_address_line2,
            deliveryCity: c.delivery_city,
            deliveryDistrict: c.delivery_district,
            deliveryPostalCode: c.delivery_postal_code,
            landmark: c.landmark,
            deliveryInstructions: c.delivery_instructions,
            nic: c.nic,
            dateOfBirth: c.date_of_birth,
            whatsapp: c.whatsapp,
            preferredContactMethod: c.preferred_contact_method,
            companyName: c.company_name,
            businessRegistrationNumber: c.business_registration_number,
            vatNumber: c.vat_number,
            businessType: c.business_type,
            contactPersonName: c.contact_person_name,
            contactPersonDesignation: c.contact_person_designation,
            officePhone: c.office_phone,
            businessEmail: c.business_email,
            website: c.website,
            creditAllowed: c.credit_allowed,
            creditLimit: c.credit_limit,
            outstandingBalance: c.outstanding_balance,
            paymentTerms: c.payment_terms,
            defaultPaymentMethod: c.default_payment_method,
            vatRegistered: c.vat_registered,
            vatPercentage: c.vat_percentage,
            invoiceName: c.invoice_name,
            invoiceAddress: c.invoice_address,
            contactName: c.contact_person_name || c.name, // Frontend compatibility
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            isQuickCustomer: c.is_quick_customer
        }));

        res.json(mappedCustomers);
    } catch (error) {
        console.error('Fetch customers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/customers - Create new customer
router.post('/', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const body = req.body;
        
        // Prepare DB object
        const newCustomer = {
            organization_id: orgId,
            customer_type: body.customerType,
            name: body.name,
            mobile: body.mobile,
            phone: body.phone,
            email: body.email,
            status: body.status || 'ACTIVE',
            notes: body.notes,
            
            billing_address_line1: body.billingAddressLine1,
            billing_address_line2: body.billingAddressLine2,
            city: body.city,
            district: body.district,
            postal_code: body.postalCode,

            delivery_address_line1: body.deliveryAddressLine1,
            delivery_address_line2: body.deliveryAddressLine2,
            delivery_city: body.deliveryCity,
            delivery_district: body.deliveryDistrict,
            delivery_postal_code: body.deliveryPostalCode,
            landmark: body.landmark,
            delivery_instructions: body.deliveryInstructions,

            nic: body.nic,
            date_of_birth: body.dateOfBirth || null,
            whatsapp: body.whatsapp,
            preferred_contact_method: body.preferredContactMethod,

            company_name: body.companyName,
            business_registration_number: body.businessRegistrationNumber,
            vat_number: body.vatNumber,
            business_type: body.businessType,
            contact_person_name: body.contactPersonName,
            contact_person_designation: body.contactPersonDesignation,
            office_phone: body.officePhone,
            business_email: body.businessEmail,
            website: body.website,

            credit_allowed: body.creditAllowed,
            credit_limit: body.creditLimit,
            outstanding_balance: 0, 
            payment_terms: body.paymentTerms,
            default_payment_method: body.defaultPaymentMethod,

            vat_registered: body.vatRegistered,
            vat_percentage: body.vatPercentage,
            invoice_name: body.invoiceName,
            invoice_address: body.invoiceAddress,

            created_by: req.user.id
        };

        const { data: customer, error } = await supabaseAdmin
            .from('customers')
            .insert([newCustomer])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(customer);

    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update customer
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });
        
        const body = req.body;
        
        // Map camelCase to snake_case for updates
        const updates = {
            updated_at: new Date(),
            customer_type: body.customerType,
            name: body.name,
            mobile: body.mobile,
            phone: body.phone,
            email: body.email,
            status: body.status,
            notes: body.notes,
            
            billing_address_line1: body.billingAddressLine1,
            billing_address_line2: body.billingAddressLine2,
            city: body.city,
            district: body.district,
            postal_code: body.postalCode,

            delivery_address_line1: body.deliveryAddressLine1,
            delivery_address_line2: body.deliveryAddressLine2,
            delivery_city: body.deliveryCity,
            delivery_district: body.deliveryDistrict,
            delivery_postal_code: body.deliveryPostalCode,
            landmark: body.landmark,
            delivery_instructions: body.deliveryInstructions,

            nic: body.nic,
            date_of_birth: body.dateOfBirth || null,
            whatsapp: body.whatsapp,
            preferred_contact_method: body.preferredContactMethod,

            company_name: body.companyName,
            business_registration_number: body.businessRegistrationNumber,
            vat_number: body.vatNumber,
            business_type: body.businessType,
            contact_person_name: body.contactPersonName,
            contact_person_designation: body.contactPersonDesignation,
            office_phone: body.officePhone,
            business_email: body.businessEmail,
            website: body.website,

            credit_allowed: body.creditAllowed,
            credit_limit: body.creditLimit,
            payment_terms: body.paymentTerms,
            default_payment_method: body.defaultPaymentMethod,

            vat_registered: body.vatRegistered,
            vat_percentage: body.vatPercentage,
            invoice_name: body.invoiceName,
            invoice_address: body.invoiceAddress,
        };

        // Remove undefined keys
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const { data: updated, error } = await supabaseAdmin
            .from('customers')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);

    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = await getOrgId(req.user.id);
        
        const { error } = await supabaseAdmin
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
