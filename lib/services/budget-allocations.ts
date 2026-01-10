/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import {
  BudgetAllocation,
  BudgetAllocationWithRelations,
} from "@/types/database";

/**
 * Create a new budget allocation (Budget Officer only)
 */
export async function createBudgetAllocation(data: {
  divisionId: string;
  fiscalYear: number;
  allocationName: string;
  allocationAmount: number;
  fundSource: string;
  status: "draft" | "active" | "closed";
  remarks?: string | null;
  lasaId?: string | null;
  proponentId?: string | null;
  createdBy: string;
}): Promise<BudgetAllocation> {
  const allocationData = {
    division_id: parseInt(data.divisionId),
    fiscal_year: data.fiscalYear,
    allocation_name: data.allocationName,
    allocation_amount: data.allocationAmount,
    fund_source: data.fundSource,
    status: data.status,
    remarks: data.remarks || null,
    lasa_id: data.lasaId ? parseInt(data.lasaId) : null,
    proponent_id: data.proponentId ? parseInt(data.proponentId) : null,
    created_by: parseInt(data.createdBy),
  };

  const { data: allocation, error } = await supabase
    .from("budget_allocations")
    .insert([allocationData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create budget allocation: ${error.message}`);
  }

  return allocation as BudgetAllocation;
}

/**
 * Update a budget allocation
 */
export async function updateBudgetAllocation(
  id: string,
  data: {
    allocationName?: string;
    allocationAmount?: number;
    fundSource?: string;
    status?: "draft" | "active" | "closed";
    remarks?: string | null;
    lasaId?: string | null;
    proponentId?: string | null;
  }
): Promise<BudgetAllocation> {
  // Check if allocation exists
  const { data: existing, error: fetchError } = await supabase
    .from("budget_allocations")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw new Error("Budget allocation not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.allocationName !== undefined) {
    updateData.allocation_name = data.allocationName;
  }
  if (data.allocationAmount !== undefined) {
    updateData.allocation_amount = data.allocationAmount;
  }
  if (data.fundSource !== undefined) {
    updateData.fund_source = data.fundSource;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.remarks !== undefined) {
    updateData.remarks = data.remarks;
  }
  if (data.lasaId !== undefined) {
    updateData.lasa_id = data.lasaId ? parseInt(data.lasaId) : null;
  }
  if (data.proponentId !== undefined) {
    updateData.proponent_id = data.proponentId
      ? parseInt(data.proponentId)
      : null;
  }

  const { data: allocation, error } = await supabase
    .from("budget_allocations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update budget allocation: ${error.message}`);
  }

  return allocation as BudgetAllocation;
}

/**
 * Delete a budget allocation
 */
export async function deleteBudgetAllocation(id: string): Promise<void> {
  // Check if allocation exists
  const { data: existing, error: fetchError } = await supabase
    .from("budget_allocations")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw new Error("Budget allocation not found");
  }

  const { error } = await supabase
    .from("budget_allocations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete budget allocation: ${error.message}`);
  }
}

/**
 * Get budget allocations with filters
 */
export async function getBudgetAllocations(filters?: {
  divisionId?: string;
  fiscalYear?: number;
  status?: "draft" | "active" | "closed";
  lasaId?: string;
  keyword?: string;
}): Promise<BudgetAllocationWithRelations[]> {
  let query = supabase
    .from("budget_allocations")
    .select(
      `
      *,
      lasa:lasa_rows!budget_allocations_lasa_id_fkey(id, project_title, fiscal_year, fund_source, planned_amount),
      proponent:users!budget_allocations_proponent_id_fkey(id, name, email),
      created_by_user:users!budget_allocations_created_by_fkey(id, name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.divisionId) {
    query = query.eq("division_id", parseInt(filters.divisionId));
  }

  if (filters?.fiscalYear) {
    query = query.eq("fiscal_year", filters.fiscalYear);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.lasaId) {
    query = query.eq("lasa_id", parseInt(filters.lasaId));
  }

  if (filters?.keyword) {
    query = query.or(
      `allocation_name.ilike.%${filters.keyword}%,fund_source.ilike.%${filters.keyword}%,remarks.ilike.%${filters.keyword}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget allocations: ${error.message}`);
  }

  return (data || []) as BudgetAllocationWithRelations[];
}

/**
 * Get a single budget allocation by ID with relations
 */
export async function getBudgetAllocationById(
  id: string
): Promise<BudgetAllocationWithRelations | null> {
  const { data, error } = await supabase
    .from("budget_allocations")
    .select(
      `
      *,
      lasa:lasa_rows!budget_allocations_lasa_id_fkey(id, project_title, fiscal_year, fund_source, planned_amount),
      proponent:users!budget_allocations_proponent_id_fkey(id, name, email),
      created_by_user:users!budget_allocations_created_by_fkey(id, name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch budget allocation: ${error.message}`);
  }

  return data as BudgetAllocationWithRelations;
}

/**
 * Get budget allocations where the proponent_id matches the specified proponent
 */
export async function getBudgetAllocationsByProponent(
  proponentId: string
): Promise<BudgetAllocationWithRelations[]> {
  const { data, error } = await supabase
    .from("budget_allocations")
    .select(
      `
      *,
      lasa:lasa_rows!budget_allocations_lasa_id_fkey(id, project_title, fiscal_year, fund_source, planned_amount),
      proponent:users!budget_allocations_proponent_id_fkey(id, name, email),
      created_by_user:users!budget_allocations_created_by_fkey(id, name, email)
    `
    )
    .eq("proponent_id", parseInt(proponentId))
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch budget allocations: ${error.message}`);
  }

  return (data || []) as BudgetAllocationWithRelations[];
}
