/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Type Definitions for DepEd PMS & AIMS
 *
 * This file contains TypeScript interfaces for all database entities
 * in the Procurement Management System and Asset Inventory & Management System.
 *
 * Schema: assets
 */

// ============================================================================
// CORE ENTITIES - Multi-Tenant & User Management
// ============================================================================

export interface Division {
  id: string;
  code: string; // Division code (e.g., "DIV-001")
  name: string;
  region: string;
  province: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface School {
  id: string;
  division_id: string;
  code: string; // School code (e.g., "SCH-001")
  name: string;
  school_id?: string; // DepEd School ID
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Office {
  id: string;
  division_id: string;
  code: string; // Office code (e.g., "OFF-001")
  name: string;
  office_type: "division_office" | "school";
  school_id?: string | null;
  head_user_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  code: string; // e.g., "SDS", "SUPPLY_OFFICER", "BUDGET_OFFICER"
  name: string;
  description?: string;
  level: "division" | "school" | "both";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string; // e.g., "pms.pr.create", "pms.po.approve"
  name: string;
  description?: string;
  module: "pms" | "aims" | "system";
  resource: string; // e.g., "pr", "po", "proposal"
  action:
    | "create"
    | "read"
    | "update"
    | "delete"
    | "approve"
    | "reject"
    | "print";
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface User {
  id: string;
  user_id: string; // Supabase Auth user ID
  division_id?: string | null;
  school_id?: string | null;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  employee_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  division_id?: string | null;
  school_id?: string | null;
  assigned_at: string;
  assigned_by?: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// AUDIT TRAIL SYSTEM
// ============================================================================

export type AuditActionType =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "return"
  | "forward"
  | "cancel"
  | "print"
  | "export"
  | "login"
  | "logout";

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: AuditActionType;
  entity_type: string; // e.g., "procurement_proposal", "purchase_request"
  entity_id: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  changes?: Record<string, { old: any; new: any }> | null;
  ip_address?: string;
  user_agent?: string;
  remarks?: string;
  created_at: string;
}

// ============================================================================
// PROCUREMENT MANAGEMENT SYSTEM (PMS) ENTITIES
// ============================================================================

export type ProposalType = "PPMP" | "APP";
export type ProposalCategory = "goods" | "services" | "infrastructure";
export type ProposalLevel = "school" | "division";
export type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_evaluation"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface ProcurementProposal {
  id: string;
  proposal_number: string; // Auto-generated: PPMP-2025-001 or APP-2025-001
  type: ProposalType;
  category: ProposalCategory;
  level: ProposalLevel;
  division_id: string;
  school_id?: string | null;
  fiscal_year: number;
  quarter?: number | null; // For APP
  title: string;
  description?: string;
  total_amount: number;
  budget_source: string; // e.g., "GAA", "MOOE", "SDF"
  fund_code?: string;
  status: ProposalStatus;
  version: number;
  parent_proposal_id?: string | null; // For versioning
  change_reason?: string | null; // Required for new versions
  submitted_by: string;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  document_url?: string | null; // Uploaded PPMP/APP file
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  item_code?: string;
  item_name: string;
  description?: string;
  unit: string; // e.g., "unit", "lot", "set"
  quantity: number;
  unit_price: number;
  total_amount: number;
  quarter_1?: number | null;
  quarter_2?: number | null;
  quarter_3?: number | null;
  quarter_4?: number | null;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRE-PROCUREMENT EVALUATION
// ============================================================================

export type EvaluationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface PreProcurementEvaluation {
  id: string;
  proposal_id: string;
  evaluation_number: string; // EVAL-2025-001
  status: EvaluationStatus;
  current_stage: number; // 1=Supply Officer, 2=Budget, 3=Technical, 4=BAC
  supply_officer_reviewed: boolean;
  supply_officer_remarks?: string;
  supply_officer_reviewed_by?: string | null;
  supply_officer_reviewed_at?: string | null;
  budget_officer_reviewed: boolean;
  budget_officer_remarks?: string;
  budget_officer_reviewed_by?: string | null;
  budget_officer_reviewed_at?: string | null;
  technical_evaluator_reviewed: boolean;
  technical_evaluator_remarks?: string;
  technical_evaluator_reviewed_by?: string | null;
  technical_evaluator_reviewed_at?: string | null;
  bac_reviewed: boolean;
  bac_remarks?: string;
  bac_reviewed_by?: string | null;
  bac_reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROCUREMENT METHODS
// ============================================================================

export type ProcurementMethod =
  | "small_value_procurement"
  | "shopping"
  | "agency_to_agency"
  | "public_bidding"
  | "repeat_order";

export interface ProcurementMethodConfig {
  id: string;
  method: ProcurementMethod;
  name: string;
  threshold_min?: number | null;
  threshold_max?: number | null;
  description?: string;
  required_documents: string[]; // JSON array of document types
  approval_chain: string[]; // JSON array of role codes
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PURCHASE REQUEST (PR)
// ============================================================================

export type PRStatus =
  | "draft"
  | "pending_requester"
  | "pending_dept_head"
  | "pending_supply_officer"
  | "pending_bac"
  | "pending_budget_officer"
  | "pending_accounting_officer"
  | "pending_sds"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface PurchaseRequest {
  id: string;
  pr_number: string; // PR-2025-001
  proposal_id?: string | null;
  evaluation_id?: string | null;
  procurement_method?: ProcurementMethod | null;
  division_id: string;
  school_id?: string | null;
  requested_by: string;
  department?: string;
  purpose: string;
  total_amount: number;
  fund_source: string;
  fund_code?: string;
  status: PRStatus;
  current_approval_stage: number;
  approved_by?: string | null;
  approved_at?: string | null;
  remarks?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PRItem {
  id: string;
  pr_id: string;
  item_code?: string;
  item_name: string;
  description?: string;
  specification?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PURCHASE ORDER (PO)
// ============================================================================

export type POStatus =
  | "draft"
  | "pending_supply_officer"
  | "pending_bac_chair"
  | "pending_sds"
  | "approved"
  | "rejected"
  | "cancelled"
  | "amended";

export interface PurchaseOrder {
  id: string;
  po_number: string; // PO-2025-001
  pr_id: string;
  supplier_id: string;
  division_id: string;
  school_id?: string | null;
  total_amount: number;
  delivery_address: string;
  delivery_terms?: string;
  payment_terms?: string;
  status: POStatus;
  current_approval_stage: number;
  approved_by?: string | null;
  approved_at?: string | null;
  remarks?: string;
  parent_po_id?: string | null; // For amendments
  amendment_number?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface POItem {
  id: string;
  po_id: string;
  pr_item_id: string;
  item_name: string;
  description?: string;
  specification?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface POAmendment {
  id: string;
  po_id: string;
  amendment_number: number;
  reason: string;
  changes: Record<string, any>; // JSON object of changes
  requested_by: string;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// ============================================================================
// SUPPLIER MANAGEMENT
// ============================================================================

export interface Supplier {
  id: string;
  code?: string; // Supplier code
  name: string;
  tin?: string; // Tax Identification Number
  business_name?: string;
  address?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  fax?: string;
  philgeps_registration_number?: string;
  is_active: boolean;
  performance_rating?: number; // 1-5 scale
  total_orders?: number;
  on_time_delivery_rate?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SupplierQuotation {
  id: string;
  supplier_id: string;
  canvass_id?: string | null;
  quotation_number?: string;
  quotation_date: string;
  valid_until?: string | null;
  total_amount: number;
  delivery_days?: number;
  payment_terms?: string;
  document_url?: string | null; // Uploaded quotation file
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_name: string;
  description?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  brand?: string;
  model?: string;
  created_at: string;
}

// ============================================================================
// CANVASSING
// ============================================================================

export type CanvassStatus =
  | "draft"
  | "sent"
  | "quotation_received"
  | "under_evaluation"
  | "completed"
  | "cancelled";

export interface Canvass {
  id: string;
  canvass_number: string; // CANV-2025-001
  pr_id: string;
  division_id: string;
  school_id?: string | null;
  status: CanvassStatus;
  sent_date?: string | null;
  deadline_date?: string | null;
  evaluated_by?: string | null;
  evaluated_at?: string | null;
  recommended_supplier_id?: string | null;
  recommendation_remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CanvassSupplier {
  id: string;
  canvass_id: string;
  supplier_id: string;
  quotation_id?: string | null;
  is_recommended: boolean;
  score?: number; // Scoring result
  remarks?: string;
  created_at: string;
}

// ============================================================================
// DELIVERY & INSPECTION
// ============================================================================

export type DeliveryStatus =
  | "pending"
  | "partial"
  | "complete"
  | "overdue"
  | "cancelled";

export interface DeliveryReceipt {
  id: string;
  dr_number: string; // DR-2025-001
  po_id: string;
  supplier_id: string;
  delivery_date: string;
  received_by?: string | null;
  status: DeliveryStatus;
  remarks?: string;
  document_url?: string | null; // Uploaded DR file
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  id: string;
  dr_id: string;
  po_item_id: string;
  quantity_delivered: number;
  quantity_accepted?: number | null;
  quantity_rejected?: number | null;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export type IARStatus =
  | "pending"
  | "under_inspection"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "cancelled";

export interface InspectionAcceptanceReport {
  id: string;
  iar_number: string; // IAR-2025-001
  dr_id: string;
  po_id: string;
  inspected_by?: string | null;
  inspection_date?: string | null;
  status: IARStatus;
  inspection_remarks?: string;
  acceptance_remarks?: string;
  document_url?: string | null; // Uploaded IAR file
  created_at: string;
  updated_at: string;
}

export interface IARItem {
  id: string;
  iar_id: string;
  delivery_item_id: string;
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason?: string;
  condition?: string; // e.g., "good", "defective", "damaged"
  remarks?: string;
  created_at: string;
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

export type PaymentStatus =
  | "pending"
  | "obr_attached"
  | "dv_attached"
  | "forwarded_to_accounting"
  | "paid"
  | "cancelled";

export interface ProcurementPayment {
  id: string;
  po_id: string;
  iar_id?: string | null;
  status: PaymentStatus;
  obr_number?: string;
  obr_document_url?: string | null;
  dv_number?: string;
  dv_document_url?: string | null;
  forwarded_to_accounting_at?: string | null;
  forwarded_by?: string | null;
  payment_date?: string | null;
  payment_reference?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// APPROVAL WORKFLOW ENGINE
// ============================================================================

export type ApprovalAction =
  | "approve"
  | "reject"
  | "return"
  | "forward"
  | "cancel";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface ApprovalWorkflow {
  id: string;
  entity_type: string; // e.g., "purchase_request", "purchase_order"
  entity_id: string;
  workflow_type: string; // e.g., "pr_standard", "po_standard"
  current_stage: number;
  total_stages: number;
  status: ApprovalStatus;
  initiated_by: string;
  initiated_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStep {
  id: string;
  workflow_id: string;
  step_number: number;
  role_code: string; // Role required for this step
  user_id?: string | null; // Specific user assigned (optional)
  status: ApprovalStatus;
  action?: ApprovalAction | null;
  remarks?: string;
  acted_by?: string | null;
  acted_at?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalActionLog {
  id: string;
  step_id: string;
  workflow_id: string;
  action: ApprovalAction;
  remarks: string;
  acted_by: string;
  acted_at: string;
  created_at: string;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export type DocumentType =
  | "ppmp"
  | "app"
  | "pr"
  | "po"
  | "quotation"
  | "canvass"
  | "delivery_receipt"
  | "iar"
  | "obr"
  | "dv"
  | "other";

export interface ProcurementDocument {
  id: string;
  entity_type: string; // e.g., "purchase_request"
  entity_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  version?: number;
  uploaded_by: string;
  uploaded_at: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type NotificationType =
  | "approval_request"
  | "approval_approved"
  | "approval_rejected"
  | "approval_returned"
  | "delivery_received"
  | "inspection_completed"
  | "payment_forwarded"
  | "system_alert";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

// ============================================================================
// DATABASE VIEWS & HELPER TYPES
// ============================================================================

export interface Database {
  // Core tables
  divisions: Division;
  schools: School;
  roles: Role;
  permissions: Permission;
  role_permissions: RolePermission;
  users: User;
  user_roles: UserRole;

  // Audit
  audit_logs: AuditLog;

  // Procurement Planning
  procurement_proposals: ProcurementProposal;
  proposal_items: ProposalItem;

  // Pre-Procurement Evaluation
  pre_procurement_evaluations: PreProcurementEvaluation;

  // Procurement Methods
  procurement_method_configs: ProcurementMethodConfig;

  // Purchase Request
  purchase_requests: PurchaseRequest;
  pr_items: PRItem;

  // Purchase Order
  purchase_orders: PurchaseOrder;
  po_items: POItem;
  po_amendments: POAmendment;

  // Suppliers
  suppliers: Supplier;
  supplier_quotations: SupplierQuotation;
  quotation_items: QuotationItem;

  // Canvassing
  canvasses: Canvass;
  canvass_suppliers: CanvassSupplier;

  // Delivery & Inspection
  delivery_receipts: DeliveryReceipt;
  delivery_items: DeliveryItem;
  inspection_acceptance_reports: InspectionAcceptanceReport;
  iar_items: IARItem;

  // Payment
  procurement_payments: ProcurementPayment;

  // Approval Workflow
  approval_workflows: ApprovalWorkflow;
  approval_steps: ApprovalStep;
  approval_action_logs: ApprovalActionLog;

  // Documents
  procurement_documents: ProcurementDocument;

  // Notifications
  notifications: Notification;
}

// Helper type for Supabase queries
export type TableName = keyof Database;
export type TableRow<T extends TableName> = Database[T];
