import { RootState as RootStateType } from "@/lib/redux";

export type RootState = RootStateType;

export interface User {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  password: string;
  email?: string;
  type?: string;
  is_active: boolean;
  created_at?: string;
  roles?: UserRole[];
  user_roles?: Array<{
    roles: Role | null;
  }>;
}

export interface AddUserFormValues {
  name: string;
  email: string;
  type: string;
  is_active: boolean;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  level: "division" | "school" | "both";
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string;
  module: "pms" | "aims" | "system";
  resource: string;
  action:
    | "create"
    | "read"
    | "update"
    | "delete"
    | "approve"
    | "reject"
    | "print";
  created_at?: string;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at?: string;
  role?: Role;
  permission?: Permission;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  division_id?: number;
  school_id?: number;
  assigned_at?: string;
  assigned_by?: number;
  is_active: boolean;
  created_at?: string;
  role?: Role;
}
