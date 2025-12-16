/**
 * Permission Matrix for DepEd PMS & AIMS
 * Defines all permissions and their assignments to roles
 */

import { Permission, Role, RoleCode } from "./types";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS: Record<string, Permission> = {
  // Procurement Planning
  "pms.proposal.create": {
    code: "pms.proposal.create",
    name: "Create Procurement Proposal",
    description: "Create PPMP or APP proposals",
    module: "pms",
    resource: "proposal",
    action: "create",
  },
  "pms.proposal.read": {
    code: "pms.proposal.read",
    name: "View Procurement Proposal",
    description: "View PPMP or APP proposals",
    module: "pms",
    resource: "proposal",
    action: "read",
  },
  "pms.proposal.update": {
    code: "pms.proposal.update",
    name: "Update Procurement Proposal",
    description: "Edit PPMP or APP proposals",
    module: "pms",
    resource: "proposal",
    action: "update",
  },
  "pms.proposal.delete": {
    code: "pms.proposal.delete",
    name: "Delete Procurement Proposal",
    description: "Delete PPMP or APP proposals",
    module: "pms",
    resource: "proposal",
    action: "delete",
  },
  "pms.proposal.approve": {
    code: "pms.proposal.approve",
    name: "Approve Procurement Proposal",
    description: "Approve PPMP or APP proposals",
    module: "pms",
    resource: "proposal",
    action: "approve",
  },

  // Purchase Request
  "pms.pr.create": {
    code: "pms.pr.create",
    name: "Create Purchase Request",
    description: "Create purchase requests",
    module: "pms",
    resource: "pr",
    action: "create",
  },
  "pms.pr.read": {
    code: "pms.pr.read",
    name: "View Purchase Request",
    description: "View purchase requests",
    module: "pms",
    resource: "pr",
    action: "read",
  },
  "pms.pr.update": {
    code: "pms.pr.update",
    name: "Update Purchase Request",
    description: "Edit purchase requests",
    module: "pms",
    resource: "pr",
    action: "update",
  },
  "pms.pr.approve": {
    code: "pms.pr.approve",
    name: "Approve Purchase Request",
    description: "Approve purchase requests at any stage",
    module: "pms",
    resource: "pr",
    action: "approve",
  },
  "pms.pr.reject": {
    code: "pms.pr.reject",
    name: "Reject Purchase Request",
    description: "Reject purchase requests",
    module: "pms",
    resource: "pr",
    action: "reject",
  },
  "pms.pr.print": {
    code: "pms.pr.print",
    name: "Print Purchase Request",
    description: "Print purchase request forms",
    module: "pms",
    resource: "pr",
    action: "print",
  },

  // Purchase Order
  "pms.po.create": {
    code: "pms.po.create",
    name: "Create Purchase Order",
    description: "Create purchase orders",
    module: "pms",
    resource: "po",
    action: "create",
  },
  "pms.po.read": {
    code: "pms.po.read",
    name: "View Purchase Order",
    description: "View purchase orders",
    module: "pms",
    resource: "po",
    action: "read",
  },
  "pms.po.update": {
    code: "pms.po.update",
    name: "Update Purchase Order",
    description: "Edit purchase orders",
    module: "pms",
    resource: "po",
    action: "update",
  },
  "pms.po.approve": {
    code: "pms.po.approve",
    name: "Approve Purchase Order",
    description: "Approve purchase orders",
    module: "pms",
    resource: "po",
    action: "approve",
  },
  "pms.po.print": {
    code: "pms.po.print",
    name: "Print Purchase Order",
    description: "Print purchase order forms",
    module: "pms",
    resource: "po",
    action: "print",
  },

  // Suppliers
  "pms.supplier.create": {
    code: "pms.supplier.create",
    name: "Create Supplier",
    description: "Add new suppliers",
    module: "pms",
    resource: "supplier",
    action: "create",
  },
  "pms.supplier.read": {
    code: "pms.supplier.read",
    name: "View Supplier",
    description: "View supplier information",
    module: "pms",
    resource: "supplier",
    action: "read",
  },
  "pms.supplier.update": {
    code: "pms.supplier.update",
    name: "Update Supplier",
    description: "Edit supplier information",
    module: "pms",
    resource: "supplier",
    action: "update",
  },

  // Canvassing
  "pms.canvass.create": {
    code: "pms.canvass.create",
    name: "Create Canvass",
    description: "Create canvassing forms",
    module: "pms",
    resource: "canvass",
    action: "create",
  },
  "pms.canvass.read": {
    code: "pms.canvass.read",
    name: "View Canvass",
    description: "View canvassing information",
    module: "pms",
    resource: "canvass",
    action: "read",
  },
  "pms.canvass.update": {
    code: "pms.canvass.update",
    name: "Update Canvass",
    description: "Edit canvassing information",
    module: "pms",
    resource: "canvass",
    action: "update",
  },

  // Delivery & Inspection
  "pms.delivery.create": {
    code: "pms.delivery.create",
    name: "Record Delivery",
    description: "Record delivery receipts",
    module: "pms",
    resource: "delivery",
    action: "create",
  },
  "pms.delivery.read": {
    code: "pms.delivery.read",
    name: "View Delivery",
    description: "View delivery receipts",
    module: "pms",
    resource: "delivery",
    action: "read",
  },
  "pms.iar.create": {
    code: "pms.iar.create",
    name: "Create IAR",
    description: "Create inspection and acceptance reports",
    module: "pms",
    resource: "iar",
    action: "create",
  },
  "pms.iar.read": {
    code: "pms.iar.read",
    name: "View IAR",
    description: "View inspection and acceptance reports",
    module: "pms",
    resource: "iar",
    action: "read",
  },

  // Reports
  "pms.report.read": {
    code: "pms.report.read",
    name: "View Reports",
    description: "View procurement reports",
    module: "pms",
    resource: "report",
    action: "read",
  },
  "pms.report.print": {
    code: "pms.report.print",
    name: "Print Reports",
    description: "Print and export reports",
    module: "pms",
    resource: "report",
    action: "print",
  },

  // System
  "system.user.create": {
    code: "system.user.create",
    name: "Create User",
    description: "Create new users",
    module: "system",
    resource: "user",
    action: "create",
  },
  "system.user.read": {
    code: "system.user.read",
    name: "View User",
    description: "View user information",
    module: "system",
    resource: "user",
    action: "read",
  },
  "system.user.update": {
    code: "system.user.update",
    name: "Update User",
    description: "Edit user information",
    module: "system",
    resource: "user",
    action: "update",
  },
  "system.role.read": {
    code: "system.role.read",
    name: "View Roles",
    description: "View role information",
    module: "system",
    resource: "role",
    action: "read",
  },
};

