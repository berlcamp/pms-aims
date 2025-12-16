/**
 * Tenant Middleware
 * Middleware functions for tenant isolation in queries
 */

import { Tenant } from "./types";

/**
 * Add tenant filter to a Supabase query
 */
export function withTenantFilter<T>(query: any, tenant: Tenant | null): any {
  if (!tenant) return query;

  // Filter by division_id
  let filteredQuery = query.eq("division_id", tenant.divisionId);

  // If school-level tenant, also filter by school_id
  if (tenant.schoolId) {
    filteredQuery = filteredQuery.eq("school_id", tenant.schoolId);
  } else {
    // Division-level: include records where school_id is null or matches division
    filteredQuery = filteredQuery.or(
      `school_id.is.null,school_id.eq.${tenant.schoolId}`
    );
  }

  return filteredQuery;
}

/**
 * Check if a record belongs to the current tenant
 */
export function belongsToTenant(
  record: { division_id: string; school_id?: string | null },
  tenant: Tenant | null
): boolean {
  if (!tenant) return false;

  if (record.division_id !== tenant.divisionId) {
    return false;
  }

  // If tenant is school-level, record must have same school_id
  if (tenant.schoolId) {
    return record.school_id === tenant.schoolId;
  }

  // If tenant is division-level, record can have any school_id or null
  return true;
}

/**
 * Get tenant filter object for Supabase queries
 */
export function getTenantFilter(tenant: Tenant | null): Record<string, any> {
  if (!tenant) {
    return {};
  }

  const filter: Record<string, any> = {
    division_id: tenant.divisionId,
  };

  if (tenant.schoolId) {
    filter.school_id = tenant.schoolId;
  }

  return filter;
}
