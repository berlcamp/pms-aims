/**
 * React Hooks for RBAC
 * Provides hooks for permission checking in React components
 */

"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hook";
import { hasPermission, hasAnyPermission, hasAllPermissions, getRolePermissions } from "./permissions";
import { Permission } from "./types";

/**
 * Get current user's permissions from Redux store
 */
function useUserPermissions(): string[] {
  const user = useAppSelector((state) => state.user.user);
  
  // TODO: Fetch actual permissions from database based on user roles
  // For now, return empty array - this will be implemented when we connect to the database
  return useMemo(() => {
    if (!user?.type) return [];
    
    // Temporary: Map user.type to role code and get permissions
    // This should be replaced with actual database query
    const roleCode = user.type.toUpperCase() as any;
    const permissions = getRolePermissions(roleCode);
    return permissions.map((p) => p.code);
  }, [user?.type]);
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permissionCode: string): boolean {
  const permissions = useUserPermissions();
  return useMemo(
    () => hasPermission(permissions, permissionCode),
    [permissions, permissionCode]
  );
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissionCodes: string[]): boolean {
  const permissions = useUserPermissions();
  return useMemo(
    () => hasAnyPermission(permissions, permissionCodes),
    [permissions, permissionCodes]
  );
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useAllPermissions(permissionCodes: string[]): boolean {
  const permissions = useUserPermissions();
  return useMemo(
    () => hasAllPermissions(permissions, permissionCodes),
    [permissions, permissionCodes]
  );
}

/**
 * Hook to get all user permissions
 */
export function usePermissions(): string[] {
  return useUserPermissions();
}

/**
 * Hook to get user's permissions for a specific module
 */
export function useModulePermissions(module: "pms" | "aims" | "system"): Permission[] {
  const permissions = useUserPermissions();
  return useMemo(() => {
    // TODO: Import PERMISSIONS from permissions.ts and filter by module
    return [];
  }, [permissions, module]);
}
