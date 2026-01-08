import { ExtendedUser } from "@/lib/redux/userSlice";
import { LasaRow } from "@/types/database";

/**
 * Check if user has permission to access LASA rows
 */
export function checkLasaAccess(
  lasaRow: LasaRow,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin and admin can view all LASA rows
  if (user.type === "super admin" || user.type === "admin") {
    return true;
  }

  // Check if user belongs to the same office
  if (lasaRow.office_id) {
    if (
      user.office_id &&
      String(user.office_id) === String(lasaRow.office_id)
    ) {
      return true;
    }
  }

  // Staff can view (read-only)
  return user.type === "staff";
}

/**
 * Check if user can create LASA rows
 */
export function checkLasaCreatePermission(user: ExtendedUser | null): boolean {
  if (!user) return false;

  // Super admin and admin can create LASA rows
  return user.type === "super admin" || user.type === "admin";
}

/**
 * Check if user can edit LASA row
 */
export function checkLasaEditPermission(
  lasaRow: LasaRow,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can always edit
  if (user.type === "super admin") {
    return true;
  }

  // Budget officers and admins can edit
  if (user.type !== "admin" && user.type !== "budget officer") {
    return false;
  }

  // Cannot edit PPMP_PROJECT rows
  if (lasaRow.row_type === "PPMP_PROJECT") {
    return false;
  }

  // Cannot edit locked rows
  if (lasaRow.is_locked) {
    return false;
  }

  // Budget officers can edit MANUAL rows in their division
  if (user.type === "budget officer") {
    return lasaRow.row_type === "MANUAL";
  }

  // Check access for admin
  return checkLasaAccess(lasaRow, user);
}

/**
 * Check if user can delete LASA row
 */
export function checkLasaDeletePermission(
  lasaRow: LasaRow,
  user: ExtendedUser | null
): boolean {
  if (!user) return false;

  // Super admin can always delete
  if (user.type === "super admin") {
    return true;
  }

  // Budget officers and admins can delete
  if (user.type !== "admin" && user.type !== "budget officer") {
    return false;
  }

  // Cannot delete PPMP_PROJECT rows
  if (lasaRow.row_type === "PPMP_PROJECT") {
    return false;
  }

  // Cannot delete locked rows
  if (lasaRow.is_locked) {
    return false;
  }

  // Budget officers can delete MANUAL rows in their division
  if (user.type === "budget officer") {
    return lasaRow.row_type === "MANUAL";
  }

  // Check access for admin
  return checkLasaAccess(lasaRow, user);
}

/**
 * Check if user can view LASA rows (general read permission)
 */
export function checkLasaReadPermission(user: ExtendedUser | null): boolean {
  if (!user) return false;

  // Super admin, admin, and staff can read
  return (
    user.type === "super admin" ||
    user.type === "admin" ||
    user.type === "staff"
  );
}
