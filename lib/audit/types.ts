/**
 * Audit Trail Types
 * COA-compliant audit logging system
 */

import { AuditActionType } from "@/types/database";

export interface AuditLogEntry {
  userId: string;
  actionType: AuditActionType;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  changes?: Record<string, { old: any; new: any }> | null;
  remarks?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  userId?: string;
  actionType?: AuditActionType;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogExport {
  format: "csv" | "excel" | "pdf";
  filters: AuditLogQuery;
}
