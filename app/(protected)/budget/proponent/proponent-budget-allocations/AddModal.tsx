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
import { Textarea } from "@/components/ui/textarea";
import { ExtendedUser } from "@/lib/redux/userSlice";
import {
  createBudgetAllocation,
  updateBudgetAllocation,
} from "@/lib/services/budget-allocations";
import { getLasaRows } from "@/lib/services/lasa";
import {
  BudgetAllocationWithRelations,
  LasaRowWithRelations,
} from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: BudgetAllocationWithRelations | null;
  user: ExtendedUser | null;
  onSubmitComplete?: () => void;
}

const FormSchema = z.object({
  allocationName: z.string().min(1, "Allocation name is required"),
  allocationAmount: z
    .number()
    .min(0, "Allocation amount must be 0 or greater")
    .positive("Allocation amount must be greater than 0"),
  fiscalYear: z.number().min(2020).max(2100),
  fundSource: z.string().min(1, "Fund source is required"),
  lasaId: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
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
  const [lasaOptions, setLasaOptions] = useState<LasaRowWithRelations[]>([]);

  const isEditMode = !!editData;

  // Fetch LASA options (only LASA rows where user is proponent)
  useEffect(() => {
    const fetchLasaOptions = async () => {
      if (!user?.system_user_id || !user?.division_id) return;
      try {
        const data = await getLasaRows({
          divisionId: String(user.division_id),
          proponentId: String(user.system_user_id),
        });
        setLasaOptions(data || []);
      } catch (error) {
        console.error("Failed to fetch LASA options:", error);
      }
    };
    if (isOpen) {
      fetchLasaOptions();
    }
  }, [isOpen, user?.system_user_id, user?.division_id]);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      allocationName: editData?.allocation_name || "",
      allocationAmount: editData?.allocation_amount || 0,
      fiscalYear: editData?.fiscal_year || currentYear,
      fundSource: editData?.fund_source || "",
      lasaId: editData?.lasa_id || null,
      remarks: editData?.remarks || null,
    },
  });

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        form.reset({
          allocationName: editData.allocation_name,
          allocationAmount: editData.allocation_amount,
          fiscalYear: editData.fiscal_year,
          fundSource: editData.fund_source,
          lasaId: editData.lasa_id || null,
          remarks: editData.remarks || null,
        });
      } else {
        form.reset({
          allocationName: "",
          allocationAmount: 0,
          fiscalYear: currentYear,
          fundSource: "",
          lasaId: null,
          remarks: null,
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
        // Update existing budget allocation
        await updateBudgetAllocation(editData.id, {
          allocationName: data.allocationName.trim(),
          allocationAmount: data.allocationAmount,
          fundSource: data.fundSource.trim(),
          remarks: data.remarks || null,
          lasaId: data.lasaId || null,
          proponentId: String(user.system_user_id), // Always set proponent to current user
        });

        toast.success("Budget allocation updated successfully");
      } else {
        // Create new budget allocation
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

        await createBudgetAllocation({
          divisionId,
          fiscalYear: data.fiscalYear,
          allocationName: data.allocationName.trim(),
          allocationAmount: data.allocationAmount,
          fundSource: data.fundSource.trim(),
          status: "draft", // Default status for new allocations
          remarks: data.remarks || null,
          lasaId: data.lasaId || null,
          proponentId: String(user.system_user_id), // Set proponent to current user
          createdBy: String(user.system_user_id),
        });

        toast.success("Budget allocation created successfully");
      }

      // Trigger refresh via callback
      onSubmitComplete?.();
      onClose();
    } catch (error) {
      console.error("Error saving budget allocation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditMode ? "update" : "create"} budget allocation`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Budget Allocation" : "Create Budget Allocation"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the budget allocation details."
              : "Create a new budget allocation. You will be automatically assigned as the proponent."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Proponent Display (Read-only) */}
            {user && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Proponent
                    </p>
                    <p className="text-base font-semibold mt-1">
                      {user.name || user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Allocation Name */}
                <FormField
                  control={form.control}
                  name="allocationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Allocation Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter allocation name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
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

                {/* LASA */}
                <FormField
                  control={form.control}
                  name="lasaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LASA (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "NONE" ? null : value)
                        }
                        value={field.value || "NONE"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select LASA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {lasaOptions.map((lasa) => (
                            <SelectItem key={lasa.id} value={lasa.id}>
                              {lasa.project_title} (FY {lasa.fiscal_year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Allocation Amount */}
                <FormField
                  control={form.control}
                  name="allocationAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Allocation Amount{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value)
                            )
                          }
                          placeholder="0.00"
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
                        <Input {...field} placeholder="e.g., GAA, MOOE, SDF" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Remarks - Full Width */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Enter remarks or notes"
                      rows={3}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update Allocation"
                  : "Create Allocation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
