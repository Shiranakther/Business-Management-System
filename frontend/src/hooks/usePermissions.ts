import React, { useCallback } from 'react';
import { usePermissionsStore } from '@/stores/permissionsStore';
import type { PermissionModule, PermissionAction } from '@/types/permissions';

/**
 * Hook to check permissions for the current user
 */
export function usePermissions() {
  const hasPermission = usePermissionsStore(useCallback(state => state.hasPermission, []));
  const getModulePermissions = usePermissionsStore(useCallback(state => state.getModulePermissions, []));
  const getCurrentRole = usePermissionsStore(useCallback(state => state.getCurrentRole, []));
  const currentUserRoleId = usePermissionsStore(useCallback(state => state.currentUserRoleId, []));
  const roles = usePermissionsStore(useCallback(state => state.roles, []));

  /**
   * Check if current user can perform an action on a module
   */
  const can = useCallback((module: PermissionModule, action: PermissionAction): boolean => {
    return hasPermission(module, action);
  }, [hasPermission]);

  /**
   * Check if current user can read a module
   */
  const canRead = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'read');
  }, [hasPermission]);

  /**
   * Check if current user can create in a module
   */
  const canCreate = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'create');
  }, [hasPermission]);

  /**
   * Check if current user can update in a module
   */
  const canUpdate = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'update');
  }, [hasPermission]);

  /**
   * Check if current user can delete in a module
   */
  const canDelete = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'delete');
  }, [hasPermission]);

  /**
   * Get all permissions for a module
   */
  const getPermissions = useCallback((module: PermissionModule) => {
    return getModulePermissions(module);
  }, [getModulePermissions]);

  /**
   * Check if current user is admin
   */
  const isAdmin = useCallback((): boolean => {
    return currentUserRoleId === 'admin';
  }, [currentUserRoleId]);

  /**
   * Get current role info
   */
  // This is a value, not a function, but effectively derived from state.
  // We can just rely on the store's value or memoize it if we had expensive computation.
  // Since usePermissionsStore causes re-render when store updates, this will be fresh.
  const currentRole = getCurrentRole();

  return {
    can,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    getPermissions,
    isAdmin,
    currentRole,
    currentRoleId: currentUserRoleId,
    allRoles: roles,
  };
}

/**
 * Utility component to conditionally render based on permissions
 */
interface PermissionGateProps {
  module: PermissionModule;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ 
  module, 
  action, 
  children, 
  fallback = null 
}: PermissionGateProps): React.ReactNode {
  const { can } = usePermissions();
  
  if (can(module, action)) {
    return children;
  }
  
  return fallback;
}
