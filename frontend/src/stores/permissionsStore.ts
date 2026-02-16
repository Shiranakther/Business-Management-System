import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, PermissionModule, PermissionAction } from '@/types/permissions';
import { defaultRoles, defaultModulePermissions } from '@/types/permissions';

interface UserRoleAssignment {
  userId: string;
  roleId: string;
}

interface PermissionsState {
  roles: Role[];
  userRoleAssignments: UserRoleAssignment[];
  currentUserRoleId: string; // For demo purposes
  
  // Role management
  addRole: (role: Omit<Role, 'id'>) => void;
  updateRole: (roleId: string, updates: Partial<Omit<Role, 'id' | 'isSystem'>>) => void;
  deleteRole: (roleId: string) => void;
  
  // Permission management
  updateRolePermission: (
    roleId: string, 
    module: PermissionModule, 
    action: PermissionAction, 
    value: boolean
  ) => void;
  updateModulePermissions: (
    roleId: string,
    module: PermissionModule,
    permissions: Partial<{ create: boolean; read: boolean; update: boolean; delete: boolean }>
  ) => void;
  
  // User role assignment
  assignRoleToUser: (userId: string, roleId: string) => void;
  getUserRole: (userId: string) => Role | undefined;
  setCurrentUserRole: (roleId: string) => void;
  
  // Permission checks
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  getModulePermissions: (module: PermissionModule) => { create: boolean; read: boolean; update: boolean; delete: boolean };
  getCurrentRole: () => Role | undefined;
  
  // Reset
  resetToDefaults: () => void;
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      roles: [...defaultRoles],
      userRoleAssignments: [
        { userId: '1', roleId: 'admin' }, // Default mock user is admin
      ],
      currentUserRoleId: 'admin',
      
      addRole: (roleData) => {
        const newRole: Role = {
          ...roleData,
          id: `role_${Date.now()}`,
        };
        set((state) => ({ roles: [...state.roles, newRole] }));
      },
      
      updateRole: (roleId, updates) => {
        set((state) => ({
          roles: state.roles.map((role) =>
            role.id === roleId ? { ...role, ...updates } : role
          ),
        }));
      },
      
      deleteRole: (roleId) => {
        const role = get().roles.find((r) => r.id === roleId);
        if (role?.isSystem) return; // Cannot delete system roles
        
        set((state) => ({
          roles: state.roles.filter((r) => r.id !== roleId),
          userRoleAssignments: state.userRoleAssignments.filter(
            (a) => a.roleId !== roleId
          ),
        }));
      },
      
      updateRolePermission: (roleId, module, action, value) => {
        set((state) => ({
          roles: state.roles.map((role) => {
            if (role.id !== roleId) return role;
            return {
              ...role,
              permissions: {
                ...role.permissions,
                [module]: {
                  ...role.permissions[module],
                  [action]: value,
                },
              },
            };
          }),
        }));
      },
      
      updateModulePermissions: (roleId, module, permissions) => {
        set((state) => ({
          roles: state.roles.map((role) => {
            if (role.id !== roleId) return role;
            return {
              ...role,
              permissions: {
                ...role.permissions,
                [module]: {
                  ...role.permissions[module],
                  ...permissions,
                },
              },
            };
          }),
        }));
      },
      
      assignRoleToUser: (userId, roleId) => {
        set((state) => {
          const existing = state.userRoleAssignments.find(
            (a) => a.userId === userId
          );
          if (existing) {
            return {
              userRoleAssignments: state.userRoleAssignments.map((a) =>
                a.userId === userId ? { ...a, roleId } : a
              ),
            };
          }
          return {
            userRoleAssignments: [
              ...state.userRoleAssignments,
              { userId, roleId },
            ],
          };
        });
      },
      
      getUserRole: (userId) => {
        const assignment = get().userRoleAssignments.find(
          (a) => a.userId === userId
        );
        if (!assignment) return undefined;
        return get().roles.find((r) => r.id === assignment.roleId);
      },
      
      setCurrentUserRole: (roleId) => {
        set({ currentUserRoleId: roleId });
      },
      
      hasPermission: (module, action) => {
        const currentRoleId = get().currentUserRoleId;
        const role = get().roles.find((r) => r.id === currentRoleId);
        if (!role) return false;
        return role.permissions[module]?.[action] ?? false;
      },
      
      getModulePermissions: (module) => {
        const currentRoleId = get().currentUserRoleId;
        const role = get().roles.find((r) => r.id === currentRoleId);
        if (!role) return { ...defaultModulePermissions };
        return role.permissions[module] ?? { ...defaultModulePermissions };
      },
      
      getCurrentRole: () => {
        const currentRoleId = get().currentUserRoleId;
        return get().roles.find((r) => r.id === currentRoleId);
      },
      
      resetToDefaults: () => {
        set({
          roles: [...defaultRoles],
          userRoleAssignments: [{ userId: '1', roleId: 'admin' }],
          currentUserRoleId: 'admin',
        });
      },
    }),
    {
      name: 'permissions-storage',
    }
  )
);
