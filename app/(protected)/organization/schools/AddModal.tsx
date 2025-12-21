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
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "@/components/UserSelect";
import { useAppDispatch } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { School } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

// Always update this on other pages
type ItemType = School;
const table = "schools";
const title = "School";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null; // Optional prop for editing existing item
}

const FormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  school_id: z.string().optional(),
  address: z.string().optional(),
  head_user_id: z.string().nullable().optional(),
});

type FormType = z.infer<typeof FormSchema>;

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useAppDispatch();

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      code: editData ? editData.code : "",
      name: editData ? editData.name : "",
      school_id: editData ? editData.school_id : "",
      address: editData ? editData.address : "",
      head_user_id: editData?.head_user_id
        ? String(editData.head_user_id)
        : null,
    },
  });

  // Submit handler
  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return; // 🚫 Prevent double-submit
    setIsSubmitting(true);

    try {
      const newData = {
        code: data.code.trim(),
        name: data.name.trim(),
        division_id: process.env.NEXT_PUBLIC_DIVISION_ID,
        school_id: data.school_id?.trim() || null,
        address: data.address?.trim() || null,
        head_user_id: data.head_user_id ? parseInt(data.head_user_id) : null,
      };

      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(newData)
          .eq("id", editData.id);

        if (error) {
          if (error.code === "23505") {
            toast.error("Code already exists for this division");
          } else {
            throw new Error(error.message);
          }
        } else {
          // ✅ Fetch updated record with division relationship
          const { data: updated } = await supabase
            .from(table)
            .select("*, head_user:head_user_id(id, name, email)")
            .eq("id", editData.id)
            .single();

          if (updated) {
            dispatch(updateList(updated));
          }

          onClose();
          toast.success("School updated successfully!");
        }
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([newData])
          .select("*, head_user:head_user_id(id, name, email)")
          .single();

        if (error) {
          if (error.code === "23505") {
            toast.error("Code already exists for this division");
          } else {
            throw new Error(error.message);
          }
        } else {
          dispatch(addItem(inserted));
          onClose();
          toast.success("School added successfully!");
        }
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving school");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        code: editData?.code || "",
        name: editData?.name || "",
        school_id: editData?.school_id || "",
        address: editData?.address || "",
        head_user_id: editData?.head_user_id
          ? String(editData.head_user_id)
          : null,
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
              ? "Update school information below."
              : "Fill in the details to add a new school."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    School Code <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter school code"
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    School Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter school name"
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
              name="school_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    DepEd School ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter DepEd School ID (optional)"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Official DepEd School ID (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter school address (optional)"
                      className="min-h-[80px]"
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
              name="head_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Head User
                  </FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      placeholder="Select head user (optional)"
                      divisionId={
                        process.env.NEXT_PUBLIC_DIVISION_ID || undefined
                      }
                    />
                  </FormControl>
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
