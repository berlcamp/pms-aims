/**
 * Audit Logging Service
 * Provides functions to log audit events for COA compliance
 */

"use server";

import { getSupabaseClient } from "@/lib/supabase/server";
import { AuditLogEntry } from "./types";
import { headers } from "next/headers";

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    
    // Get current user from session
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      console.warn("Cannot log audit: No authenticated user");
      return null;
    }

    // Get system user ID
    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (!systemUser) {
      console.warn("Cannot log audit: System user not found");
      return null;
    }

    // Get IP address and user agent from headers
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Insert audit log
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: systemUser.id,
        action_type: entry.actionType,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_value: entry.oldValue || null,
        new_value: entry.newValue || null,
        changes: entry.changes || null,
        remarks: entry.remarks || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log audit:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Error in logAudit:", error);
    return null;
  }
}

/**
 * Log a create action
 */
export async function logCreate(
  entityType: string,
  entityId: string,
  newValue: Record<string, any>,
  remarks?: string
): Promise<string | null> {
  return logAudit({
    userId: "", // Will be set by logAudit
    actionType: "create",
    entityType,
    entityId,
    newValue,
    remarks: remarks || `Created ${entityType}`,
  });
}

/**
 * Log an update action
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  oldValue: Record<string, any>,
  newValue: Record<string, any>,
  changes?: Record<string, { old: any; new: any }>,
  remarks?: string
): Promise<string | null> {
  return logAudit({
    userId: "",
    actionType: "update",
    entityType,
    entityId,
    oldValue,
    newValue,
    changes,
    remarks: remarks || `Updated ${entityType}`,
  });
}

/**
 * Log a delete action
 */
export async function logDelete(
  entityType: string,
  entityId: string,
  oldValue: Record<string, any>,
  remarks?: string
): Promise<string | null> {
  return logAudit({
    userId: "",
    actionType: "delete",
    entityType,
    entityId,
    oldValue,
    remarks: remarks || `Deleted ${entityType}`,
  });
}

/**
 * Log an approve action
 */
export async function logApprove(
  entityType: string,
  entityId: string,
  remarks?: string
): Promise<string | null> {
  return logAudit({
    userId: "",
    actionType: "approve",
    entityType,
    entityId,
    remarks: remarks || `Approved ${entityType}`,
  });
}

/**
 * Log a reject action
 */
export async function logReject(
  entityType: string,
  entityId: string,
  remarks: string
): Promise<string | null> {
  return logAudit({
    userId: "",
    actionType: "reject",
    entityType,
    entityId,
    remarks,
  });
}

/**
 * Log a return action
 */
export async function logReturn(
  entityType: string,
  entityId: string,
  remarks: string
): Promise<string | null> {
  return logAudit({
    userId: "",
    actionType: "return",
    entityType,
    entityId,
    remarks,
  });
}
