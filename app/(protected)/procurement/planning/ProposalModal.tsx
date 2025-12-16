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
import { generateProposalNumber } from "@/lib/procurement/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { useCurrentTenant } from "@/lib/tenant/hooks";
import { ProcurementProposal } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

type ItemType = ProcurementProposal;
const table = "procurement_proposals";
const title = "Proposal";

const FormSchema = z.object({
  type: z.enum(["PPMP", "APP"]),
  category: z.enum(["goods", "services", "infrastructure"]),
  level: z.enum(["school", "division"]),
  fiscalYear: z.number().min(2020).max(2100),
  quarter: z.number().min(1).max(4).optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  totalAmount: z.number().min(0, "Total amount must be greater than 0"),
  budgetSource: z.string().min(1, "Budget source is required"),
  fundCode: z.string().optional(),
});

type FormType = z.infer<typeof FormSchema>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null;
}

interface FileItem {
  url: string;
  name: string;
  isNew?: boolean;
  file?: File;
}

export const ProposalModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const dispatch = useAppDispatch();
  const { tenant } = useCurrentTenant();
  const user = useAppSelector((state) => state.user.user);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      type: editData ? editData.type : "PPMP",
      category: editData ? editData.category : "goods",
      level: editData
        ? editData.level
        : tenant?.schoolId
        ? "school"
        : "division",
      fiscalYear: editData ? editData.fiscal_year : new Date().getFullYear(),
      quarter: editData?.quarter || undefined,
      title: editData?.title || "",
      description: editData?.description || "",
      totalAmount: editData?.total_amount || 0,
      budgetSource: editData?.budget_source || "",
      fundCode: editData?.fund_code || "",
    },
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
      // Try parsing as JSON array
      const parsed = JSON.parse(documentUrl);
      if (Array.isArray(parsed)) {
        return parsed.map((url: string) => ({
          url,
          name: url.split("/").pop() || "document",
        }));
      }
      // If it's a single string (backward compatibility)
      return [
        { url: documentUrl, name: documentUrl.split("/").pop() || "document" },
      ];
    } catch {
      // If parsing fails, treat as single URL (backward compatibility)
      return [
        { url: documentUrl, name: documentUrl.split("/").pop() || "document" },
      ];
    }
  };

  const serializeDocumentUrls = (fileItems: FileItem[]): string | null => {
    const urls = fileItems.map((item) => item.url);
    return urls.length > 0 ? JSON.stringify(urls) : null;
  };

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    if (!tenant || !user?.system_user_id) {
      toast.error("Missing tenant or user information");
      return;
    }

    setIsSubmitting(true);

    try {
      // Separate existing files from new files to upload
      const existingFiles = files.filter((f) => !f.isNew);
      const newFiles = files.filter((f) => f.isNew && f.file);

      if (editData?.id) {
        // Update existing proposal
        // Upload new files first
        const uploadedUrls: string[] = [];
        if (newFiles.length > 0) {
          setUploadingFile(true);
          try {
            for (const fileItem of newFiles) {
              if (fileItem.file) {
                const url = await uploadFile(fileItem.file, editData.id);
                uploadedUrls.push(url);
              }
            }
          } catch (uploadErr) {
            setUploadingFile(false);
            throw uploadErr;
          }
          setUploadingFile(false);
        }

        // Combine existing URLs with newly uploaded URLs
        const allUrls = [...existingFiles.map((f) => f.url), ...uploadedUrls];
        const documentUrl = serializeDocumentUrls(
          allUrls.map((url) => ({
            url,
            name: url.split("/").pop() || "document",
          }))
        );

        const { error } = await supabase
          .from(table)
          .update({
            type: data.type,
            category: data.category,
            level: data.level,
            fiscal_year: data.fiscalYear,
            quarter: data.quarter || null,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            total_amount: data.totalAmount,
            budget_source: data.budgetSource.trim(),
            fund_code: data.fundCode?.trim() || null,
            document_url: documentUrl,
            school_id: data.level === "school" ? tenant.schoolId : null,
          })
          .eq("id", editData.id);

        if (error) throw new Error(error.message);

        // Fetch updated record
        const { data: updated } = await supabase
          .from(table)
          .select()
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        setFiles([]);
        onClose();
        toast.success("Proposal updated successfully!");
      } else {
        // Create new proposal first
        const proposalNumber = await generateProposalNumber(
          data.type,
          data.fiscalYear
        );

        const { data: inserted, error } = await supabase
          .from(table)
          .insert({
            proposal_number: proposalNumber,
            type: data.type,
            category: data.category,
            level: data.level,
            division_id: tenant.divisionId,
            school_id: data.level === "school" ? tenant.schoolId : null,
            fiscal_year: data.fiscalYear,
            quarter: data.quarter || null,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            total_amount: data.totalAmount,
            budget_source: data.budgetSource.trim(),
            fund_code: data.fundCode?.trim() || null,
            document_url: null, // Will be updated after file upload
            status: "draft",
            version: 1,
            submitted_by: user.system_user_id,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Upload files after proposal is created
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

            const documentUrl = serializeDocumentUrls(
              uploadedUrls.map((url) => ({
                url,
                name: url.split("/").pop() || "document",
              }))
            );

            const { error: updateError } = await supabase
              .from(table)
              .update({ document_url: documentUrl })
              .eq("id", inserted.id);

            if (updateError) throw updateError;

            inserted.document_url = documentUrl;
          } catch (uploadErr) {
            console.error("File upload error:", uploadErr);
            toast.error(
              "Proposal created but file upload failed. You can update it later."
            );
            // Don't fail the whole operation if upload fails
          }
          setUploadingFile(false);
        }

        dispatch(addItem(inserted));
        setFiles([]);
        onClose();
        toast.success("Proposal created successfully!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving proposal");
    } finally {
      setIsSubmitting(false);
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        type: editData ? editData.type : "PPMP",
        category: editData ? editData.category : "goods",
        level: editData
          ? editData.level
          : tenant?.schoolId
          ? "school"
          : "division",
        fiscalYear: editData ? editData.fiscal_year : new Date().getFullYear(),
        quarter: editData?.quarter || undefined,
        title: editData?.title || "",
        description: editData?.description || "",
        totalAmount: editData?.total_amount || 0,
        budgetSource: editData?.budget_source || "",
        fundCode: editData?.fund_code || "",
      });
      // Load existing files
      if (editData?.document_url) {
        setFiles(parseDocumentUrls(editData.document_url));
      } else {
        setFiles([]);
      }
    }
  }, [form, editData, isOpen, tenant]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const currentFiles = files;
    return () => {
      currentFiles.forEach((file) => {
        if (file.isNew && file.url.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Validate file type
      if (!validTypes.includes(file.type)) {
        toast.error(
          `${file.name} is not a valid file type. Please upload PDF or Word documents.`
        );
        continue;
      }
      // Validate file size (max 10MB)
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

    // Reset input
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    // Revoke object URL if it's a new file
    if (fileToRemove.isNew && fileToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const proposalType = form.watch("type");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData ? "Edit" : "Create"} {title}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update proposal information below."
              : "Fill in the details to create a new procurement proposal."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting || !!editData}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PPMP">PPMP</SelectItem>
                        <SelectItem value="APP">APP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Category <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="goods">Goods</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="infrastructure">
                          Infrastructure
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter proposal title"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter proposal description"
                      rows={4}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

              {proposalType === "APP" && (
                <FormField
                  control={form.control}
                  name="quarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Quarter
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value?.toString()}
                        disabled={isSubmitting}
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Total Amount <span className="text-red-500">*</span>
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

              <FormField
                control={form.control}
                name="budgetSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Budget Source <span className="text-red-500">*</span>
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

            <FormField
              control={form.control}
              name="fundCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Fund Code (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter fund code"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">
                Proposal Documents (Optional)
              </FormLabel>
              <div className="space-y-2">
                {/* Display existing and new files */}
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
                {isSubmitting || uploadingFile ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {uploadingFile
                      ? "Uploading..."
                      : editData
                      ? "Updating..."
                      : "Creating..."}
                  </span>
                ) : editData ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
