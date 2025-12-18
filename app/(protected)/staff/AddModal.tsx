// components/AddItemTypeModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAppDispatch } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase2 } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";
import { Role, User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

// Always update this on other pages
type ItemType = User;
const table = "users";
const title = "Staff";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null; // Optional prop for editing existing item
}

const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  roleIds: z.array(z.number()).min(1, "At least one role must be selected"),
});

type FormType = z.infer<typeof FormSchema>;

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const dispatch = useAppDispatch();

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: editData ? editData.name : "",
      email: editData ? editData.email : "",
      roleIds: [],
    },
  });

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setAvailableRoles(data || []);
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast.error("Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    };

    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  // Fetch user roles when editing
  useEffect(() => {
    const fetchUserRoles = async () => {
      if (editData?.id && isOpen) {
        try {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role_id")
            .eq("user_id", editData.id)
            .eq("is_active", true);

          if (error) throw error;
          const roleIds = (data || []).map((ur) => ur.role_id);
          form.setValue("roleIds", roleIds);
        } catch (error) {
          console.error("Error fetching user roles:", error);
        }
      }
    };

    fetchUserRoles();
  }, [editData, isOpen, form]);

  // Submit handler
  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return; // 🚫 Prevent double-submit
    setIsSubmitting(true);

    try {
      // 🔹 Step 1: Get or create auth user
      const { data: authUserId, error: authError } = await supabase.rpc(
        "get_user_id_by_email",
        { p_email: data.email }
      );

      if (authError)
        throw new Error(`Error fetching auth user: ${authError.message}`);

      let user_id = authUserId;

      // 🔹 Step 2: If no auth user found, create one
      if (!user_id) {
        const { data: newAuth, error: createAuthError } =
          await supabase2.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            password:
              process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || "Password123!", // ✅ Default password (configurable)
          });

        if (createAuthError)
          throw new Error(
            `Error creating auth user: ${createAuthError.message}`
          );

        user_id = newAuth.user.id;
      }

      // 🔹 Step 3: Prepare user data for your app table
      const newData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        user_id,
      };

      let userId: number;

      // 🔹 Step 4: Insert or Update logic
      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(newData)
          .eq("id", editData.id);

        if (error) throw new Error(error.message);

        userId = parseInt(editData.id);

        // Update user roles
        // Deactivate all existing roles first
        await supabase
          .from("user_roles")
          .update({ is_active: false })
          .eq("user_id", userId);

        // Add new roles
        if (data.roleIds.length > 0) {
          const roleInserts = data.roleIds.map((roleId) => ({
            user_id: userId,
            role_id: roleId,
            division_id: null,
            school_id: null,
            is_active: true,
          }));

          // Use upsert to handle existing records (reactivate if exists, create if new)
          for (const roleInsert of roleInserts) {
            const { error: upsertError } = await supabase
              .from("user_roles")
              .upsert(roleInsert, {
                onConflict: "user_id,role_id,division_id,school_id",
              });
            if (upsertError) {
              console.error("Error upserting user role:", upsertError);
            }
          }
        }

        // ✅ Fetch updated record with user_roles relationship
        const { data: updated } = await supabase
          .from(table)
          .select(
            "*, user_roles!user_roles_user_id_fkey(roles(id, name, code, is_active))"
          )
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        onClose();
        toast.success("Staff member updated successfully!");
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([newData])
          .select(
            "*, user_roles!user_roles_user_id_fkey(roles(id, name, code, is_active))"
          )
          .single();

        if (error) {
          if (error.code === "23505") toast.error("Email already exists");
          throw new Error(error.message);
        }

        userId = inserted.id;

        // Assign roles to user
        if (data.roleIds.length > 0) {
          const roleInserts = data.roleIds.map((roleId) => ({
            user_id: userId,
            role_id: roleId,
            is_active: true,
          }));

          const { error: roleError } = await supabase
            .from("user_roles")
            .insert(roleInserts);

          if (roleError) {
            console.error("Error assigning roles:", roleError);
            toast.error("User created but failed to assign roles");
          }
        }

        // ✅ Fetch complete record with user_roles relationship
        const { data: completeRecord } = await supabase
          .from(table)
          .select(
            "*, user_roles!user_roles_user_id_fkey(roles(id, name, code, is_active))"
          )
          .eq("id", userId)
          .single();

        // Always dispatch the complete record (with or without roles)
        dispatch(addItem(completeRecord || inserted));
        onClose();
        toast.success("Staff member added successfully!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving user");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: editData?.name || "",
        email: editData?.email || "",
        roleIds: [],
      });
    }
  }, [form, editData, isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData ? "Edit" : "Add"} {title}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update staff member information below."
              : "Fill in the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Staff Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="staff@example.com"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    This email will be used for login authentication.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-sm font-medium">
                      Roles <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Select one or more roles to assign to this user.
                    </FormDescription>
                  </div>
                  {loadingRoles ? (
                    <div className="text-sm text-muted-foreground">
                      Loading roles...
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto border rounded-lg p-4">
                      {availableRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No roles available
                        </p>
                      ) : (
                        availableRoles.map((role) => (
                          <FormField
                            key={role.id}
                            control={form.control}
                            name="roleIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={role.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(role.id)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        return checked
                                          ? field.onChange([
                                              ...(field.value || []),
                                              role.id,
                                            ])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== role.id
                                              )
                                            );
                                      }}
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {role.name}
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      {role.code} • {role.level}
                                    </p>
                                    {role.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {role.description}
                                      </p>
                                    )}
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 min-w-[100px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {editData ? "Updating..." : "Saving..."}
                  </span>
                ) : editData ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
