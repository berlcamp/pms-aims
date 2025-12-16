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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { generateProposalNumber } from "@/lib/procurement/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { useCurrentTenant } from "@/lib/tenant/hooks";
import { ProcurementProposal } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const itemSchema = z.object({
  general_description: z.string().min(1, "General description is required"),
  project_objective: z.string().min(1, "Project objective is required"),
  project_type: z.enum(["goods", "infrastructure", "consulting_services"]),
  quantity_size: z.string().min(1, "Quantity and size is required"),
  recommended_mode_of_procurement: z
    .string()
    .min(1, "Recommended mode of procurement is required"),
  pre_procurement_conference: z.boolean().default(false),
  start_of_procurement_activity: z.string().min(1, "Start date is required"),
  end_of_procurement_activity: z.string().min(1, "End date is required"),
  expected_delivery_period: z
    .string()
    .min(1, "Expected delivery period is required"),
  estimated_budget: z
    .number()
    .min(0, "Estimated budget must be greater than or equal to 0"),
});

const FormSchema = z.object({
  fiscalYear: z.number().min(2020).max(2100),
  level: z.enum(["school", "division"]),
  source_of_funds: z.string().min(1, "Source of funds is required"),
  ppmp_remarks: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  changeReason: z.string().optional(),
});

type FormType = z.infer<typeof FormSchema>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ProcurementProposal | null;
  parentVersion?: ProcurementProposal | null;
}

interface FileItem {
  url: string;
  name: string;
  isNew?: boolean;
  file?: File;
}

