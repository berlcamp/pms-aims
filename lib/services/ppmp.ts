/* eslint-disable @typescript-eslint/no-explicit-any */
import { createLasaRowFromPPMP } from "@/lib/services/lasa";
import { supabase } from "@/lib/supabase/client";
import {
  PPMP,
  PPMPStatus,
  PPMPType,
  PPMPWithRelations,
} from "@/types/database";

/**
 * Generate PPMP number using database function
 */
export async function generatePPMPNumber(
  officeId: string | null,
  schoolId: string | null,
  fiscalYear: number
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_ppmp_number", {
    p_office_id: officeId ? parseInt(officeId) : null,
    p_school_id: schoolId ? parseInt(schoolId) : null,
    p_fiscal_year: fiscalYear,
  });

  if (error) {
    throw new Error(`Failed to generate PPMP number: ${error.message}`);
  }

  return data || `No. 1`;
}

/**
 * Create a new PPMP with items, lots, and attachments
 */
export async function createPPMP(data: {
  fiscalYear: number;
  ppmpType?: PPMPType;
  officeId?: string | null;
  schoolId?: string | null;
  projectTitle: string;
  generalDescription: string;
  objective: string;
  implementationMode: string;
  projectType: string;
  isGeneralSupportServices?: boolean;
  suggestedModeOfProcurement?: string;
  procurementStartMonth?: number;
  procurementStartYear?: number;
  procurementEndMonth?: number;
  procurementEndYear?: number;
  deliveryStartMonth?: number;
  deliveryStartYear?: number;
  deliveryEndMonth?: number;
  deliveryEndYear?: number;
  sourceOfFunds: string;
  totalBudgetAmount: number;
  estimatedBudget?: number;
  authorizedBudget?: number;
  budgetOverrideJustification?: string;
  remarks?: string;
  submittedBy: string;
  lots?: Array<{ lotName: string; description?: string }>;
  items: Array<{
    lotId?: string | null;
    itemDescription: string;
    unitOfMeasure: string;
    quantity: number;
    sizeSpecification?: string;
    estimatedUnitCost: number;
    estimatedTotalCost: number;
  }>;
}): Promise<PPMP> {
  // Generate PPMP number
  const ppmpNumber = await generatePPMPNumber(
    data.officeId || null,
    data.schoolId || null,
    data.fiscalYear
  );

  // Get division_id from office or school
  let divisionId: string;
  if (data.officeId) {
    const { data: office } = await supabase
      .from("offices")
      .select("division_id")
      .eq("id", data.officeId)
      .single();
    if (!office) throw new Error("Office not found");
    divisionId = String(office.division_id);
  } else if (data.schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .select("division_id")
      .eq("id", data.schoolId)
      .single();
    if (!school) throw new Error("School not found");
    divisionId = String(school.division_id);
  } else {
    throw new Error("Either officeId or schoolId must be provided");
  }

  // Create PPMP
  const ppmpData = {
    ppmp_number: ppmpNumber,
    fiscal_year: data.fiscalYear,
    ppmp_type: data.ppmpType || "INDICATIVE",
    version: 1,
    division_id: parseInt(divisionId),
    office_id: data.officeId ? parseInt(data.officeId) : null,
    school_id: data.schoolId ? parseInt(data.schoolId) : null,
    project_title: data.projectTitle,
    general_description: data.generalDescription,
    objective: data.objective,
    implementation_mode: data.implementationMode,
    project_type: data.projectType,
    is_general_support_services: data.isGeneralSupportServices || false,
    suggested_mode_of_procurement: data.suggestedModeOfProcurement || null,
    procurement_start_month: data.procurementStartMonth || null,
    procurement_start_year: data.procurementStartYear || null,
    procurement_end_month: data.procurementEndMonth || null,
    procurement_end_year: data.procurementEndYear || null,
    delivery_start_month: data.deliveryStartMonth || null,
    delivery_start_year: data.deliveryStartYear || null,
    delivery_end_month: data.deliveryEndMonth || null,
    delivery_end_year: data.deliveryEndYear || null,
    source_of_funds: data.sourceOfFunds,
    total_budget_amount: data.totalBudgetAmount,
    estimated_budget: data.estimatedBudget || null,
    authorized_budget: data.authorizedBudget || null,
    budget_override_justification: data.budgetOverrideJustification || null,
    status: "DRAFT" as PPMPStatus,
    is_locked: false,
    submitted_by: parseInt(data.submittedBy),
    remarks: data.remarks || null,
  };

  const { data: ppmp, error: ppmpError } = await supabase
    .from("ppmp")
    .insert([ppmpData])
    .select()
    .single();

  if (ppmpError) {
    throw new Error(`Failed to create PPMP: ${ppmpError.message}`);
  }

  const ppmpId = String(ppmp.id);

  // Create lots if provided
  if (data.lots && data.lots.length > 0) {
    const lotsData = data.lots.map((lot, index) => ({
      ppmp_id: parseInt(ppmpId),
      lot_number: index + 1,
      lot_name: lot.lotName,
      description: lot.description || null,
      order_index: index,
    }));

    const { error: lotsError } = await supabase
      .from("ppmp_lots")
      .insert(lotsData);

    if (lotsError) {
      throw new Error(`Failed to create lots: ${lotsError.message}`);
    }
  }

  // Get lot IDs for items
  const { data: lots } = await supabase
    .from("ppmp_lots")
    .select("id, lot_number")
    .eq("ppmp_id", ppmpId)
    .order("lot_number");

  // Create items
  const itemsData = data.items.map((item, index) => {
    let lotId: number | null = null;
    if (item.lotId) {
      lotId = parseInt(item.lotId);
    } else if (data.lots && data.lots.length > 0) {
      // If item has lotId but it's a string reference, find it
      const lotNumber = parseInt(item.lotId || "0");
      if (lotNumber > 0) {
        const foundLot = lots?.find((l) => l.lot_number === lotNumber);
        if (foundLot) lotId = parseInt(String(foundLot.id));
      }
    }

    return {
      ppmp_id: parseInt(ppmpId),
      lot_id: lotId,
      item_description: item.itemDescription,
      unit_of_measure: item.unitOfMeasure,
      quantity: item.quantity,
      size_specification: item.sizeSpecification || null,
      estimated_unit_cost: item.estimatedUnitCost,
      estimated_total_cost: item.estimatedTotalCost,
      order_index: index,
    };
  });

  const { error: itemsError } = await supabase
    .from("ppmp_items")
    .insert(itemsData);

  if (itemsError) {
    throw new Error(`Failed to create items: ${itemsError.message}`);
  }

  return ppmp as PPMP;
}

