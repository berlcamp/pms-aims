/**
 * Approval Workflow Engine
 * State machine for approval workflows
 */

"use server";

import { getSupabaseClient } from "@/lib/supabase/server";
import {
  ApprovalAction,
  ApprovalRequest,
  StepStatus,
  WorkflowState,
  WorkflowStatus,
} from "./types";

/**
 * Initialize a workflow
 */
export async function initializeWorkflow(
  entityType: string,
  entityId: string,
  workflowType: string,
  steps: Array<{
    stepNumber: number;
    roleCode: string;
    userId?: string | null;
  }>,
  initiatedBy: string
): Promise<string> {
  const supabase = await getSupabaseClient();

  // Create workflow
  const { data: workflow, error: workflowError } = await supabase
    .from("approval_workflows")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      workflow_type: workflowType,
      current_stage: 1,
      total_stages: steps.length,
      status: "pending",
      initiated_by: initiatedBy,
    })
    .select("id")
    .single();

  if (workflowError || !workflow) {
    throw new Error(`Failed to initialize workflow: ${workflowError?.message}`);
  }

  // Create workflow steps
  const stepInserts = steps.map((step) => ({
    workflow_id: workflow.id,
    step_number: step.stepNumber,
    role_code: step.roleCode,
    user_id: step.userId || null,
    status: step.stepNumber === 1 ? "pending" : "pending",
  }));

  const { error: stepsError } = await supabase
    .from("approval_steps")
    .insert(stepInserts);

  if (stepsError) {
    throw new Error(`Failed to create workflow steps: ${stepsError.message}`);
  }

  return workflow.id;
}

/**
 * Process an approval action
 */
export async function processApproval(
  request: ApprovalRequest
): Promise<WorkflowState> {
  const supabase = await getSupabaseClient();

  // Get workflow and step
  const { data: step, error: stepError } = await supabase
    .from("approval_steps")
    .select(
      `
      *,
      workflow:approval_workflows (*)
    `
    )
    .eq("id", request.stepId)
    .single();

  if (stepError || !step) {
    throw new Error(`Step not found: ${stepError?.message}`);
  }

  const workflow = step.workflow as any;

  // Validate user can act on this step
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role:roles (code)")
    .eq("user_id", request.userId)
    .eq("is_active", true);

  const userRoleCodes = userRoles?.map((ur: any) => ur.role?.code) || [];
  const stepRoleCode = step.role_code;

  if (!userRoleCodes.includes(stepRoleCode)) {
    throw new Error("User does not have permission to act on this step");
  }

  // Update step
  const newStepStatus: StepStatus =
    request.action === "approve"
      ? "approved"
      : request.action === "reject"
      ? "rejected"
      : request.action === "return"
      ? "returned"
      : "cancelled";

  const { error: updateStepError } = await supabase
    .from("approval_steps")
    .update({
      status: newStepStatus,
      action: request.action,
      remarks: request.remarks,
      acted_by: request.userId,
      acted_at: new Date().toISOString(),
    })
    .eq("id", request.stepId);

  if (updateStepError) {
    throw new Error(`Failed to update step: ${updateStepError.message}`);
  }

  // Log action
  await supabase.from("approval_action_logs").insert({
    step_id: request.stepId,
    workflow_id: workflow.id,
    action: request.action,
    remarks: request.remarks,
    acted_by: request.userId,
  });

  // Determine workflow status
  let workflowStatus: WorkflowStatus = "pending";
  let currentStage = workflow.current_stage;

  if (request.action === "reject" || request.action === "cancel") {
    workflowStatus = request.action === "reject" ? "rejected" : "cancelled";
  } else if (request.action === "return") {
    workflowStatus = "returned";
  } else if (request.action === "approve") {
    // Check if there are more steps
    const { data: nextSteps } = await supabase
      .from("approval_steps")
      .select("id, step_number")
      .eq("workflow_id", workflow.id)
      .eq("status", "pending")
      .gt("step_number", step.step_number)
      .order("step_number", { ascending: true })
      .limit(1);

    if (!nextSteps || nextSteps.length === 0) {
      // All steps approved
      workflowStatus = "approved";
      currentStage = workflow.total_stages;
    } else {
      // Move to next step
      currentStage = nextSteps[0].step_number;
    }
  }

  // Update workflow
  const { data: updatedWorkflow, error: updateWorkflowError } = await supabase
    .from("approval_workflows")
    .update({
      status: workflowStatus,
      current_stage: currentStage,
      completed_at:
        workflowStatus === "approved" || workflowStatus === "rejected"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", workflow.id)
    .select()
    .single();

  if (updateWorkflowError) {
    throw new Error(
      `Failed to update workflow: ${updateWorkflowError.message}`
    );
  }

  // Get all steps for return
  const { data: allSteps } = await supabase
    .from("approval_steps")
    .select("*")
    .eq("workflow_id", workflow.id)
    .order("step_number", { ascending: true });

  return {
    workflowId: workflow.id,
    entityType: workflow.entity_type,
    entityId: workflow.entity_id,
    workflowType: workflow.workflow_type,
    currentStage: currentStage,
    totalStages: workflow.total_stages,
    status: workflowStatus,
    steps:
      allSteps?.map((s) => ({
        stepNumber: s.step_number,
        roleCode: s.role_code,
        userId: s.user_id,
        status: s.status as StepStatus,
        action: s.action as ApprovalAction | undefined,
        remarks: s.remarks || undefined,
        actedBy: s.acted_by || undefined,
        actedAt: s.acted_at || undefined,
        dueDate: s.due_date || undefined,
      })) || [],
    initiatedBy: workflow.initiated_by,
    initiatedAt: workflow.initiated_at,
    completedAt: updatedWorkflow.completed_at || undefined,
  };
}

/**
 * Get workflow state
 */
export async function getWorkflowState(
  entityType: string,
  entityId: string
): Promise<WorkflowState | null> {
  const supabase = await getSupabaseClient();

  const { data: workflow, error } = await supabase
    .from("approval_workflows")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (error || !workflow) {
    return null;
  }

  const { data: steps } = await supabase
    .from("approval_steps")
    .select("*")
    .eq("workflow_id", workflow.id)
    .order("step_number", { ascending: true });

  return {
    workflowId: workflow.id,
    entityType: workflow.entity_type,
    entityId: workflow.entity_id,
    workflowType: workflow.workflow_type,
    currentStage: workflow.current_stage,
    totalStages: workflow.total_stages,
    status: workflow.status as WorkflowStatus,
    steps:
      steps?.map((s) => ({
        stepNumber: s.step_number,
        roleCode: s.role_code,
        userId: s.user_id,
        status: s.status as StepStatus,
        action: s.action as ApprovalAction | undefined,
        remarks: s.remarks || undefined,
        actedBy: s.acted_by || undefined,
        actedAt: s.acted_at || undefined,
        dueDate: s.due_date || undefined,
      })) || [],
    initiatedBy: workflow.initiated_by,
    initiatedAt: workflow.initiated_at,
    completedAt: workflow.completed_at || undefined,
  };
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId: string) {
  const supabase = await getSupabaseClient();

  // Get user's roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role:roles (code)")
    .eq("user_id", userId)
    .eq("is_active", true);

  const roleCodes = userRoles?.map((ur: any) => ur.role?.code) || [];

  if (roleCodes.length === 0) {
    return [];
  }

  // Get pending steps for user's roles
  const { data: steps } = await supabase
    .from("approval_steps")
    .select(
      `
      *,
      workflow:approval_workflows (
        *,
        entity_type,
        entity_id
      )
    `
    )
    .in("role_code", roleCodes)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return steps || [];
}
