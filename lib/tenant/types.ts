/**
 * Multi-Tenant Types
 * Types for Division → Schools hierarchy
 */

export interface Tenant {
  divisionId: string;
  schoolId?: string | null;
  divisionName?: string;
  schoolName?: string;
}

export interface TenantContextValue {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  availableTenants: Tenant[];
  isLoading: boolean;
}