/**
 * Update PPMP (only if DRAFT and not locked)
 */
export async function updatePPMP(
  id: string,
  data: Partial<PPMP> & {
    lots?: Array<{ id?: string; lotName: string; description?: string }>;
    items?: Array<{
      id?: string;
      lotId?: string | null;
      itemDescription: string;
      unitOfMeasure: string;
      quantity: number;
      sizeSpecification?: string;
      estimatedUnitCost: number;
      estimatedTotalCost: number;
    }>;
  }
): Promise<PPMP> {
  // Check if PPMP can be edited
  const { data: existingPPMP } = await supabase
    .from("ppmp")
    .select("status, is_locked")
    .eq("id", id)
    .single();

  if (!existingPPMP) {
    throw new Error("PPMP not found");
  }

  if (existingPPMP.status !== "DRAFT") {
    throw new Error("Only DRAFT PPMPs can be edited");
  }

  if (existingPPMP.is_locked) {
    throw new Error("PPMP is locked and cannot be edited");
  }

  // Update PPMP
  const updateData: any = { ...data };
  delete updateData.lots;
  delete updateData.items;

  const { data: ppmp, error: ppmpError } = await supabase
    .from("ppmp")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (ppmpError) {
    throw new Error(`Failed to update PPMP: ${ppmpError.message}`);
  }

  // Update lots if provided
  if (data.lots) {
    // Delete existing lots
    await supabase.from("ppmp_lots").delete().eq("ppmp_id", id);

    // Insert new lots
    const lotsData = data.lots.map((lot, index) => ({
      ppmp_id: parseInt(id),
      lot_number: index + 1,
      lot_name: lot.lotName,
      description: lot.description || null,
      order_index: index,
    }));

    await supabase.from("ppmp_lots").insert(lotsData);
  }

  // Update items if provided
  if (data.items) {
    // Delete existing items
    await supabase.from("ppmp_items").delete().eq("ppmp_id", id);

    // Get lot IDs
    const { data: lots } = await supabase
      .from("ppmp_lots")
      .select("id, lot_number")
      .eq("ppmp_id", id)
      .order("lot_number");

    const itemsData = data.items.map((item, index) => {
      let lotId: number | null = null;
      if (item.lotId) {
        lotId = parseInt(item.lotId);
      }

      return {
        ppmp_id: parseInt(id),
        lot_id: lotId,
        item_description: item.itemDescription,
        unit_of_measure: item.unitOfMeasure,
        quantity: item.quantity,
        size_specification: item.sizeSpecification || null,
        estimated_unit_cost: item.estimatedUnitCost,
        estimated_total_cost: item.estimatedTotalCost,
        order_index: index,
      };
    });

    await supabase.from("ppmp_items").insert(itemsData);
  }

  return ppmp as PPMP;
}

