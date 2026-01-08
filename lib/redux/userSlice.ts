// store/userSlice.ts
import { Permission, UserRole, UserRoleWithRole } from "@/types/database";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@supabase/supabase-js";

export interface ExtendedUser extends User {
  system_user_id?: number;
  org_id?: number;
  division_id?: string | null;
  type?: string;
  name?: string;
  roles?: UserRole[];
  permissions?: Permission[];
  // Additional properties to match UserWithRelations
  user_id?: string;
  is_active?: boolean;
  office_id?: string | null;
  school_id?: string | null;
  user_roles?: UserRoleWithRole[];
}

interface UserState {
  user: ExtendedUser | null;
}

const initialState: UserState = {
  user: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<ExtendedUser | null>) => {
      state.user = action.payload;
    },
  },
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;
