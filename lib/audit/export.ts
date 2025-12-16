/**
 * Audit Log Export Functions
 * Export audit logs for COA compliance
 */

"use server";

import { getSupabaseClient } from "@/lib/supabase/server";
import { AuditLogQuery, AuditLogExport } from "./types";

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(query: AuditLogQuery) {
  const supabase = await getSupabaseClient();

  let queryBuilder = supabase
    .from("audit_logs")
    .select(
      `
      *,
      user:users (
        id,
        name,
        email
      )
    `
    )
    .order("created_at", { ascending: false });

  if (query.userId) {
    queryBuilder = queryBuilder.eq("user_id", query.userId);
  }

  if (query.actionType) {
    queryBuilder = queryBuilder.eq("action_type", query.actionType);
  }

  if (query.entityType) {
    queryBuilder = queryBuilder.eq("entity_type", query.entityType);
  }

  if (query.entityId) {
    queryBuilder = queryBuilder.eq("entity_id", query.entityId);
  }

  if (query.startDate) {
    queryBuilder = queryBuilder.gte("created_at", query.startDate.toISOString());
  }

  if (query.endDate) {
    queryBuilder = queryBuilder.lte("created_at", query.endDate.toISOString());
  }

  if (query.limit) {
    queryBuilder = queryBuilder.limit(query.limit);
  }

  if (query.offset) {
    queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 100) - 1);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }

  return data;
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCSV(query: AuditLogQuery): Promise<string> {
  const logs = await queryAuditLogs({ ...query, limit: 10000 });

  const headers = [
    "ID",
    "Date",
    "User",
    "Email",
    "Action Type",
    "Entity Type",
    "Entity ID",
    "Remarks",
    "IP Address",
  ];

  const rows = logs.map((log: any) => [
    log.id,
    new Date(log.created_at).toLocaleString(),
    log.user?.name || "Unknown",
    log.user?.email || "Unknown",
    log.action_type,
    log.entity_type,
    log.entity_id,
    log.remarks || "",
    log.ip_address || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Export audit logs to Excel format (returns CSV for now, can be enhanced with xlsx library)
 */
export async function exportAuditLogsToExcel(query: AuditLogQuery): Promise<string> {
  // For now, return CSV format
  // Can be enhanced to use xlsx library for actual Excel format
  return exportAuditLogsToCSV(query);
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(query: AuditLogQuery) {
  const logs = await queryAuditLogs(query);

  const stats = {
    total: logs.length,
    byActionType: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
    byUser: {} as Record<string, number>,
  };

  logs.forEach((log: any) => {
    // Count by action type
    stats.byActionType[log.action_type] = (stats.byActionType[log.action_type] || 0) + 1;

    // Count by entity type
    stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;

    // Count by user
    const userName = log.user?.name || "Unknown";
    stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;
  });

  return stats;
}