/**
 * Submit PPMP for approval
 */
export async function submitPPMP(id: string): Promise<PPMP> {
  // Check if Market Scoping Checklist exists
  const { data: attachments } = await supabase
    .from("ppmp_attachments")
    .select("id")
    .eq("ppmp_id", id)
    .eq("document_type", "MARKET_SCOPING_CHECKLIST")
    .eq("is_required", true);

  if (!attachments || attachments.length === 0) {
    throw new Error("Market Scoping Checklist is required for submission");
  }

  const { data: ppmp, error } = await supabase
    .from("ppmp")
    .update({
      status: "FOR_APPROVAL",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit PPMP: ${error.message}`);
  }

  // Create approval history entry
  await supabase.from("ppmp_approval_history").insert({
    ppmp_id: parseInt(id),
    action: "submit",
    acted_by: parseInt(ppmp.submitted_by || "0"),
    previous_status: "DRAFT",
    new_status: "FOR_APPROVAL",
  });

  return ppmp as PPMP;
}

/**
 * Approve PPMP (Office Head)
 */
export async function approvePPMP(
  id: string,
  approverId: string,
  remarks?: string
): Promise<PPMP> {
  // Get current PPMP
  const { data: currentPPMP } = await supabase
    .from("ppmp")
    .select("status, submitted_by")
    .eq("id", id)
    .single();

  if (!currentPPMP) {
    throw new Error("PPMP not found");
  }

  if (currentPPMP.status !== "FOR_APPROVAL") {
    throw new Error("PPMP is not pending approval");
  }

  // Prevent self-approval
  if (currentPPMP.submitted_by === approverId) {
    throw new Error("Cannot approve your own PPMP");
  }

  const { data: ppmp, error } = await supabase
    .from("ppmp")
    .update({
      status: "APPROVED_BY_OFFICE",
      approved_by: parseInt(approverId),
      approved_at: new Date().toISOString(),
      is_locked: true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve PPMP: ${error.message}`);
  }

  // Create approval history entry
  await supabase.from("ppmp_approval_history").insert({
    ppmp_id: parseInt(id),
    action: "approve",
    acted_by: parseInt(approverId),
    remarks: remarks || null,
    previous_status: currentPPMP.status,
    new_status: "APPROVED_BY_OFFICE",
  });

  // Auto-create LASA row from approved PPMP
  try {
    await createLasaRowFromPPMP(ppmp as PPMP);
  } catch (lasaError) {
    // Log error but don't fail the approval
    console.error("Failed to create LASA row from PPMP:", lasaError);
    // Optionally, you could throw here if LASA creation is critical
    // throw new Error(`PPMP approved but failed to create LASA row: ${lasaError}`);
  }

  return ppmp as PPMP;
}

/**
 * Return PPMP for revision
 */
