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
import { generateProposalNumber } from "@/lib/procurement/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { useCurrentTenant } from "@/lib/tenant/hooks";
import { ProcurementProposal } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const FormSchema = z.object({
  pap_code: z.string().min(1, "PAP Code is required"),
  procurement_project: z.string().min(1, "Procurement Project is required"),
  pmo_end_user: z.string().min(1, "PMO/End-User is required"),
  is_early_procurement: z.boolean().default(false),
  mode_of_procurement: z.string().min(1, "Mode of Procurement is required"),
  advertisement_posting_date: z.string().optional(),
  submission_opening_date: z.string().optional(),
  notice_of_award_date: z.string().optional(),
  contract_signing_date: z.string().optional(),
  source_of_funds: z.string().min(1, "Source of Funds is required"),
  estimated_budget: z
    .number()
    .min(0, "Estimated Budget must be greater than 0"),
  remarks: z.string().optional(),
  quarter: z.number().min(1).max(4),
  fiscalYear: z.number().min(2020).max(2100),
  consolidated_ppmp_ids: z
    .array(z.string())
    .min(1, "At least one PPMP must be selected"),
  changeReason: z.string().optional(),
});

type FormType = z.infer<typeof FormSchema>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ProcurementProposal | null;
  parentVersion?: ProcurementProposal | null;
}

