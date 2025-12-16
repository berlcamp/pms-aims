/**
 * Tenant Context Provider
 * Provides tenant context for multi-tenant architecture
 */

"use client";

import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Tenant, TenantContextValue } from "./types";

interface Division {
  id: number;
  name: string;
}

interface School {
  id: number;
  name: string;
}

interface UserData {
  division_id: number | null;
  school_id: number | null;
  division: Division | null;
  school: School | null;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.user.user);
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setTenant = useCallback((newTenant: Tenant | null) => {
    setTenantState(newTenant);
    // Store in localStorage for persistence
    if (newTenant) {
      localStorage.setItem("current_tenant", JSON.stringify(newTenant));
    } else {
      localStorage.removeItem("current_tenant");
    }
  }, []);

  const loadAvailableTenants = useCallback(
    async (divisionId: string | null) => {
      try {
        // Skip if divisionId is null
        if (!divisionId) {
          setAvailableTenants([]);
          return;
        }

        // Get division
        const divisionIdNum = parseInt(divisionId, 10);
        const { data: division } = await supabase
          .from("divisions")
          .select("id, name")
          .eq("id", divisionIdNum)
          .single();

        // Get schools in division
        const { data: schools } = await supabase
          .from("schools")
          .select("id, name")
          .eq("division_id", divisionIdNum)
          .eq("is_active", true);

        const tenants: Tenant[] = [];

        if (division) {
          tenants.push({
            divisionId: division.id.toString(),
            schoolId: null,
            divisionName: division.name,
          });
        }

        if (schools) {
          schools.forEach((school) => {
            tenants.push({
              divisionId: divisionId,
              schoolId: school.id.toString(),
              divisionName: division?.name,
              schoolName: school.name,
            });
          });
        }

        setAvailableTenants(tenants);
      } catch (error) {
        console.error("Failed to load available tenants:", error);
      }
    },
    []
  );

  // Load user's tenant information
  useEffect(() => {
    const loadTenant = async () => {
      if (!user?.system_user_id) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user's division and school
        const { data: userData, error } = await supabase
          .from("users")
          .select(
            `
            division_id,
            school_id,
            division:divisions (
              id,
              name
            ),
            school:schools (
              id,
              name
            )
          `
          )
          .eq("id", user.system_user_id)
          .single<UserData>();

        if (error) throw error;

        if (userData) {
          // Only set tenant if division_id exists
          if (userData.division_id) {
            const currentTenant: Tenant = {
              divisionId: userData.division_id.toString(),
              schoolId: userData.school_id?.toString() || null,
              divisionName: userData.division?.name,
              schoolName: userData.school?.name,
            };

            setTenant(currentTenant);

            // Load available tenants (divisions and schools user can access)
            await loadAvailableTenants(userData.division_id.toString());
          } else {
            // No division_id, set empty available tenants
            setAvailableTenants([]);
            setTenant(null);
          }
        }
      } catch (error) {
        console.error("Failed to load tenant:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [user?.system_user_id, loadAvailableTenants, setTenant]);

  // Load tenant from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("current_tenant");
    if (stored) {
      try {
        const parsedTenant = JSON.parse(stored) as Tenant;
        // Verify tenant is still valid
        const isValid = availableTenants.some(
          (t) =>
            t.divisionId === parsedTenant.divisionId &&
            t.schoolId === parsedTenant.schoolId
        );
        if (isValid) {
          setTenantState(parsedTenant);
        }
      } catch (error) {
        console.error("Failed to parse stored tenant:", error);
      }
    }
  }, [availableTenants]);

  const value: TenantContextValue = {
    tenant,
    setTenant,
    availableTenants,
    isLoading,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
