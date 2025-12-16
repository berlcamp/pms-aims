/**
 * Workflow React Hooks
 * Client-side hooks for workflow operations
 */

"use client";

import { useCallback, useState } from "react";
import {
  getPendingApprovals,
  getWorkflowState,
  processApproval,
} from "./engine";
import { ApprovalRequest, WorkflowState } from "./types";

/**
 * Hook to process an approval action
 */
export function useProcessApproval() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(
    async (request: ApprovalRequest): Promise<WorkflowState | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await processApproval(request);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { approve, isLoading, error };
}

/**
 * Hook to get workflow state
 */
export function useWorkflowState() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getState = useCallback(
    async (
      entityType: string,
      entityId: string
    ): Promise<WorkflowState | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getWorkflowState(entityType, entityId);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { getState, isLoading, error };
}

/**
 * Hook to get pending approvals
 */
export function usePendingApprovals() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);

  const loadApprovals = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPendingApprovals(userId);
      setApprovals(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { loadApprovals, approvals, isLoading, error };
}
