/**
 * Workflow Types
 * Types for approval workflow engine
 */

export type WorkflowStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";
export type ApprovalAction =
  | "approve"
  | "reject"
  | "return"
  | "forward"
  | "cancel";
export type StepStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface WorkflowStep {
  stepNumber: number;
  roleCode: string;
  userId?: string | null;
  status: StepStatus;
  action?: ApprovalAction | null;
  remarks?: string;
  actedBy?: string | null;
  actedAt?: string | null;
  dueDate?: string | null;
}

export interface WorkflowConfig {
  workflowType: string;
  steps: WorkflowStep[];
  allowParallel?: boolean; // For BAC members
  conditionalRouting?: {
    condition: string; // e.g., "amount > 500000"
    routeTo: string; // role code
  }[];
}

export interface WorkflowState {
  workflowId: string;
  entityType: string;
  entityId: string;
  workflowType: string;
  currentStage: number;
  totalStages: number;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string | null;
}

export interface ApprovalRequest {
  workflowId: string;
  stepId: string;
  action: ApprovalAction;
  remarks: string;
  userId: string;
}