export const APPModal = ({
  isOpen,
  onClose,
  editData,
  parentVersion,
}: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ppmpList, setPpmpList] = useState<ProcurementProposal[]>([]);
  const [loadingPpmp, setLoadingPpmp] = useState(false);
  const dispatch = useAppDispatch();
  const { tenant } = useCurrentTenant();
  const user = useAppSelector((state) => state.user.user);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pap_code: editData?.pap_code || "",
      procurement_project: editData?.title || "",
      pmo_end_user: editData?.pmo_end_user || "",
      is_early_procurement: editData?.is_early_procurement || false,
      mode_of_procurement: "",
      advertisement_posting_date: editData?.advertisement_posting_date
        ? new Date(editData.advertisement_posting_date)
            .toISOString()
            .split("T")[0]
        : "",
      submission_opening_date: editData?.submission_opening_date
        ? new Date(editData.submission_opening_date).toISOString().split("T")[0]
        : "",
      notice_of_award_date: editData?.notice_of_award_date
        ? new Date(editData.notice_of_award_date).toISOString().split("T")[0]
        : "",
      contract_signing_date: editData?.contract_signing_date
        ? new Date(editData.contract_signing_date).toISOString().split("T")[0]
        : "",
      source_of_funds: editData?.budget_source || "",
      estimated_budget:
        editData?.total_amount || editData?.estimated_budget || 0,
      remarks: editData?.description || "",
      quarter: editData?.quarter || 1,
      fiscalYear: editData?.fiscal_year || new Date().getFullYear(),
      consolidated_ppmp_ids: [],
      changeReason: "",
    },
  });

  // Load available PPMPs for consolidation
  useEffect(() => {
    if (isOpen && !editData) {
      setLoadingPpmp(true);
      supabase
        .from("procurement_proposals")
        .select("*")
        .eq("type", "PPMP")
        .eq("division_id", tenant?.divisionId || "")
        .eq("status", "approved")
        .is("deleted_at", null)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error loading PPMPs:", error);
            toast.error("Failed to load PPMPs");
          } else {
            setPpmpList(data || []);
          }
          setLoadingPpmp(false);
        });
    }
  }, [isOpen, editData, tenant]);

  // Load consolidated PPMPs when editing
  useEffect(() => {
    if (isOpen && editData?.id) {
      supabase
        .from("app_ppmp_consolidations")
        .select("ppmp_id")
        .eq("app_id", editData.id)
        .then(({ data }) => {
          if (data) {
            form.setValue(
              "consolidated_ppmp_ids",
              data.map((item) => item.ppmp_id.toString())
            );
          }
        });
    }
  }, [isOpen, editData, form]);

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    if (!tenant || !user?.system_user_id) {
      toast.error("Missing tenant or user information");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editData?.id) {
        // Update existing APP
        const { error: updateError } = await supabase
          .from("procurement_proposals")
          .update({
            pap_code: data.pap_code.trim(),
            pmo_end_user: data.pmo_end_user.trim(),
            is_early_procurement: data.is_early_procurement,
            title: data.procurement_project.trim(),
            description: data.remarks?.trim() || null,
            total_amount: data.estimated_budget,
            estimated_budget: data.estimated_budget,
            budget_source: data.source_of_funds.trim(),
            quarter: data.quarter,
            fiscal_year: data.fiscalYear,
            advertisement_posting_date: data.advertisement_posting_date || null,
            submission_opening_date: data.submission_opening_date || null,
            notice_of_award_date: data.notice_of_award_date || null,
            contract_signing_date: data.contract_signing_date || null,
          })
          .eq("id", editData.id);

        if (updateError) throw new Error(updateError.message);

        // Update consolidations
        await supabase
          .from("app_ppmp_consolidations")
          .delete()
          .eq("app_id", editData.id);

        const consolidations = data.consolidated_ppmp_ids.map((ppmpId) => ({
          app_id: editData.id,
          ppmp_id: parseInt(ppmpId),
        }));

        await supabase.from("app_ppmp_consolidations").insert(consolidations);

        // Fetch updated record
        const { data: updated } = await supabase
          .from("procurement_proposals")
          .select()
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        onClose();
        toast.success("APP updated successfully!");
      } else {
        // Create new APP
        const proposalNumber = await generateProposalNumber(
          "APP",
          data.fiscalYear
        );
        const version = parentVersion ? parentVersion.version + 1 : 1;

        const { data: inserted, error } = await supabase
          .from("procurement_proposals")
          .insert({
            proposal_number: proposalNumber,
            type: "APP",
            category: "goods",
            level: tenant?.schoolId ? "school" : "division",
            division_id: tenant.divisionId,
            school_id: tenant?.schoolId || null,
            fiscal_year: data.fiscalYear,
            quarter: data.quarter,
            title: data.procurement_project.trim(),
            description: data.remarks?.trim() || null,
            total_amount: data.estimated_budget,
            estimated_budget: data.estimated_budget,
            budget_source: data.source_of_funds.trim(),
            pap_code: data.pap_code.trim(),
            pmo_end_user: data.pmo_end_user.trim(),
            is_early_procurement: data.is_early_procurement,
            advertisement_posting_date: data.advertisement_posting_date || null,
            submission_opening_date: data.submission_opening_date || null,
            notice_of_award_date: data.notice_of_award_date || null,
            contract_signing_date: data.contract_signing_date || null,
            status: "draft",
            version: version,
            parent_proposal_id: parentVersion?.id || null,
            change_reason: data.changeReason?.trim() || null,
            submitted_by: user.system_user_id,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Create consolidations
        const consolidations = data.consolidated_ppmp_ids.map((ppmpId) => ({
          app_id: inserted.id,
          ppmp_id: parseInt(ppmpId),
        }));

        const { error: consolidationError } = await supabase
          .from("app_ppmp_consolidations")
          .insert(consolidations);

        if (consolidationError) throw new Error(consolidationError.message);

        dispatch(addItem(inserted));
        onClose();
        toast.success("APP created successfully!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving APP");
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData
              ? "Edit"
              : parentVersion
              ? "Create New Version"
              : "Create"}{" "}
            APP
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update APP information below."
              : parentVersion
              ? `Creating version ${parentVersion.version + 1} of ${
                  parentVersion.proposal_number
                }`
              : "Fill in the details to create a new Annual Procurement Plan."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pap_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Code (PAP) <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter PAP code"
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
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Fiscal Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2025"
                        className="h-10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        value={field.value || ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="procurement_project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Procurement Project <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter procurement project"
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
              name="pmo_end_user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    PMO/End-User <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter PMO/End-User"
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
              name="is_early_procurement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Is this an Early Procurement Activity?
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mode_of_procurement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Mode of Procurement{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small_value_procurement">
                          Small Value Procurement
                        </SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="agency_to_agency">
                          Agency-to-Agency
                        </SelectItem>
                        <SelectItem value="public_bidding">
                          Public Bidding
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quarter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Quarter <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select quarter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="advertisement_posting_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Advertisement/Posting of IB/REI
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="submission_opening_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Submission/Opening of Bids
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notice_of_award_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Notice of Award
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="contract_signing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Contract Signing
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_of_funds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Source of Funds <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., GAA"
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
                name="estimated_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Estimated Budget (PhP){" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        value={field.value || ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of project"
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PPMP Consolidation */}
            {!editData && (
              <div className="space-y-3">
                <FormLabel className="text-sm font-medium">
                  Select PPMPs to Consolidate{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                {loadingPpmp ? (
                  <div className="text-center py-4">Loading PPMPs...</div>
                ) : (
                  <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
                    {ppmpList.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No approved PPMPs available for consolidation.
                      </p>
                    ) : (
                      ppmpList.map((ppmp) => (
                        <FormField
                          key={ppmp.id}
                          control={form.control}
                          name="consolidated_ppmp_ids"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      ppmp.id.toString()
                                    )}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            ppmp.id.toString(),
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== ppmp.id.toString()
                                            )
                                          );
                                    }}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex-1">
                                  <div className="font-medium">
                                    {ppmp.proposal_number}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {ppmp.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ₱{ppmp.total_amount.toLocaleString()}
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
                <FormMessage>
                  {form.formState.errors.consolidated_ppmp_ids?.message}
                </FormMessage>
              </div>
            )}

            {parentVersion && (
              <FormField
                control={form.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Reason for Change <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you're creating a new version"
                        rows={3}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {isSubmitting
                  ? editData
                    ? "Updating..."
                    : "Creating..."
                  : editData
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
