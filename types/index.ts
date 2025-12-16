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
}

export interface AddUserFormValues {
  name: string;
  email: string;
  type: string;
  is_active: boolean;
}
