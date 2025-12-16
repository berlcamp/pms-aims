/**
 * RBAC Middleware for Route Protection
 * Protects routes based on user permissions
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/server";

/**
 * Check if user has required permission
 */
export async function checkPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const supabase = await getSupabaseClient();
  
  // Get user's roles
  const { data: userRoles, error } = await supabase
    .from("user_roles")
    .select(
      `
      role:roles (
        code,
        role_permissions:role_permissions (
          permission:permissions (
            code
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !userRoles) {
    return false;
  }

  // Extract all permission codes from user's roles
  const permissionCodes = new Set<string>();
  userRoles.forEach((ur: any) => {
    ur.role?.role_permissions?.forEach((rp: any) => {
      if (rp.permission?.code) {
        permissionCodes.add(rp.permission.code);
      }
    });
  });

  return permissionCodes.has(permissionCode);
}

/**
 * Middleware function to protect routes with permission check
 */
export function withPermission(permissionCode: string) {
  return async (request: NextRequest) => {
    const supabase = await getSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    // Get system user
    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (!systemUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    // Check permission
    const hasAccess = await checkPermission(systemUser.id, permissionCode);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}

/**
 * Middleware function to protect routes with multiple permission options (OR)
 */
export function withAnyPermission(permissionCodes: string[]) {
  return async (request: NextRequest) => {
    const supabase = await getSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (!systemUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    // Check if user has any of the required permissions
    const permissionChecks = await Promise.all(
      permissionCodes.map((code) => checkPermission(systemUser.id, code))
    );

    const hasAccess = permissionChecks.some((result) => result === true);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}

/**
 * Middleware function to protect routes requiring all permissions (AND)
 */
export function withAllPermissions(permissionCodes: string[]) {
  return async (request: NextRequest) => {
    const supabase = await getSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (!systemUser) {
      return NextResponse.redirect(new URL("/auth/unverified", request.url));
    }

    // Check if user has all required permissions
    const permissionChecks = await Promise.all(
      permissionCodes.map((code) => checkPermission(systemUser.id, code))
    );

    const hasAccess = permissionChecks.every((result) => result === true);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}
