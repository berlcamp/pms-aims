import { ExtendedUser } from "@/lib/redux/userSlice";
import { PPMP } from "@/types/database";

/**
 * Check if user has permission to access PPMP
 */
export function checkPPMPAccess(
  ppmp: PPMP,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can access everything
  if (user.type === "super admin") {
    return true;
  }

  // Check if user belongs to the same office/school
  if (ppmp.office_id) {
    if (user.office_id && String(user.office_id) === String(ppmp.office_id)) {
      return true;
    }
  }

  if (ppmp.school_id) {
    if (user.school_id && String(user.school_id) === String(ppmp.school_id)) {
      return true;
    }
  }

  // Admin can view all approved PPMPs
  if (user.type === "admin") {
    return (
      ppmp.status === "APPROVED_BY_OFFICE" ||
      ppmp.status === "SUBMITTED_TO_PROCUREMENT" ||
      ppmp.status === "CONSOLIDATED"
    );
  }

  return false;
}

/**
 * Check if user can edit PPMP
 */
export function checkPPMPEditPermission(
  ppmp: PPMP,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can always edit
  if (user.type === "super admin") {
    return true;
  }

  // Only DRAFT status can be edited
  if (ppmp.status !== "DRAFT") {
    return false;
  }

  // Cannot edit if locked
  if (ppmp.is_locked) {
    return false;
  }

  // User must be the submitter or be admin
  if (
    ppmp.submitted_by &&
    String(ppmp.submitted_by) !== String(user.system_user_id)
  ) {
    if (user.type !== "admin") {
      return false;
    }
  }

  // Check office/school access
  return checkPPMPAccess(ppmp, user);
}

/**
 * Check if user can approve PPMP (prevent self-approval)
 */
export function checkPPMPApprovalPermission(
  ppmp: PPMP,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can always approve
  if (user.type === "super admin") {
    return true;
  }

  // Only FOR_APPROVAL status can be approved
  if (ppmp.status !== "FOR_APPROVAL") {
    return false;
  }

  // Prevent self-approval
  if (
    ppmp.submitted_by &&
    String(ppmp.submitted_by) === String(user.system_user_id)
  ) {
    return false;
  }

  // Admin can approve
  if (user.type === "admin") {
    // Check office/school match
    if (ppmp.office_id) {
      if (user.office_id && String(user.office_id) === String(ppmp.office_id)) {
        return true;
      }
    }

    if (ppmp.school_id) {
      if (user.school_id && String(user.school_id) === String(ppmp.school_id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user can review PPMP (Procurement)
 */
export function checkPPMPReviewPermission(
  ppmp: PPMP,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can always review
  if (user.type === "super admin") {
    return true;
  }

  // Only APPROVED_BY_OFFICE status can be reviewed
  if (ppmp.status !== "APPROVED_BY_OFFICE") {
    return false;
  }

  // Admin can review
  return user.type === "admin";
}

/**
 * Check if user can create PPMP
 */
export function checkPPMPCreatePermission(user: ExtendedUser | null): boolean {
  if (!user) return false;

  // Super admin and admin can create PPMP
  return user.type !== "schools division superintendent";
}

/**
 * Check if user can print PPMP
 */
export function checkPPMPPrintPermission(
  ppmp: PPMP,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // User must have access to PPMP
  if (!checkPPMPAccess(ppmp, user)) {
    return false;
  }

  // All users with access can print
  return true;
}
