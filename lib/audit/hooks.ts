/**
 * React Hooks for Audit Logging
 * Client-side hooks for audit logging (calls server actions)
 */

"use client";

import { useCallback } from "react";
import { logAudit, logCreate, logUpdate, logDelete, logApprove, logReject, logReturn } from "./logger";
import { AuditLogEntry } from "./types";

/**
 * Hook to get audit logging functions
 */
export function useAuditLogger() {
  const log = useCallback(async (entry: AuditLogEntry) => {
    return logAudit(entry);
  }, []);

  const logCreateAction = useCallback(
    async (
      entityType: string,
      entityId: string,
      newValue: Record<string, any>,
      remarks?: string
    ) => {
      return logCreate(entityType, entityId, newValue, remarks);
    },
    []
  );

  const logUpdateAction = useCallback(
    async (
      entityType: string,
      entityId: string,
      oldValue: Record<string, any>,
      newValue: Record<string, any>,
      changes?: Record<string, { old: any; new: any }>,
      remarks?: string
    ) => {
      return logUpdate(entityType, entityId, oldValue, newValue, changes, remarks);
    },
    []
  );

  const logDeleteAction = useCallback(
    async (
      entityType: string,
      entityId: string,
      oldValue: Record<string, any>,
      remarks?: string
    ) => {
      return logDelete(entityType, entityId, oldValue, remarks);
    },
    []
  );

  const logApproveAction = useCallback(
    async (entityType: string, entityId: string, remarks?: string) => {
      return logApprove(entityType, entityId, remarks);
    },
    []
  );

  const logRejectAction = useCallback(
    async (entityType: string, entityId: string, remarks: string) => {
      return logReject(entityType, entityId, remarks);
    },
    []
  );

  const logReturnAction = useCallback(
    async (entityType: string, entityId: string, remarks: string) => {
      return logReturn(entityType, entityId, remarks);
    },
    []
  );

  return {
    log,
    logCreate: logCreateAction,
    logUpdate: logUpdateAction,
    logDelete: logDeleteAction,
    logApprove: logApproveAction,
    logReject: logRejectAction,
    logReturn: logReturnAction,
  };
}
