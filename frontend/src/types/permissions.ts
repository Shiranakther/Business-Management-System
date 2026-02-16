// Permission types for Role-Based Access Control

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type PermissionModule = 
  | 'inventory' 
  | 'customers' 
  | 'suppliers' 
  | 'finance' 
  | 'hr'
  | 'sales'
  | 'orders'
  | 'reports'
  | 'settings';

export interface ModulePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermissions {
  inventory: ModulePermissions;
  customers: ModulePermissions;
  suppliers: ModulePermissions;
  finance: ModulePermissions;
  hr: ModulePermissions;
  sales: ModulePermissions;
  orders: ModulePermissions;
  reports: ModulePermissions;
  settings: ModulePermissions;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystem: boolean; // System roles cannot be deleted
}

// Default permission set (all false)
export const defaultModulePermissions: ModulePermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

// Full access permission set
export const fullModulePermissions: ModulePermissions = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

// Read-only permission set
export const readOnlyPermissions: ModulePermissions = {
  create: false,
  read: true,
  update: false,
  delete: false,
};

// Default roles
export const defaultRoles: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all modules and settings',
    isSystem: true,
    permissions: {
      inventory: { ...fullModulePermissions },
      customers: { ...fullModulePermissions },
      suppliers: { ...fullModulePermissions },
      finance: { ...fullModulePermissions },
      hr: { ...fullModulePermissions },
      sales: { ...fullModulePermissions },
      orders: { ...fullModulePermissions },
      reports: { ...fullModulePermissions },
      settings: { ...fullModulePermissions },
    },
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Can manage most modules but cannot delete or access settings',
    isSystem: true,
    permissions: {
      inventory: { create: true, read: true, update: true, delete: false },
      customers: { create: true, read: true, update: true, delete: false },
      suppliers: { create: true, read: true, update: true, delete: false },
      finance: { create: false, read: true, update: false, delete: false },
      hr: { create: false, read: true, update: false, delete: false },
      sales: { create: true, read: true, update: true, delete: false },
      orders: { create: true, read: true, update: true, delete: false },
      reports: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    id: 'sales_rep',
    name: 'Sales Representative',
    description: 'Access to sales, orders, and customers',
    isSystem: true,
    permissions: {
      inventory: { ...readOnlyPermissions },
      customers: { create: true, read: true, update: true, delete: false },
      suppliers: { ...defaultModulePermissions },
      finance: { ...defaultModulePermissions },
      hr: { ...defaultModulePermissions },
      sales: { create: true, read: true, update: true, delete: false },
      orders: { create: true, read: true, update: true, delete: false },
      reports: { ...readOnlyPermissions },
      settings: { ...defaultModulePermissions },
    },
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Access to finance and reporting modules',
    isSystem: true,
    permissions: {
      inventory: { ...readOnlyPermissions },
      customers: { ...readOnlyPermissions },
      suppliers: { ...readOnlyPermissions },
      finance: { ...fullModulePermissions },
      hr: { ...readOnlyPermissions },
      sales: { ...readOnlyPermissions },
      orders: { ...readOnlyPermissions },
      reports: { ...fullModulePermissions },
      settings: { ...defaultModulePermissions },
    },
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    description: 'Full access to HR module',
    isSystem: true,
    permissions: {
      inventory: { ...defaultModulePermissions },
      customers: { ...defaultModulePermissions },
      suppliers: { ...defaultModulePermissions },
      finance: { ...readOnlyPermissions },
      hr: { ...fullModulePermissions },
      sales: { ...defaultModulePermissions },
      orders: { ...defaultModulePermissions },
      reports: { ...readOnlyPermissions },
      settings: { ...defaultModulePermissions },
    },
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to all modules',
    isSystem: true,
    permissions: {
      inventory: { ...readOnlyPermissions },
      customers: { ...readOnlyPermissions },
      suppliers: { ...readOnlyPermissions },
      finance: { ...readOnlyPermissions },
      hr: { ...readOnlyPermissions },
      sales: { ...readOnlyPermissions },
      orders: { ...readOnlyPermissions },
      reports: { ...readOnlyPermissions },
      settings: { ...defaultModulePermissions },
    },
  },
];
