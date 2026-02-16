// Core entity types for the Small Business Management System

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isSystemAdmin: boolean;
  createdAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  subscriptionPlan: 'TRIAL' | 'BASIC' | 'ENTERPRISE';
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  registrationNumber?: string;
  taxId?: string;
  settings: TenantSettings;
  taxPercentage?: number;
}

export interface TenantSettings {
  logoUrl?: string;
  timezone: string;
  currency: string;
  dateFormat: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Employee {
  id: string;
  employeeId?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  nationality?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  department: string;
  position: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  manager?: string;
  hireDate: Date;
  terminationDate?: Date;
  salary?: number;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  skills?: string[];
  certifications?: string[];
  performanceRating?: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  avatar?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  supplier?: string;
  quantityOnHand: number;
  reorderPoint: number;
  maxStock?: number;
  unitPrice: number;
  costPrice?: number;
  movingAverageCost: number;
  weight?: number;
  dimensions?: string;
  location?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastUpdated: Date;
  expiryDate?: Date;
  imageUrl?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  transactionType: 'PURCHASE_RECEIPT' | 'SALES_ORDER' | 'ADJUSTMENT' | 'RETURN';
  quantityChange: number;
  costAtTransaction: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  // Core
  customerType: 'B2C' | 'B2B';
  name: string; // Full Name (B2C) or Contact Person Name (B2B fallback) or simply display name
  contactName?: string; // Derived field for convenience
  mobile: string;
  phone?: string; // Secondary
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes?: string;

  // Address (Billing)
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  city?: string;
  district?: string;
  postalCode?: string;

  // Address (Delivery)
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryCity?: string;
  deliveryDistrict?: string;
  deliveryPostalCode?: string;
  landmark?: string;
  deliveryInstructions?: string;

  // B2C Specific
  nic?: string;
  dateOfBirth?: Date;
  whatsapp?: string;
  preferredContactMethod?: 'CALL' | 'WHATSAPP' | 'EMAIL';

  // B2B Specific
  companyName?: string;
  businessRegistrationNumber?: string;
  vatNumber?: string;
  businessType?: 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'PVT_LTD';
  contactPersonName?: string;
  contactPersonDesignation?: string;
  officePhone?: string;
  businessEmail?: string;
  website?: string;

  // Credit & Payment
  creditAllowed: boolean;
  creditLimit?: number;
  outstandingBalance: number;
  paymentTerms?: 'CASH' | '7_DAYS' | '14_DAYS' | '30_DAYS';
  defaultPaymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';

  // Tax & Invoicing
  vatRegistered: boolean;
  vatPercentage?: number;
  invoiceName?: string;
  invoiceAddress?: string;

  // System
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  isQuickCustomer?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms: string;
  leadTime?: number;
  minOrderValue?: number;
  rating?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: Date;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  incurredDate: Date;
  supplierId?: string;
  supplierName?: string;
  receiptUrl?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}

export interface Payment {
  id: string;
  relatedEntityType: 'Order' | 'Expense';
  relatedEntityId: string;
  amount: number;
  paymentMethod: 'CREDIT_CARD' | 'WIRE' | 'CASH' | 'CHECK';
  transactionReference?: string;
  createdAt: Date;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  inventoryValue: number;
  inventoryChange: number;
  pendingExpenses: number;
  expensesChange: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

// HR & Payroll Types

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  hoursWorked?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'ANNUAL' | 'SICK' | 'CASUAL' | 'UNPAID';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SalaryAdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  requestDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  repaymentPlan?: string; 
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  basicSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  status: 'PROCESSED' | 'PENDING' | 'PAID';
  paymentDate?: Date;
}
