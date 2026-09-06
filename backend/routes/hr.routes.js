import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateUser } from '../middleware/auth.middleware.js';

dotenv.config();
const router = express.Router();

const toCamel = (str) => {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const keysToCamel = function(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function' && !(o instanceof Date)) {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toCamel(k)] = keysToCamel(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return keysToCamel(i);
    });
  }
  return o;
};

const toSnake = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const keysToSnake = function(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function' && !(o instanceof Date)) {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toSnake(k)] = keysToSnake(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return keysToSnake(i);
    });
  }
  return o;
};


const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getOrgId = async (userId) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();
    return profile?.organization_id;
};

// ============================================
// EMPLOYEES
// ============================================

// GET /api/hr/employees
router.get('/employees', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data, error } = await supabaseAdmin
            .from('employees')
            .select('*')
            .eq('organization_id', orgId)
            .order('first_name', { ascending: true });

        if (error) throw error;

        const employees = data.map(emp => ({
            id: emp.id,
            employeeId: emp.employee_code,
            firstName: emp.first_name,
            lastName: emp.last_name,
            email: emp.email,
            phone: emp.phone,
            mobile: emp.mobile,
            address: emp.address,
            city: emp.city,
            state: emp.state,
            zipCode: emp.zip_code,
            dateOfBirth: emp.date_of_birth,
            gender: emp.gender,
            nationality: emp.nationality,
            emergencyContact: emp.emergency_contact,
            emergencyPhone: emp.emergency_phone,
            department: emp.department,
            position: emp.position,
            employmentType: emp.employment_type,
            manager: emp.manager,
            hireDate: emp.hire_date,
            terminationDate: emp.termination_date,
            salary: emp.salary,
            bankName: emp.bank_name,
            bankAccount: emp.bank_account,
            taxId: emp.tax_id,
            status: emp.status,
        }));

        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hr/employees