export const PPMPModal = ({
  isOpen,
  onClose,
  editData,
  parentVersion,
}: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const dispatch = useAppDispatch();
  const { tenant } = useCurrentTenant();
  const user = useAppSelector((state) => state.user.user);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fiscalYear: editData?.fiscal_year || new Date().getFullYear(),
      level: editData?.level || (tenant?.schoolId ? "school" : "division"),
      source_of_funds:
        editData?.source_of_funds || editData?.budget_source || "",
      ppmp_remarks: editData?.ppmp_remarks || editData?.description || "",
      items: [],
      changeReason: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const uploadFile = async (
    file: File,
    proposalId: string
  ): Promise<string> => {
    const fileName = `${proposalId}/${Date.now()}-${file.name}`;
    const filePath = `procurement-proposals/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("procurement_documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("procurement_documents").getPublicUrl(filePath);

    return publicUrl;
  };

  const parseDocumentUrls = (
    documentUrl: string | null | undefined
  ): FileItem[] => {
    if (!documentUrl) return [];
    try {
      const parsed = JSON.parse(documentUrl);
      if (Array.isArray(parsed)) {
        return parsed.map((url: string) => ({
          url,
          name: url.split("/").pop() || "document",
        }));
      }
      return [
        { url: documentUrl, name: documentUrl.split("/").pop() || "document" },
      ];
    } catch {
      return [
        { url: documentUrl, name: documentUrl.split("/").pop() || "document" },
      ];
    }
  };

  const serializeDocumentUrls = (fileItems: FileItem[]): string | null => {
    const urls = fileItems.map((item) => item.url);
    return urls.length > 0 ? JSON.stringify(urls) : null;
  };

  // Load items when editing
  useEffect(() => {
    if (isOpen && editData?.id) {
      setLoadingItems(true);
      supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", editData.id)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error loading items:", error);
            toast.error("Failed to load items");
          } else {
            form.setValue(
              "items",
              (data || []).map((item) => ({
                general_description:
                  item.general_description || item.item_name || "",
                project_objective:
                  item.project_objective || item.description || "",
                project_type:
                  (item.project_type as
                    | "goods"
                    | "infrastructure"
                    | "consulting_services") || "goods",
                quantity_size: item.quantity_size || "",
                recommended_mode_of_procurement:
                  item.recommended_mode_of_procurement || "",
                pre_procurement_conference:
                  item.pre_procurement_conference || false,
                start_of_procurement_activity:
                  item.start_of_procurement_activity
                    ? new Date(item.start_of_procurement_activity)
                        .toISOString()
                        .split("T")[0]
                    : "",
                end_of_procurement_activity: item.end_of_procurement_activity
                  ? new Date(item.end_of_procurement_activity)
                      .toISOString()
                      .split("T")[0]
                  : "",
                expected_delivery_period: item.expected_delivery_period || "",
                estimated_budget:
                  item.total_amount || item.estimated_budget || 0,
              }))
            );
          }
          setLoadingItems(false);
        });

      // Load files
      if (editData.document_url) {
        setFiles(parseDocumentUrls(editData.document_url));
      }
    } else if (isOpen && !editData) {
      // Add one empty item for new PPMP
      form.setValue("items", [
        {
          general_description: "",
          project_objective: "",
          project_type: "goods",
          quantity_size: "",
          recommended_mode_of_procurement: "",
          pre_procurement_conference: false,
          start_of_procurement_activity: "",
          end_of_procurement_activity: "",
          expected_delivery_period: "",
          estimated_budget: 0,
        },
      ]);
      setFiles([]);
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
      const totalAmount = data.items.reduce(
        (sum, item) => sum + item.estimated_budget,
        0
      );

      // Handle file uploads
      const existingFiles = files.filter((f) => !f.isNew);
      const newFiles = files.filter((f) => f.isNew && f.file);

      let documentUrl = serializeDocumentUrls(existingFiles);

      if (editData?.id) {
        // Update existing PPMP
        if (newFiles.length > 0) {
          setUploadingFile(true);
          try {
            const uploadedUrls: string[] = [];
            for (const fileItem of newFiles) {
              if (fileItem.file) {
                const url = await uploadFile(fileItem.file, editData.id);
                uploadedUrls.push(url);
              }
            }
            const allUrls = [
              ...existingFiles.map((f) => f.url),
              ...uploadedUrls,
            ];
            documentUrl = serializeDocumentUrls(
              allUrls.map((url) => ({
                url,
                name: url.split("/").pop() || "document",
              }))
            );
          } catch (uploadErr) {
            setUploadingFile(false);
            throw uploadErr;
          }
          setUploadingFile(false);
        }

        const { error: updateError } = await supabase
          .from("procurement_proposals")
          .update({
            level: data.level,
            fiscal_year: data.fiscalYear,
            source_of_funds: data.source_of_funds.trim(),
            estimated_budget: totalAmount,
            total_amount: totalAmount,
            budget_source: data.source_of_funds.trim(),
            ppmp_remarks: data.ppmp_remarks?.trim() || null,
            description: data.ppmp_remarks?.trim() || null,
            school_id: data.level === "school" ? tenant.schoolId : null,
            document_url: documentUrl,
          })
          .eq("id", editData.id);

        if (updateError) throw new Error(updateError.message);

        // Delete existing items
        await supabase
          .from("proposal_items")
          .delete()
          .eq("proposal_id", editData.id);

        // Insert new items
        const itemsToInsert = data.items.map((item) => ({
          proposal_id: editData.id,
          item_name: item.general_description.trim(),
          description: item.project_objective.trim(),
          general_description: item.general_description.trim(),
          project_objective: item.project_objective.trim(),
          project_type: item.project_type,
          quantity_size: item.quantity_size.trim(),
          recommended_mode_of_procurement:
            item.recommended_mode_of_procurement.trim(),
          pre_procurement_conference: item.pre_procurement_conference,
          start_of_procurement_activity:
            item.start_of_procurement_activity || null,
          end_of_procurement_activity: item.end_of_procurement_activity || null,
          expected_delivery_period: item.expected_delivery_period.trim(),
          total_amount: item.estimated_budget,
          estimated_budget: item.estimated_budget,
          quantity: 1,
          unit: "lot",
          unit_price: item.estimated_budget,
        }));

        const { error: itemsError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert);

        if (itemsError) throw new Error(itemsError.message);

        // Fetch updated record
        const { data: updated } = await supabase
          .from("procurement_proposals")
          .select()
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        setFiles([]);
        onClose();
        toast.success("PPMP updated successfully!");
      } else {
        // Create new PPMP
        const proposalNumber = await generateProposalNumber(
          "PPMP",
          data.fiscalYear
        );
        const version = parentVersion ? parentVersion.version + 1 : 1;

        const { data: inserted, error } = await supabase
          .from("procurement_proposals")
          .insert({
            proposal_number: proposalNumber,
            type: "PPMP",
            category: "goods",
            level: data.level,
            division_id: tenant.divisionId,
            school_id: data.level === "school" ? tenant.schoolId : null,
            fiscal_year: data.fiscalYear,
            title: `PPMP ${data.fiscalYear}`,
            description: data.ppmp_remarks?.trim() || null,
            total_amount: totalAmount,
            estimated_budget: totalAmount,
            budget_source: data.source_of_funds.trim(),
            source_of_funds: data.source_of_funds.trim(),
            ppmp_remarks: data.ppmp_remarks?.trim() || null,
            status: "draft",
            version: version,
            parent_proposal_id: parentVersion?.id || null,
            change_reason: data.changeReason?.trim() || null,
            submitted_by: user.system_user_id,
            document_url: null,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Upload files
        if (newFiles.length > 0 && inserted?.id) {
          try {
            setUploadingFile(true);
            const uploadedUrls: string[] = [];
            for (const fileItem of newFiles) {
              if (fileItem.file) {
                const url = await uploadFile(fileItem.file, inserted.id);
                uploadedUrls.push(url);
              }
            }
            documentUrl = serializeDocumentUrls(
              uploadedUrls.map((url) => ({
                url,
                name: url.split("/").pop() || "document",
              }))
            );

            await supabase
              .from("procurement_proposals")
              .update({ document_url: documentUrl })
              .eq("id", inserted.id);
          } catch (uploadErr) {
            console.error("File upload error:", uploadErr);
            toast.error(
              "PPMP created but file upload failed. You can update it later."
            );
          }
          setUploadingFile(false);
        }

        // Insert items
        const itemsToInsert = data.items.map((item) => ({
          proposal_id: inserted.id,
          item_name: item.general_description.trim(),
          description: item.project_objective.trim(),
          general_description: item.general_description.trim(),
          project_objective: item.project_objective.trim(),
          project_type: item.project_type,
          quantity_size: item.quantity_size.trim(),
          recommended_mode_of_procurement:
            item.recommended_mode_of_procurement.trim(),
          pre_procurement_conference: item.pre_procurement_conference,
          start_of_procurement_activity:
            item.start_of_procurement_activity || null,
          end_of_procurement_activity: item.end_of_procurement_activity || null,
          expected_delivery_period: item.expected_delivery_period.trim(),
          total_amount: item.estimated_budget,
          estimated_budget: item.estimated_budget,
          quantity: 1,
          unit: "lot",
          unit_price: item.estimated_budget,
        }));

        const { error: itemsError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert);

        if (itemsError) throw new Error(itemsError.message);

        dispatch(addItem(inserted));
        setFiles([]);
        onClose();
        toast.success("PPMP created successfully!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving PPMP");
    } finally {
      setIsSubmitting(false);
      setUploadingFile(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setFiles([]);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const newFiles: FileItem[] = [];
    for (const file of selectedFiles) {
      if (!validTypes.includes(file.type)) {
        toast.error(
          `${file.name} is not a valid file type. Please upload PDF or Word documents.`
        );
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit.`);
        continue;
      }
      newFiles.push({
        url: URL.createObjectURL(file),
        name: file.name,
        isNew: true,
        file,
      });
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }

    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.isNew && fileToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData
              ? "Edit"
              : parentVersion
              ? "Create New Version"
              : "Create"}{" "}
            PPMP
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update PPMP information below."
              : parentVersion
              ? `Creating version ${parentVersion.version + 1} of ${
                  parentVersion.proposal_number
                }`
              : "Fill in the details to create a new Project Procurement Management Plan."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="source_of_funds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      9. Source of Funds <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., GAA, MOOE, SDF"
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

            {/* Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium">
                  Procurement Items <span className="text-red-500">*</span>
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      general_description: "",
                      project_objective: "",
                      project_type: "goods",
                      quantity_size: "",
                      recommended_mode_of_procurement: "",
                      pre_procurement_conference: false,
                      start_of_procurement_activity: "",
                      end_of_procurement_activity: "",
                      expected_delivery_period: "",
                      estimated_budget: 0,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {loadingItems ? (
                <div className="text-center py-4">Loading items...</div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">
                          1. General Description and Objective
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          2. Type of Project
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          3. Quantity and Size
                        </TableHead>
                        <TableHead className="min-w-[150px]">
                          4. Recommended Mode of Procurement
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          5. Pre-Procurement Conference
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          6. Start of Procurement Activity
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          7. End of Procurement Activity
                        </TableHead>
                        <TableHead className="min-w-[150px]">
                          8. Expected Delivery Period
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          10. Estimated Budget (PhP)
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div className="space-y-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.general_description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="General description"
                                        className="h-9 text-xs"
                                        disabled={isSubmitting}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.project_objective`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Project objective"
                                        rows={2}
                                        className="text-xs"
                                        disabled={isSubmitting}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.project_type`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="goods">
                                        Goods
                                      </SelectItem>
                                      <SelectItem value="infrastructure">
                                        Infrastructure
                                      </SelectItem>
                                      <SelectItem value="consulting_services">
                                        Consulting Services
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity_size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Quantity/Size"
                                      className="h-9 text-xs"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.recommended_mode_of_procurement`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="small_value_procurement">
                                        Small Value
                                      </SelectItem>
                                      <SelectItem value="shopping">
                                        Shopping
                                      </SelectItem>
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
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.pre_procurement_conference`}
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-center">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={(e) =>
                                        field.onChange(e.target.checked)
                                      }
                                      className="h-4 w-4"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.start_of_procurement_activity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      className="h-9 text-xs"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.end_of_procurement_activity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      className="h-9 text-xs"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.expected_delivery_period`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="e.g., 30 days"
                                      className="h-9 text-xs"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.estimated_budget`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 text-xs"
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={isSubmitting || fields.length === 1}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="text-right text-sm font-medium">
                Total Estimated Budget: ₱
                {form
                  .watch("items")
                  .reduce((sum, item) => sum + item.estimated_budget, 0)
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">
                11. Attached Supporting Documents
              </FormLabel>
              <div className="space-y-2">
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((fileItem, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 border rounded-md ${
                          fileItem.isNew ? "bg-blue-50" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg
                            className="w-5 h-5 text-gray-500 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="text-sm text-gray-700 truncate">
                            {fileItem.name}
                          </span>
                          {fileItem.isNew && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!fileItem.isNew && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = fileItem.url;
                                link.target = "_blank";
                                link.download = fileItem.name;
                                link.click();
                              }}
                              className="h-8"
                            >
                              View
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={isSubmitting || uploadingFile}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={isSubmitting || uploadingFile}
                    className="h-10"
                    multiple
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Upload PDF or Word documents (max 10MB per file). You can add
                  multiple files.
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="ppmp_remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    12. Remarks
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter remarks"
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={isSubmitting || uploadingFile}
                className="h-10 min-w-[100px]"
              >
                {isSubmitting || uploadingFile
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
