// components/AddItemTypeModal.tsx
"use client";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userTypes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase2 } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";
import { Office, School, User } from "@/types/database";
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
  type: z.string().min(1, "User type is required"),
  school_id: z.string().optional(),
  office_id: z.string().optional(),
});

type FormType = z.infer<typeof FormSchema>;

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  const dispatch = useAppDispatch();

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    mode: "onSubmit", // Only validate on submit, not on change/blur
    defaultValues: {
      name: editData ? editData.name : "",
      email: editData ? editData.email : "",
      type: editData ? editData.type : "user",
      school_id: editData?.school_id ? String(editData.school_id) : "none",
      office_id: editData?.office_id ? String(editData.office_id) : "none",
    },
  });

  // Fetch available schools
  useEffect(() => {
    const fetchSchools = async () => {
      setLoadingSchools(true);
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setAvailableSchools(data || []);
      } catch (error) {
        console.error("Error fetching schools:", error);
        toast.error("Failed to load schools");
      } finally {
        setLoadingSchools(false);
      }
    };

    if (isOpen) {
      fetchSchools();
    }
  }, [isOpen]);

  // Fetch available offices
  useEffect(() => {
    const fetchOffices = async () => {
      setLoadingOffices(true);
      try {
        const { data, error } = await supabase
          .from("offices")
          .select("*")
          .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setAvailableOffices(data || []);
      } catch (error) {
        console.error("Error fetching offices:", error);
        toast.error("Failed to load offices");
      } finally {
        setLoadingOffices(false);
      }
    };

    if (isOpen) {
      fetchOffices();
    }
  }, [isOpen]);

  // Reset form when editing
  useEffect(() => {
    if (!isOpen) return;

    form.reset(
      {
        name: editData?.name || "",
        email: editData?.email || "",
        type: editData?.type || "user",
        school_id: editData?.school_id ? String(editData.school_id) : "none",
        office_id: editData?.office_id ? String(editData.office_id) : "none",
      },
      { keepErrors: false } // Clear any validation errors
    );
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
      // Constraint: users_division_or_school requires that division_id and school_id are mutually exclusive
      const schoolId =
        data.school_id && data.school_id !== "none"
          ? parseInt(data.school_id)
          : null;

      const newData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        user_id,
        type: data.type,
        // If school is selected, set school_id and division_id to NULL
        // Otherwise, set division_id and school_id to NULL
        division_id: schoolId ? null : process.env.NEXT_PUBLIC_DIVISION_ID,
        school_id: schoolId,
        office_id:
          data.office_id && data.office_id !== "none"
            ? parseInt(data.office_id)
            : null,
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

        // ✅ Fetch updated record
        const { data: updated } = await supabase
          .from(table)
          .select("*")
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
          .select("*")
          .single();

        if (error) {
          if (error.code === "23505") toast.error("Email already exists");
          throw new Error(error.message);
        }

        userId = inserted.id;

        // ✅ Fetch complete record
        const { data: completeRecord } = await supabase
          .from(table)
          .select("*")
          .eq("id", userId)
          .single();

        // Always dispatch the complete record
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
              name="school_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">School</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "none"}
                    disabled={isSubmitting || loadingSchools}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select a school (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableSchools.map((school) => (
                        <SelectItem key={school.id} value={String(school.id)}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="office_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Office</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "none"}
                    disabled={isSubmitting || loadingOffices}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select an office (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableOffices.map((office) => (
                        <SelectItem key={office.id} value={String(office.id)}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    User Type <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Select the user type for this account.
                  </FormDescription>
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
