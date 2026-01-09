/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import {
  LasaRow,
  LasaRowType,
  LasaRowWithRelations,
  PPMP,
} from "@/types/database";

/**
 * Create a new MANUAL LASA row (Budget Officer only)
 */
export async function createLasaRow(data: {
  divisionId: string;
  fiscalYear: number;
  proponentId?: string | null;
  projectTitle: string;
  fundSource: string;
  plannedAmount?: number;
  saroNumber?: string | null;
  createdBy: string;
}): Promise<LasaRow> {
  // Only MANUAL rows can be created manually (PPMP_PROJECT rows are auto-created)

  const lasaData = {
    division_id: parseInt(data.divisionId),
    fiscal_year: data.fiscalYear,
    row_type: "MANUAL" as LasaRowType,
    proponent_id: data.proponentId ? parseInt(data.proponentId) : null,
    project_title: data.projectTitle,
    fund_source: data.fundSource,
    planned_amount: data.plannedAmount || 0,
    saro_number: data.saroNumber || null,
    ppmp_version_id: null,
    is_locked: false,
    created_by: parseInt(data.createdBy),
  };

  const { data: lasaRow, error } = await supabase
    .from("lasa_rows")
    .insert([lasaData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create LASA row: ${error.message}`);
  }

  return lasaRow as LasaRow;
}

/**
 * Update a MANUAL LASA row (only if not locked)
 */
export async function updateLasaRow(
  id: string,
  data: {
    proponentId?: string | null;
    projectTitle?: string;
    fundSource?: string;
    plannedAmount?: number;
    saroNumber?: string | null;
  }
): Promise<LasaRow> {
  // Check if LASA row exists and can be edited
  const { data: existingRow } = await supabase
    .from("lasa_rows")
    .select("row_type, is_locked")
    .eq("id", id)
    .single();

  if (!existingRow) {
    throw new Error("LASA row not found");
  }

  // Cannot edit PPMP_PROJECT rows
  if (existingRow.row_type === "PPMP_PROJECT") {
    throw new Error("Cannot edit PPMP_PROJECT LASA rows");
  }

  // Cannot edit locked rows
  if (existingRow.is_locked) {
    throw new Error("LASA row is locked and cannot be edited");
  }

  const updateData: any = {};
  if (data.proponentId !== undefined) {
    updateData.proponent_id = data.proponentId
      ? parseInt(data.proponentId)
      : null;
  }
  if (data.projectTitle !== undefined) {
    updateData.project_title = data.projectTitle;
  }
  if (data.fundSource !== undefined) {
    updateData.fund_source = data.fundSource;
  }
  if (data.plannedAmount !== undefined) {
    updateData.planned_amount = data.plannedAmount;
  }
  if (data.saroNumber !== undefined) {
    updateData.saro_number = data.saroNumber || null;
  }

  const { data: lasaRow, error } = await supabase
    .from("lasa_rows")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update LASA row: ${error.message}`);
  }

  return lasaRow as LasaRow;
}

/**
 * Delete a MANUAL LASA row (only if not locked)
 */
export async function deleteLasaRow(id: string): Promise<void> {
  // Check if LASA row exists and can be deleted
  const { data: existingRow } = await supabase
    .from("lasa_rows")
    .select("row_type, is_locked")
    .eq("id", id)
    .single();

  if (!existingRow) {
    throw new Error("LASA row not found");
  }

  // Cannot delete PPMP_PROJECT rows
  if (existingRow.row_type === "PPMP_PROJECT") {
    throw new Error("Cannot delete PPMP_PROJECT LASA rows");
  }

  // Cannot delete locked rows
  if (existingRow.is_locked) {
    throw new Error("LASA row is locked and cannot be deleted");
  }

  const { error } = await supabase.from("lasa_rows").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete LASA row: ${error.message}`);
  }
}

/**
 * Get LASA rows with filters
 */
export async function getLasaRows(filters?: {
  divisionId?: string;
  fiscalYear?: number;
  proponentId?: string | null;
  keyword?: string;
}): Promise<LasaRowWithRelations[]> {
  let query = supabase
    .from("lasa_rows")
    .select(
      `
      *,
      office:offices(id, name, code),
      proponent:users!lasa_rows_proponent_id_fkey(id, name, email),
      ppmp:ppmp!lasa_rows_ppmp_version_id_fkey(id, ppmp_number, project_title, status),
      created_by_user:users!lasa_rows_created_by_fkey(id, name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.divisionId) {
    query = query.eq("division_id", parseInt(filters.divisionId));
  }

  if (filters?.fiscalYear) {
    query = query.eq("fiscal_year", filters.fiscalYear);
  }

  if (filters?.proponentId) {
    query = query.eq("proponent_id", parseInt(filters.proponentId));
  }

  if (filters?.keyword) {
    query = query.or(
      `project_title.ilike.%${filters.keyword}%,fund_source.ilike.%${filters.keyword}%,saro_number.ilike.%${filters.keyword}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch LASA rows: ${error.message}`);
  }

  return (data || []) as LasaRowWithRelations[];
}

/**
 * Get a single LASA row by ID with relations
 */
export async function getLasaRowById(
  id: string
): Promise<LasaRowWithRelations | null> {
  const { data, error } = await supabase
    .from("lasa_rows")
    .select(
      `
      *,
      office:offices(id, name, code),
      proponent:users!lasa_rows_proponent_id_fkey(id, name, email),
      ppmp:ppmp!lasa_rows_ppmp_version_id_fkey(id, ppmp_number, project_title, status),
      created_by_user:users!lasa_rows_created_by_fkey(id, name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch LASA row: ${error.message}`);
  }

  return data as LasaRowWithRelations;
}

/**
 * Create LASA row from approved PPMP (auto-called on PPMP approval)
 */
export async function createLasaRowFromPPMP(ppmp: PPMP): Promise<LasaRow> {
  // Get division_id from PPMP
  const divisionId = String(ppmp.division_id);

  // Get office_id from PPMP (if exists)
  const officeId = ppmp.office_id ? String(ppmp.office_id) : null;

  // Create PPMP_PROJECT LASA row
  const lasaData = {
    division_id: parseInt(divisionId),
    fiscal_year: ppmp.fiscal_year,
    row_type: "PPMP_PROJECT" as LasaRowType,
    office_id: officeId ? parseInt(officeId) : null,
    project_title: ppmp.project_title,
    fund_source: ppmp.source_of_funds,
    planned_amount: ppmp.total_budget_amount,
    ppmp_version_id: parseInt(ppmp.id),
    is_locked: true, // PPMP_PROJECT rows are always locked
    created_by: ppmp.approved_by
      ? parseInt(String(ppmp.approved_by))
      : parseInt(String(ppmp.submitted_by)),
  };

  const { data: lasaRow, error } = await supabase
    .from("lasa_rows")
    .insert([lasaData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create LASA row from PPMP: ${error.message}`);
  }

  return lasaRow as LasaRow;
}

/**
 * Get LASA rows for PPMP creation visibility
 * Returns MANUAL rows where the user is the proponent
 */
export async function getLasaRowsForPPMPCreation(
  proponentId: string
): Promise<LasaRowWithRelations[]> {
  const { data, error } = await supabase
    .from("lasa_rows")
    .select(
      `
      *,
      office:offices(id, name, code),
      proponent:users!lasa_rows_proponent_id_fkey(id, name, email)
    `
    )
    .eq("row_type", "MANUAL")
    .eq("proponent_id", parseInt(proponentId))
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch LASA rows for PPMP creation: ${error.message}`
    );
  }

  return (data || []) as LasaRowWithRelations[];
}