export async function returnPPMP(
  id: string,
  approverId: string,
  remarks: string
): Promise<PPMP> {
  if (!remarks || remarks.trim().length === 0) {
    throw new Error("Remarks are required when returning PPMP for revision");
  }

  const { data: currentPPMP } = await supabase
    .from("ppmp")
    .select("status")
    .eq("id", id)
    .single();

  if (!currentPPMP) {
    throw new Error("PPMP not found");
  }

  if (currentPPMP.status !== "FOR_APPROVAL") {
    throw new Error("PPMP is not pending approval");
  }

  const { data: ppmp, error } = await supabase
    .from("ppmp")
    .update({
      status: "RETURNED_FOR_REVISION",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to return PPMP: ${error.message}`);
  }

  // Create approval history entry
  await supabase.from("ppmp_approval_history").insert({
    ppmp_id: parseInt(id),
    action: "return",
    acted_by: parseInt(approverId),
    remarks: remarks,
    previous_status: currentPPMP.status,
    new_status: "RETURNED_FOR_REVISION",
  });

  return ppmp as PPMP;
}

/**
 * Mark PPMP as reviewed (Procurement)
 */
export async function markAsReviewed(
  id: string,
  reviewerId: string
): Promise<PPMP> {
  const { data: currentPPMP } = await supabase
    .from("ppmp")
    .select("status")
    .eq("id", id)
    .single();

  if (!currentPPMP) {
    throw new Error("PPMP not found");
  }

  if (currentPPMP.status !== "APPROVED_BY_OFFICE") {
    throw new Error("PPMP must be approved by office before review");
  }

  const { data: ppmp, error } = await supabase
    .from("ppmp")
    .update({
      status: "SUBMITTED_TO_PROCUREMENT",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark PPMP as reviewed: ${error.message}`);
  }

  // Create approval history entry
  await supabase.from("ppmp_approval_history").insert({
    ppmp_id: parseInt(id),
    action: "review",
    acted_by: parseInt(reviewerId),
    previous_status: currentPPMP.status,
    new_status: "SUBMITTED_TO_PROCUREMENT",
  });

  return ppmp as PPMP;
}

/**
 * Create new version of PPMP
 */
