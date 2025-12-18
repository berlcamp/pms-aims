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
import { useAppDispatch } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Office, School } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

// Always update this on other pages
type ItemType = Office;
const table = "offices";
const title = "Office";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null; // Optional prop for editing existing item
}

const FormSchema = z
  .object({
    code: z.string().min(1, "Code is required"),
    name: z.string().min(1, "Name is required"),
    office_type: z.enum(["division_office", "school"], {
      required_error: "Office type is required",
    }),
    school_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.office_type === "school") {
        return data.school_id && data.school_id.length > 0;
      }
      return true;
    },
    {
      message: "School is required when office type is School",
      path: ["school_id"],
    }
  );

type FormType = z.infer<typeof FormSchema>;

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const dispatch = useAppDispatch();

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      code: editData ? editData.code : "",
      name: editData ? editData.name : "",
      office_type: editData ? editData.office_type : "division_office",
      school_id: editData ? editData.school_id || "" : "",
    },
  });

  const officeType = form.watch("office_type");
  const divisionId = process.env.NEXT_PUBLIC_DIVISION_ID;

  // Fetch available schools when office_type is "school"
  useEffect(() => {
    const fetchSchools = async () => {
      if (!divisionId || officeType !== "school") {
        setAvailableSchools([]);
        if (officeType === "division_office") {
          form.setValue("school_id", "");
        }
        return;
      }

      setLoadingSchools(true);
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("division_id", divisionId)
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

    if (isOpen && divisionId) {
      fetchSchools();
    }
  }, [isOpen, divisionId, officeType, form]);

  // Update form validation based on office_type
  useEffect(() => {
    if (officeType === "division_office") {
      form.setValue("school_id", "");
    }
  }, [officeType, form]);

  // Submit handler
  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return; // 🚫 Prevent double-submit
    setIsSubmitting(true);

    try {
      const newData = {
        code: data.code.trim(),
        name: data.name.trim(),
        division_id: process.env.NEXT_PUBLIC_DIVISION_ID,
        office_type: data.office_type,
        school_id:
          data.office_type === "school" && data.school_id
            ? parseInt(data.school_id)
            : null,
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
          // ✅ Fetch updated record with relationships
          const { data: updated } = await supabase
            .from(table)
            .select("*, divisions(id, code, name), schools(id, code, name)")
            .eq("id", editData.id)
            .single();

          if (updated) {
            dispatch(updateList(updated));
          }

          onClose();
          toast.success("Office updated successfully!");
        }
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([newData])
          .select("*, divisions(id, code, name), schools(id, code, name)")
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
          toast.success("Office added successfully!");
        }
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving office");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        code: editData?.code || "",
        name: editData?.name || "",
        office_type: editData?.office_type || "division_office",
        school_id: editData?.school_id || "",
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
              ? "Update office information below."
              : "Fill in the details to add a new office."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="office_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Office Type <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select office type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="division_office">
                        Division Office
                      </SelectItem>
                      <SelectItem value="school">School</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {officeType === "school" && (
              <FormField
                control={form.control}
                name="school_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      School <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || loadingSchools || !divisionId}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSchools.length === 0 ? (
                          <SelectItem value="" disabled>
                            {loadingSchools
                              ? "Loading schools..."
                              : !divisionId
                              ? "Please select a division first"
                              : "No schools available"}
                          </SelectItem>
                        ) : (
                          availableSchools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name} ({school.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Office Code <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter office code"
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
                    Office Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter office name"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
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