// ============================================================================
// ROLE PERMISSION MAPPINGS
// ============================================================================

export const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  SDS: [
    // Full access to everything
    "pms.proposal.create",
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.proposal.delete",
    "pms.proposal.approve",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.approve",
    "pms.pr.reject",
    "pms.pr.print",
    "pms.po.create",
    "pms.po.read",
    "pms.po.update",
    "pms.po.approve",
    "pms.po.print",
    "pms.supplier.create",
    "pms.supplier.read",
    "pms.supplier.update",
    "pms.canvass.create",
    "pms.canvass.read",
    "pms.canvass.update",
    "pms.delivery.create",
    "pms.delivery.read",
    "pms.iar.create",
    "pms.iar.read",
    "pms.report.read",
    "pms.report.print",
    "system.user.create",
    "system.user.read",
    "system.user.update",
    "system.role.read",
  ],
  ASST_SDS: [
    "pms.proposal.read",
    "pms.proposal.approve",
    "pms.pr.read",
    "pms.pr.approve",
    "pms.po.read",
    "pms.po.approve",
    "pms.supplier.read",
    "pms.canvass.read",
    "pms.delivery.read",
    "pms.iar.read",
    "pms.report.read",
    "pms.report.print",
  ],
  SUPPLY_OFFICER_DIV: [
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.approve",
    "pms.pr.print",
    "pms.po.create",
    "pms.po.read",
    "pms.po.update",
    "pms.po.approve",
    "pms.po.print",
    "pms.supplier.create",
    "pms.supplier.read",
    "pms.supplier.update",
    "pms.canvass.create",
    "pms.canvass.read",
    "pms.canvass.update",
    "pms.delivery.create",
    "pms.delivery.read",
    "pms.iar.create",
    "pms.iar.read",
    "pms.report.read",
    "pms.report.print",
  ],
  BUDGET_OFFICER: [
    "pms.proposal.read",
    "pms.proposal.approve",
    "pms.pr.read",
    "pms.pr.approve",
    "pms.pr.reject",
    "pms.po.read",
    "pms.report.read",
    "pms.report.print",
  ],
  ACCOUNTING_OFFICER: [
    "pms.pr.read",
    "pms.pr.approve",
    "pms.po.read",
    "pms.payment.read",
    "pms.report.read",
    "pms.report.print",
  ],
  BAC_CHAIR: [
    "pms.proposal.read",
    "pms.proposal.approve",
    "pms.pr.read",
    "pms.pr.approve",
    "pms.pr.reject",
    "pms.po.read",
    "pms.po.approve",
    "pms.po.reject",
    "pms.canvass.read",
    "pms.report.read",
  ],
  BAC_MEMBER: [
    "pms.proposal.read",
    "pms.pr.read",
    "pms.po.read",
    "pms.canvass.read",
    "pms.report.read",
  ],
  TECHNICAL_EVALUATOR: [
    "pms.proposal.read",
    "pms.proposal.approve",
    "pms.pr.read",
    "pms.report.read",
  ],
  SCHOOL_HEAD: [
    "pms.proposal.create",
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.approve",
    "pms.pr.print",
    "pms.po.read",
    "pms.supplier.read",
    "pms.canvass.read",
    "pms.delivery.read",
    "pms.iar.read",
    "pms.report.read",
  ],
  SUPPLY_OFFICER_SCH: [
    "pms.proposal.create",
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.print",
    "pms.po.read",
    "pms.supplier.read",
    "pms.canvass.read",
    "pms.delivery.create",
    "pms.delivery.read",
    "pms.iar.create",
    "pms.iar.read",
    "pms.report.read",
  ],
  DIVISION_STAFF: [
    "pms.proposal.create",
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.print",
    "pms.po.read",
    "pms.supplier.read",
    "pms.report.read",
  ],
  SCHOOL_STAFF: [
    "pms.proposal.create",
    "pms.proposal.read",
    "pms.proposal.update",
    "pms.pr.create",
    "pms.pr.read",
    "pms.pr.update",
    "pms.pr.print",
    "pms.po.read",
    "pms.supplier.read",
    "pms.report.read",
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleCode: RoleCode): Permission[] {
  const permissionCodes = ROLE_PERMISSIONS[roleCode] || [];
  return permissionCodes
    .map((code) => PERMISSIONS[code])
    .filter((p): p is Permission => p !== undefined);
}

/**
 * Check if a permission code exists
 */
export function hasPermission(
  userPermissions: string[],
  permissionCode: string
): boolean {
  return userPermissions.includes(permissionCode);
}

/**
 * Get permission by code
 */
export function getPermission(code: string): Permission | undefined {
  return PERMISSIONS[code];
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  permissionCodes: string[]
): boolean {
  return permissionCodes.some((code) => userPermissions.includes(code));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  permissionCodes: string[]
): boolean {
  return permissionCodes.every((code) => userPermissions.includes(code));
}