router.post('/employees', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const {
            employeeId, firstName, lastName, email, phone, mobile,
            address, city, state, zipCode, dateOfBirth, gender, nationality,
            emergencyContact, emergencyPhone, department, position,
            employmentType, manager, hireDate, salary, bankName, bankAccount, taxId
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('employees')
            .insert({
                organization_id: orgId,
                employee_code: employeeId,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                mobile,
                address,
                city,
                state,
                zip_code: zipCode,
                date_of_birth: dateOfBirth || null,
                gender,
                nationality,
                emergency_contact: emergencyContact,
                emergency_phone: emergencyPhone,
                department,
                position,
                employment_type: employmentType || 'FULL_TIME',
                manager,
                hire_date: hireDate || null,
                salary: salary || 0,
                bank_name: bankName,
                bank_account: bankAccount,
                tax_id: taxId,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hr/employees/:id
router.put('/employees/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;
        const {
            employeeId, firstName, lastName, email, phone, mobile,
            address, city, state, zipCode, dateOfBirth, gender, nationality,
            emergencyContact, emergencyPhone, department, position,
            employmentType, manager, hireDate, salary, bankName, bankAccount, taxId, status
        } = req.body;

        const updateData = { updated_at: new Date() };
        if (employeeId !== undefined) updateData.employee_code = employeeId;
        if (firstName !== undefined) updateData.first_name = firstName;
        if (lastName !== undefined) updateData.last_name = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (mobile !== undefined) updateData.mobile = mobile;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zipCode !== undefined) updateData.zip_code = zipCode;
        if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth;
        if (gender !== undefined) updateData.gender = gender;
        if (nationality !== undefined) updateData.nationality = nationality;
        if (emergencyContact !== undefined) updateData.emergency_contact = emergencyContact;
        if (emergencyPhone !== undefined) updateData.emergency_phone = emergencyPhone;
        if (department !== undefined) updateData.department = department;
        if (position !== undefined) updateData.position = position;
        if (employmentType !== undefined) updateData.employment_type = employmentType;
        if (manager !== undefined) updateData.manager = manager;
        if (hireDate !== undefined) updateData.hire_date = hireDate;
        if (salary !== undefined) updateData.salary = salary;
        if (bankName !== undefined) updateData.bank_name = bankName;
        if (bankAccount !== undefined) updateData.bank_account = bankAccount;
        if (taxId !== undefined) updateData.tax_id = taxId;
        if (status !== undefined) updateData.status = status;

        const { data, error } = await supabaseAdmin
            .from('employees')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/hr/employees/:id (soft delete)
router.delete('/employees/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('employees')
            .update({ status: 'TERMINATED', termination_date: new Date(), updated_at: new Date() })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// GET /api/hr/leaves
router.get('/leaves', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`*, employees (first_name, last_name)`)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = data.map(leave => ({
            id: leave.id,
            employeeId: leave.employee_id,
            employeeName: leave.employees ? `${leave.employees.first_name} ${leave.employees.last_name}` : 'Unknown',
            type: leave.type,
            startDate: leave.start_date,
            endDate: leave.end_date,
            reason: leave.reason,
            status: leave.status,
            notes: leave.notes,
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hr/leaves
router.post('/leaves', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { employeeId, type, startDate, endDate, reason } = req.body;

        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .insert({
                organization_id: orgId,
                employee_id: employeeId,
                type,
                start_date: startDate,
                end_date: endDate,
                reason,
                status: 'PENDING',
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hr/leaves/:id
router.put('/leaves/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .update({ status, notes, updated_at: new Date() })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ATTENDANCE
// ============================================

// GET /api/hr/attendance
router.get('/attendance', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        let query = supabaseAdmin
            .from('attendance_records')
            .select(`*, employees (first_name, last_name)`)
            .eq('organization_id', orgId)
            .order('date', { ascending: false });

        // Optional date filter
        if (req.query.date) {
            query = query.eq('date', req.query.date);
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = data.map(rec => ({
            id: rec.id,
            employeeId: rec.employee_id,
            employeeName: rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : 'Unknown',
            date: rec.date,
            checkIn: rec.check_in,
            checkOut: rec.check_out,
            status: rec.status,
            hoursWorked: rec.hours_worked,
            notes: rec.notes,
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hr/attendance
router.post('/attendance', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { employeeId, date, checkIn, checkOut, status, hoursWorked, notes } = req.body;

        let isLate = false;
        let lateMinutes = 0;

        if (checkIn) {
            // 1. Get Payroll Settings for grace period
            const { data: settings } = await supabaseAdmin
                .from('payroll_settings')
                .select('late_grace_period_minutes')
                .eq('organization_id', orgId)
                .single();
            const gracePeriod = settings?.late_grace_period_minutes || 15;

            // 2. Get Employee's assigned shift or default shift
            const { data: empShift } = await supabaseAdmin
                .from('employee_shifts')
                .select('shifts(start_time)')
                .eq('employee_id', employeeId)
                .is('effective_to', null)
                .single();

            let shiftStartTimeStr = null;
            if (empShift && empShift.shifts) {
                shiftStartTimeStr = empShift.shifts.start_time;
            } else {
                const { data: defShift } = await supabaseAdmin
                    .from('shifts')
                    .select('start_time')
                    .eq('organization_id', orgId)
                    .eq('is_default', true)
                    .single();
                if (defShift) shiftStartTimeStr = defShift.start_time;
            }

            // 3. Calculate Late Minutes
            if (shiftStartTimeStr) {
                const checkInDate = new Date(checkIn);
                const [hours, minutes, seconds] = shiftStartTimeStr.split(':').map(Number);
                const shiftStartTime = new Date(checkInDate);
                shiftStartTime.setHours(hours, minutes, seconds || 0, 0);

                const diffMs = checkInDate.getTime() - shiftStartTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins > gracePeriod) {
                    isLate = true;
                    lateMinutes = diffMins;
                }
            }
        }

        const { data, error } = await supabaseAdmin
            .from('attendance_records')
            .insert({
                organization_id: orgId,
                employee_id: employeeId,
                date,
                check_in: checkIn || null,
                check_out: checkOut || null,
                status: status || 'PRESENT',
                hours_worked: hoursWorked || null,
                is_late: isLate,
                late_minutes: lateMinutes,
                notes,
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hr/attendance/:id
router.put('/attendance/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;
        const { checkIn, checkOut, status, hoursWorked, notes } = req.body;

        const updateData = { updated_at: new Date() };
        if (checkIn !== undefined) updateData.check_in = checkIn;
        if (checkOut !== undefined) updateData.check_out = checkOut;
        if (status !== undefined) updateData.status = status;
        if (hoursWorked !== undefined) updateData.hours_worked = hoursWorked;
        if (notes !== undefined) updateData.notes = notes;

        const { data, error } = await supabaseAdmin
            .from('attendance_records')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PAYROLL
// ============================================

// GET /api/hr/payroll
router.get('/payroll', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data, error } = await supabaseAdmin
            .from('payroll_records')
            .select(`*, employees (first_name, last_name)`)
            .eq('organization_id', orgId)
            .order('pay_period_start', { ascending: false });

        if (error) throw error;

        const mapped = data.map(rec => ({
            id: rec.id,
            employeeId: rec.employee_id,
            employeeName: rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : 'Unknown',
            payPeriodStart: rec.pay_period_start,
            payPeriodEnd: rec.pay_period_end,
            basicSalary: rec.basic_salary,
            bonuses: rec.bonuses,
            deductions: rec.deductions,
            netSalary: rec.net_salary,
            status: rec.status,
            paymentDate: rec.payment_date,
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hr/payroll
router.post('/payroll', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { employeeId, payPeriodStart, payPeriodEnd, basicSalary, bonuses, deductions, netSalary } = req.body;

        const { data, error } = await supabaseAdmin
            .from('payroll_records')
            .insert({
                organization_id: orgId,
                employee_id: employeeId,
                pay_period_start: payPeriodStart,
                pay_period_end: payPeriodEnd,
                basic_salary: basicSalary || 0,
                bonuses: bonuses || 0,
                deductions: deductions || 0,
                net_salary: netSalary || 0,
                status: 'PENDING',
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hr/payroll/:id
router.put('/payroll/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;
        const { status, paymentDate } = req.body;

        const updateData = { updated_at: new Date() };
        if (status) updateData.status = status;
        if (paymentDate) updateData.payment_date = paymentDate;

        const { data, error } = await supabaseAdmin
            .from('payroll_records')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SALARY ADVANCES
// ============================================

// GET /api/hr/advances
router.get('/advances', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data, error } = await supabaseAdmin
            .from('salary_advance_requests')
            .select(`*, employees (first_name, last_name)`)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = data.map(rec => ({
            id: rec.id,
            employeeId: rec.employee_id,
            employeeName: rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : 'Unknown',
            amount: rec.amount,
            reason: rec.reason,
            requestDate: rec.request_date,
            status: rec.status,
            repaymentPlan: rec.repayment_plan,
            notes: rec.notes,
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hr/advances
router.post('/advances', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { employeeId, amount, reason, requestDate } = req.body;

        const { data, error } = await supabaseAdmin
            .from('salary_advance_requests')
            .insert({
                organization_id: orgId,
                employee_id: employeeId,
                amount,
                reason,
                request_date: requestDate || new Date(),
                status: 'PENDING',
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hr/advances/:id
router.put('/advances/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabaseAdmin
            .from('salary_advance_requests')
            .update({ status, notes, updated_at: new Date() })
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STATS
// ============================================

// GET /api/hr/stats
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });

        const { data: employees, error: empError } = await supabaseAdmin
            .from('employees')
            .select('status')
            .eq('organization_id', orgId);

        if (empError) throw empError;

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
        const onLeaveEmployees = employees.filter(e => e.status === 'ON_LEAVE').length;

        res.json({ totalEmployees, activeEmployees, onLeaveEmployees });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ============================================
// PAYROLL SETTINGS
// ============================================
router.get('/settings', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        if (!orgId) return res.status(403).json({ error: 'No organization found' });
        
        let { data, error } = await supabaseAdmin
            .from('payroll_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (error && error.code === 'PGRST116') {
            const insertRes = await supabaseAdmin
                .from('payroll_settings')
                .insert({ organization_id: orgId })
                .select()
                .single();
            if (insertRes.error) throw insertRes.error;
            data = insertRes.data;
        } else if (error) {
            throw error;
        }
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/settings', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const updateData = keysToSnake(req.body);
        delete updateData.id;
        delete updateData.organization_id;

        const { data, error } = await supabaseAdmin
            .from('payroll_settings')
            .upsert({ organization_id: orgId, ...updateData }, { onConflict: 'organization_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LEAVE TIERS
// ============================================
router.get('/leave-tiers', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const { data, error } = await supabaseAdmin
            .from('leave_entitlement_tiers')
            .select('*')
            .eq('organization_id', orgId)
            .order('year_from', { ascending: true });
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/leave-tiers', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const insertData = keysToSnake(req.body);
        const { data, error } = await supabaseAdmin
            .from('leave_entitlement_tiers')
            .insert({ organization_id: orgId, ...insertData })
            .select()
            .single();
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/leave-tiers/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const updateData = keysToSnake(req.body);
        const { data, error } = await supabaseAdmin
            .from('leave_entitlement_tiers')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('organization_id', orgId)
            .select()
            .single();
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/leave-tiers/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const { error } = await supabaseAdmin
            .from('leave_entitlement_tiers')
            .delete()
            .eq('id', req.params.id)
            .eq('organization_id', orgId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GRATUITY SETTINGS
// ============================================
router.get('/gratuity-settings', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const { data, error } = await supabaseAdmin
            .from('gratuity_settings')
            .select('*')
            .eq('organization_id', orgId)
            .order('year_from', { ascending: true });
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/gratuity-settings', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const insertData = keysToSnake(req.body);
        const { data, error } = await supabaseAdmin
            .from('gratuity_settings')
            .insert({ organization_id: orgId, ...insertData })
            .select()
            .single();
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/gratuity-settings/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const updateData = keysToSnake(req.body);
        const { data, error } = await supabaseAdmin
            .from('gratuity_settings')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('organization_id', orgId)
            .select()
            .single();
        if (error) throw error;
        res.json(keysToCamel(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/gratuity-settings/:id', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const { error } = await supabaseAdmin
            .from('gratuity_settings')
            .delete()
            .eq('id', req.params.id)
            .eq('organization_id', orgId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DOCUMENTS
// ============================================
router.get('/documents/:employeeId', authenticateUser, async (req, res) => {
    try {
        const orgId = await getOrgId(req.user.id);
        const { data, error } = await supabaseAdmin
            .from('employee_documents')
            .select('*')
            .eq('employee_id', req.params.employeeId)
            .eq('organization_id', orgId);
        if (error) throw error;
        
        const docs = keysToCamel(data);
        const requiredTypes = ['NIC', 'SCHOOL_LEAVING', 'POLICE_REPORT', 'GN_CERTIFICATE', 'OL_CERTIFICATE', 'AL_CERTIFICATE', 'DEGREE_CERTIFICATE'];
        const existingTypes = docs.map(d => d.documentType);
        const missingTypes = requiredTypes.filter(t => !existingTypes.includes(t));
        
        res.json({ documents: docs, missingTypes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
