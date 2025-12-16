/**
 * Tenant Hooks
 * React hooks for tenant operations
 */

"use client";

import { useCallback } from "react";
import { useTenant } from "./context";
import { Tenant } from "./types";

/**
 * Hook to get current tenant
 */
export function useCurrentTenant() {
  const { tenant, isLoading } = useTenant();
  return { tenant, isLoading };
}

/**
 * Hook to switch tenant
 */
export function useSwitchTenant() {
  const { setTenant, availableTenants } = useTenant();

  const switchTenant = useCallback(
    (tenant: Tenant | null) => {
      setTenant(tenant);
    },
    [setTenant]
  );

  return { switchTenant, availableTenants };
}

/**
 * Hook to check if user is in division level
 */
export function useIsDivisionLevel() {
  const { tenant } = useTenant();
  return tenant?.schoolId === null || tenant?.schoolId === undefined;
}

/**
 * Hook to check if user is in school level
 */
export function useIsSchoolLevel() {
  const { tenant } = useTenant();
  return tenant?.schoolId !== null && tenant?.schoolId !== undefined;
}