export async function createNewVersion(
  parentPPMPId: string,
  basisOfRevision: string,
  submittedBy: string
): Promise<PPMP> {
  if (!basisOfRevision || basisOfRevision.trim().length === 0) {
    throw new Error("Basis of revision is required for new versions");
  }

  // Get parent PPMP with relations
  const parentPPMP = await getPPMPWithRelations(parentPPMPId);

  if (!parentPPMP) {
    throw new Error("Parent PPMP not found");
  }

  // Generate new PPMP number (increment version)
  const newVersion = parentPPMP.version + 1;
  const ppmpNumber = await generatePPMPNumber(
    parentPPMP.office_id || null,
    parentPPMP.school_id || null,
    parentPPMP.fiscal_year
  );

  // Create new PPMP
  const newPPMPData = {
    ppmp_number: ppmpNumber,
    fiscal_year: parentPPMP.fiscal_year,
    ppmp_type: parentPPMP.ppmp_type,
    version: newVersion,
    parent_ppmp_id: parseInt(parentPPMPId),
    basis_of_revision: basisOfRevision,
    division_id: parseInt(parentPPMP.division_id),
    office_id: parentPPMP.office_id ? parseInt(parentPPMP.office_id) : null,
    school_id: parentPPMP.school_id ? parseInt(parentPPMP.school_id) : null,
    project_title: parentPPMP.project_title,
    general_description: parentPPMP.general_description,
    objective: parentPPMP.objective,
    implementation_mode: parentPPMP.implementation_mode,
    project_type: parentPPMP.project_type,
    is_general_support_services: parentPPMP.is_general_support_services,
    suggested_mode_of_procurement:
      parentPPMP.suggested_mode_of_procurement || null,
    procurement_start_month: parentPPMP.procurement_start_month || null,
    procurement_start_year: parentPPMP.procurement_start_year || null,
    procurement_end_month: parentPPMP.procurement_end_month || null,
    procurement_end_year: parentPPMP.procurement_end_year || null,
    delivery_start_month: parentPPMP.delivery_start_month || null,
    delivery_start_year: parentPPMP.delivery_start_year || null,
    delivery_end_month: parentPPMP.delivery_end_month || null,
    delivery_end_year: parentPPMP.delivery_end_year || null,
    source_of_funds: parentPPMP.source_of_funds,
    total_budget_amount: parentPPMP.total_budget_amount,
    estimated_budget: parentPPMP.estimated_budget || null,
    authorized_budget: parentPPMP.authorized_budget || null,
    status: "DRAFT" as PPMPStatus,
    is_locked: false,
    submitted_by: parseInt(submittedBy),
  };

  const { data: newPPMP, error: ppmpError } = await supabase
    .from("ppmp")
    .insert([newPPMPData])
    .select()
    .single();

  if (ppmpError) {
    throw new Error(`Failed to create new version: ${ppmpError.message}`);
  }

  const newPPMPId = String(newPPMP.id);

  // Copy lots
  if (parentPPMP.lots && parentPPMP.lots.length > 0) {
    const lotsData = parentPPMP.lots.map((lot, index) => ({
      ppmp_id: parseInt(newPPMPId),
      lot_number: lot.lot_number,
      lot_name: lot.lot_name,
      description: lot.description || null,
      order_index: lot.order_index,
    }));

    await supabase.from("ppmp_lots").insert(lotsData);
  }

  // Copy items
  if (parentPPMP.items && parentPPMP.items.length > 0) {
    // Get new lot IDs
    const { data: newLots } = await supabase
      .from("ppmp_lots")
      .select("id, lot_number")
      .eq("ppmp_id", newPPMPId)
      .order("lot_number");

    const lotMap = new Map(
      parentPPMP.lots?.map((lot, index) => [
        lot.lot_number,
        newLots?.find((nl) => nl.lot_number === lot.lot_number)?.id,
      ]) || []
    );

    const itemsData = parentPPMP.items.map((item, index) => {
      let lotId: number | null = null;
      if (item.lot_id) {
        const parentLot = parentPPMP.lots?.find(
          (l) => String(l.id) === item.lot_id
        );
        if (parentLot) {
          const newLotId = lotMap.get(parentLot.lot_number);
          if (newLotId) lotId = parseInt(String(newLotId));
        }
      }

      return {
        ppmp_id: parseInt(newPPMPId),
        lot_id: lotId,
        item_description: item.item_description,
        unit_of_measure: item.unit_of_measure,
        quantity: item.quantity,
        size_specification: item.size_specification || null,
        estimated_unit_cost: item.estimated_unit_cost,
        estimated_total_cost: item.estimated_total_cost,
        order_index: item.order_index,
      };
    });

    await supabase.from("ppmp_items").insert(itemsData);
  }

  return newPPMP as PPMP;
}

/**
 * Get PPMP with all relations
 */
export async function getPPMPWithRelations(
  id: string
): Promise<PPMPWithRelations | null> {
  const { data: ppmp, error } = await supabase
    .from("ppmp")
    .select(
      `
      *,
      lots:ppmp_lots(*),
      items:ppmp_items(*),
      attachments:ppmp_attachments(*),
      approval_history:ppmp_approval_history(*),
      office:offices(id, name, code),
      school:schools(id, name, code),
      submitted_by_user:users!ppmp_submitted_by_fkey(id, name, email),
      approved_by_user:users!ppmp_approved_by_fkey(id, name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch PPMP: ${error.message}`);
  }

  return ppmp as PPMPWithRelations;
}

/**
 * Check if user can edit PPMP
 */
export async function canEditPPMP(
  ppmp: PPMP,
  userId: string
): Promise<boolean> {
  if (ppmp.status !== "DRAFT") {
    return false;
  }

  if (ppmp.is_locked) {
    return false;
  }

  // User must be the submitter or have appropriate role
  return String(ppmp.submitted_by) === userId;
}

/**
 * Check if user can approve PPMP (prevent self-approval)
 */
export async function canApprovePPMP(
  ppmp: PPMP,
  userId: string
): Promise<boolean> {
  if (ppmp.status !== "FOR_APPROVAL") {
    return false;
  }

  // Prevent self-approval
  if (String(ppmp.submitted_by) === userId) {
    return false;
  }

  // Additional role checks would go here
  return true;
}
