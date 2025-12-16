/**
 * RBAC Types and Definitions
 * Role-Based Access Control system for DepEd PMS & AIMS
 */

export type RoleCode =
  | "SDS"
  | "ASST_SDS"
  | "SUPPLY_OFFICER_DIV"
  | "BUDGET_OFFICER"
  | "ACCOUNTING_OFFICER"
  | "BAC_CHAIR"
  | "BAC_MEMBER"
  | "TECHNICAL_EVALUATOR"
  | "SCHOOL_HEAD"
  | "SUPPLY_OFFICER_SCH"
  | "DIVISION_STAFF"
  | "SCHOOL_STAFF";

export type Module = "pms" | "aims" | "system";
export type Resource =
  | "proposal"
  | "pr"
  | "po"
  | "supplier"
  | "canvass"
  | "delivery"
  | "iar"
  | "payment"
  | "report"
  | "user"
  | "role"
  | "division"
  | "school";

export type Action = "create" | "read" | "update" | "delete" | "approve" | "reject" | "print";

export interface Permission {
  code: string;
  name: string;
  description?: string;
  module: Module;
  resource: Resource;
  action: Action;
}

export interface Role {
  code: RoleCode;
  name: string;
  description?: string;
  level: "division" | "school" | "both";
  permissions: Permission[];
}

export interface UserPermission {
  userId: string;
  roleCode: RoleCode;
  divisionId?: string;
  schoolId?: string;
  permissions: Permission[];
}
