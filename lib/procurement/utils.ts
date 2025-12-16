/**
 * Procurement Utility Functions
 */

import { supabase } from "@/lib/supabase/client";

/**
 * Generate proposal number
 */
export async function generateProposalNumber(
  type: "PPMP" | "APP",
  fiscalYear: number
): Promise<string> {
  // Call the database function
  const { data, error } = await supabase.rpc("generate_proposal_number", {
    p_type: type,
    p_fiscal_year: fiscalYear,
  });

  if (error) {
    // Fallback: manual generation
    const { data: existing } = await supabase
      .from("procurement_proposals")
      .select("proposal_number")
      .like("proposal_number", `${type}-${fiscalYear}-%`)
      .order("proposal_number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (existing && existing.length > 0) {
      const lastNumber = existing[0].proposal_number;
      const match = lastNumber.match(/\d+$/);
      if (match) {
        seq = parseInt(match[0]) + 1;
      }
    }

    return `${type}-${fiscalYear}-${seq.toString().padStart(4, "0")}`;
  }

  return data;
}

/**
 * Generate PR number
 */
export async function generatePRNumber(fiscalYear: number): Promise<string> {
  const { data, error } = await supabase.rpc("generate_pr_number", {
    p_fiscal_year: fiscalYear,
  });

  if (error) {
    // Fallback
    const { data: existing } = await supabase
      .from("purchase_requests")
      .select("pr_number")
      .like("pr_number", `PR-${fiscalYear}-%`)
      .order("pr_number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (existing && existing.length > 0) {
      const lastNumber = existing[0].pr_number;
      const match = lastNumber.match(/\d+$/);
      if (match) {
        seq = parseInt(match[0]) + 1;
      }
    }

    return `PR-${fiscalYear}-${seq.toString().padStart(4, "0")}`;
  }

  return data;
}

/**
 * Generate PO number
 */
export async function generatePONumber(fiscalYear: number): Promise<string> {
  const { data, error } = await supabase.rpc("generate_po_number", {
    p_fiscal_year: fiscalYear,
  });

  if (error) {
    // Fallback
    const { data: existing } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .like("po_number", `PO-${fiscalYear}-%`)
      .order("po_number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (existing && existing.length > 0) {
      const lastNumber = existing[0].po_number;
      const match = lastNumber.match(/\d+$/);
      if (match) {
        seq = parseInt(match[0]) + 1;
      }
    }

    return `PO-${fiscalYear}-${seq.toString().padStart(4, "0")}`;
  }

  return data;
}
