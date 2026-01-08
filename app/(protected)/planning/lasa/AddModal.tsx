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
import { UserSelect } from "@/components/UserSelect";
import { ExtendedUser } from "@/lib/redux/userSlice";
import { createLasaRow, updateLasaRow } from "@/lib/services/lasa";
import { checkLasaEditPermission } from "@/lib/utils/lasa-permissions";
import { LasaRowWithRelations } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: LasaRowWithRelations | null;
  user: ExtendedUser | null;
  onSubmitComplete?: () => void;
}

const FormSchema = z.object({
  fiscalYear: z.number().min(2020).max(2100),
  proponentId: z.string().nullable().optional(),
  projectTitle: z.string().min(1, "Project title is required"),
  fundSource: z.string().min(1, "Fund source is required"),
  plannedAmount: z
    .number()
    .min(0, "Planned amount must be 0 or greater")
    .optional(),
  saroNumber: z.string().nullable().optional(),
});

type FormType = z.infer<typeof FormSchema>;

const currentYear = new Date().getFullYear();
const fiscalYears = Array.from({ length: 5 }, (_, i) => currentYear + i);

export const AddModal = ({
  isOpen,
  onClose,
  editData,
  user,
  onSubmitComplete,
}: AddModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editData;
  const canEdit = editData ? checkLasaEditPermission(editData, user) : false;

  // Prevent editing PPMP_PROJECT rows
  if (isEditMode && editData?.row_type === "PPMP_PROJECT") {
    toast.error("Cannot edit PPMP_PROJECT LASA rows");
    onClose();
  }

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fiscalYear: editData?.fiscal_year || currentYear,
      proponentId: editData?.proponent_id || null,
      projectTitle: editData?.project_title || "",
      fundSource: editData?.fund_source || "",
      plannedAmount: editData?.planned_amount || 0,
      saroNumber: editData?.saro_number || null,
    },
  });

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        form.reset({
          fiscalYear: editData.fiscal_year,
          proponentId: editData.proponent_id || null,
          projectTitle: editData.project_title,
          fundSource: editData.fund_source,
          plannedAmount: editData.planned_amount,
          saroNumber: editData.saro_number || null,
        });
      } else {
        form.reset({
          fiscalYear: currentYear,
          proponentId: null,
          projectTitle: "",
          fundSource: "",
          plannedAmount: 0,
          saroNumber: null,
        });
      }
    }
  }, [isOpen, editData, form]);

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    if (!user) {
      toast.error("User not found");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editData) {
        if (!canEdit) {
          toast.error("You do not have permission to edit this LASA row");
          return;
        }

        // Update existing LASA row
        await updateLasaRow(editData.id, {
          proponentId: data.proponentId ?? null,
          projectTitle: data.projectTitle.trim(),
          fundSource: data.fundSource.trim(),
          plannedAmount: data.plannedAmount || 0,
          saroNumber: data.saroNumber ?? null,
        });

        toast.success("LASA row updated successfully");
      } else {
        // Create new LASA row
        if (!user.system_user_id) {
          throw new Error(
            "User system ID not found. Please refresh and try again."
          );
        }

        const divisionId = user.division_id
          ? String(user.division_id)
          : process.env.NEXT_PUBLIC_DIVISION_ID || "";

        if (!divisionId) {
          throw new Error("Division ID not found");
        }

        await createLasaRow({
          divisionId,
          fiscalYear: data.fiscalYear,
          proponentId: data.proponentId ?? null,
          projectTitle: data.projectTitle.trim(),
          fundSource: data.fundSource.trim(),
          plannedAmount: data.plannedAmount || 0,
          saroNumber: data.saroNumber ?? null,
          createdBy: String(user.system_user_id),
        });

        toast.success("LASA row created successfully");
      }

      // Trigger refresh via callback
      onSubmitComplete?.();
      onClose();
    } catch (error) {
      console.error("Error saving LASA row:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditMode ? "update" : "create"} LASA row`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit LASA Row" : "Create LASA Row (Planning)"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the LASA row details. Note: PPMP_PROJECT rows cannot be edited."
              : "Create a new MANUAL LASA row for budget visibility. This is for planning purposes only and does not allocate or obligate funds."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fiscal Year */}
            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fiscal Year <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={String(field.value)}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fiscalYears.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proponent */}
            <FormField
              control={form.control}
              name="proponentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proponent (Optional)</FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? null)}
                      placeholder="Select proponent"
                      divisionId={
                        user?.division_id
                          ? String(user.division_id)
                          : process.env.NEXT_PUBLIC_DIVISION_ID || null
                      }
                      excludedTypes={[
                        "superintendent",
                        "office head",
                        "budget officer",
                        "procurement officer",
                      ]}
                      disabled={isEditMode && !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Title */}
            <FormField
              control={form.control}
              name="projectTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project / Program Name{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter project or program name"
                      disabled={isEditMode && !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fund Source */}
            <FormField
              control={form.control}
              name="fundSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fund Source <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., GAA, MOOE, SDF"
                      disabled={isEditMode && !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Planned Amount */}
            <FormField
              control={form.control}
              name="plannedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Amount (Optional/Indicative)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      placeholder="0.00"
                      disabled={isEditMode && !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SARO Number */}
            <FormField
              control={form.control}
              name="saroNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SARO Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Enter SARO number"
                      disabled={isEditMode && !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (isEditMode && !canEdit)}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update LASA Row"
                  : "Create LASA Row"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
