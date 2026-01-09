"use client";

import { FileUpload, UploadedFile } from "@/components/ppmp/FileUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper, StepperStep } from "@/components/ui/stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getLasaRowsForPPMPCreation } from "@/lib/services/lasa";
import { createPPMP, submitPPMP, updatePPMP } from "@/lib/services/ppmp";
import { supabase } from "@/lib/supabase/client";
import {
  LasaRowWithRelations,
  Office,
  PPMPWithRelations,
  School,
  User,
} from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Calculator,
  Calendar,
  Clock,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

interface CreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: PPMPWithRelations | null;
  onSubmitComplete?: () => void;
}

// Form Schema for Step 1
const step1Schema = z.object({
  fiscalYear: z.number().min(2020).max(2100),
  projectTitle: z.string().min(1, "Project title is required"),
  generalDescription: z.string().min(1, "General description is required"),
  objective: z.string().min(1, "Objective is required"),
  projectType: z.enum(["GOODS", "INFRASTRUCTURE", "CONSULTING_SERVICES"]),
});

// Form Schema for Step 3 (Items)
const itemSchema = z.object({
  itemDescription: z.string().min(1, "Item description is required"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  sizeSpecification: z.string().optional(),
  estimatedUnitCost: z
    .number()
    .min(0, "Unit cost must be greater than or equal to 0"),
  estimatedTotalCost: z.number().min(0),
});

// Form Schema for Step 4
const step4Schema = z
  .object({
    suggestedModeOfProcurement: z.string().optional(),
    procurementStartMonth: z.number().min(1).max(12).optional(),
    procurementStartYear: z.number().min(2020).max(2100).optional(),
    procurementEndMonth: z.number().min(1).max(12).optional(),
    procurementEndYear: z.number().min(2020).max(2100).optional(),
    deliveryStartMonth: z.number().min(1).max(12).optional(),
    deliveryStartYear: z.number().min(2020).max(2100).optional(),
    deliveryEndMonth: z.number().min(1).max(12).optional(),
    deliveryEndYear: z.number().min(2020).max(2100).optional(),
  })
  .superRefine((data, ctx) => {
    // Validate procurement dates - only validate if both start and end years are provided
    if (
      data.procurementStartYear !== undefined &&
      data.procurementEndYear !== undefined
    ) {
      if (data.procurementStartYear > data.procurementEndYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Procurement end date must be after start date",
          path: ["procurementEndYear"],
        });
      } else if (
        data.procurementStartYear === data.procurementEndYear &&
        data.procurementStartMonth !== undefined &&
        data.procurementEndMonth !== undefined &&
        data.procurementStartMonth > data.procurementEndMonth
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Procurement end date must be after start date",
          path: ["procurementEndYear"],
        });
      }
    }
    // Validate delivery dates - only validate if both start and end years are provided
    if (
      data.deliveryStartYear !== undefined &&
      data.deliveryEndYear !== undefined
    ) {
      if (data.deliveryStartYear > data.deliveryEndYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery end date must be after start date",
          path: ["deliveryEndYear"],
        });
      } else if (
        data.deliveryStartYear === data.deliveryEndYear &&
        data.deliveryStartMonth !== undefined &&
        data.deliveryEndMonth !== undefined &&
        data.deliveryStartMonth > data.deliveryEndMonth
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery end date must be after start date",
          path: ["deliveryEndYear"],
        });
      }
    }
  });

// Form Schema for Step 5
const step5Schema = z.object({
  sourceOfFunds: z.string().min(1, "Source of funds is required"),
  totalBudgetAmount: z.number().min(0.01, "Budget must be greater than 0"),
  budgetOverrideJustification: z.string().optional(),
  lasaId: z.string().optional(),
});

// Form Schema for Step 6 (Attachments handled separately)

// Form Schema for Step 7
const step7Schema = z.object({
  remarks: z.string().optional(),
  basisOfRevision: z.string().optional(),
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step4FormData = z.infer<typeof step4Schema>;
type Step5FormData = z.infer<typeof step5Schema>;
type Step7FormData = z.infer<typeof step7Schema>;
type ItemFormData = z.infer<typeof itemSchema>;

const steps: StepperStep[] = [
  { id: "1", label: "Header & Project Info", description: "Basic information" },
  { id: "2", label: "Itemization", description: "Items" },
  { id: "3", label: "Procurement Schedule", description: "Timeline" },
  { id: "4", label: "Budget & Funding", description: "Financial details" },
  { id: "5", label: "Attachments", description: "Documents" },
  { id: "6", label: "Remarks & Submit", description: "Finalize" },
];

export function CreateWizard({
  isOpen,
  onClose,
  editData,
  onSubmitComplete,
}: CreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableOffices, setAvailableOffices] = useState<Office[]>([]);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [ppmpId, setPpmpId] = useState<string | null>(null);
  const [lasaRows, setLasaRows] = useState<LasaRowWithRelations[]>([]);
  const [loadingLasa, setLoadingLasa] = useState(false);
  // Step 3 modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<ItemFormData>({
    itemDescription: "",
    unitOfMeasure: "",
    quantity: 0,
    sizeSpecification: "",
    estimatedUnitCost: 0,
    estimatedTotalCost: 0,
  });

  // Form instances for each step
  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fiscalYear: new Date().getFullYear(),
      projectTitle: "",
      generalDescription: "",
      objective: "",
      projectType: "GOODS",
    },
  });

  const step4Form = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      suggestedModeOfProcurement: "",
      procurementStartMonth: undefined,
      procurementStartYear: undefined,
      procurementEndMonth: undefined,
      procurementEndYear: undefined,
      deliveryStartMonth: undefined,
      deliveryStartYear: undefined,
      deliveryEndMonth: undefined,
      deliveryEndYear: undefined,
    },
  });

  const step5Form = useForm<Step5FormData>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      sourceOfFunds: "",
      totalBudgetAmount: 0,
      lasaId: undefined,
    },
    mode: "onChange",
  });

  const step7Form = useForm<Step7FormData>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      remarks: "",
      basisOfRevision: "",
    },
  });

  // Fetch user and offices/schools
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: systemUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .single();

      if (systemUser) {
        setUser(systemUser as User);
      }

      // Fetch offices
      const { data: offices } = await supabase
        .from("offices")
        .select("*")
        .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
        .eq("is_active", true)
        .order("name");

      if (offices) setAvailableOffices(offices as Office[]);

      // Fetch schools
      const { data: schools } = await supabase
        .from("schools")
        .select("*")
        .eq("division_id", process.env.NEXT_PUBLIC_DIVISION_ID)
        .eq("is_active", true)
        .order("name");

      if (schools) setAvailableSchools(schools as School[]);
    };

    fetchData();
  }, [isOpen]);

  // Load edit data
  useEffect(() => {
    if (editData && isOpen) {
      step1Form.reset({
        fiscalYear: editData.fiscal_year,
        projectTitle: editData.project_title,
        generalDescription: editData.general_description,
        objective: editData.objective,
        projectType: editData.project_type,
      });

      step4Form.reset({
        suggestedModeOfProcurement:
          editData.suggested_mode_of_procurement || "",
        procurementStartMonth: editData.procurement_start_month || undefined,
        procurementStartYear: editData.procurement_start_year || undefined,
        procurementEndMonth: editData.procurement_end_month || undefined,
        procurementEndYear: editData.procurement_end_year || undefined,
        deliveryStartMonth: editData.delivery_start_month || undefined,
        deliveryStartYear: editData.delivery_start_year || undefined,
        deliveryEndMonth: editData.delivery_end_month || undefined,
        deliveryEndYear: editData.delivery_end_year || undefined,
      });

      step5Form.reset({
        sourceOfFunds: editData.source_of_funds,
        totalBudgetAmount: editData.total_budget_amount,
        budgetOverrideJustification:
          editData.budget_override_justification || undefined,
        lasaId: editData.lasa_id ? String(editData.lasa_id) : undefined,
      });

      step7Form.reset({
        remarks: editData.remarks || undefined,
        basisOfRevision: editData.basis_of_revision || undefined,
      });

      // Load items
      if (editData.items && editData.items.length > 0) {
        const loadedItems: ItemFormData[] = editData.items.map((item) => ({
          itemDescription: item.item_description,
          unitOfMeasure: item.unit_of_measure,
          quantity: item.quantity,
          sizeSpecification: item.size_specification || "",
          estimatedUnitCost: item.estimated_unit_cost,
          estimatedTotalCost: item.estimated_total_cost,
        }));
        setItems(loadedItems);
      } else {
        setItems([]);
      }

      // Load attachments
      if (editData.attachments && editData.attachments.length > 0) {
        const loadedAttachments: UploadedFile[] = editData.attachments.map(
          (att) => ({
            id: att.id,
            documentType: att.document_type,
            fileName: att.file_name,
            fileUrl: att.file_url,
            fileSize: att.file_size || undefined,
            mimeType: att.mime_type || undefined,
            isRequired: att.is_required,
          })
        );
        setAttachments(loadedAttachments);
      } else {
        setAttachments([]);
      }

      setPpmpId(editData.id);
    } else {
      // Reset forms for new PPMP
      step1Form.reset();
      step4Form.reset();
      step5Form.reset();
      step7Form.reset();
      setItems([]);
      setAttachments([]);
      setPpmpId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData, isOpen]);

  // Fetch LASA rows for the current user (proponent)
  useEffect(() => {
    const fetchLasaRows = async () => {
      if (!user?.id) {
        setLasaRows([]);
        return;
      }

      setLoadingLasa(true);
      try {
        const rows = await getLasaRowsForPPMPCreation(String(user.id));
        setLasaRows(rows);
      } catch (error) {
        console.error("Error fetching LASA rows:", error);
        // Don't show error toast - LASA is optional
      } finally {
        setLoadingLasa(false);
      }
    };

    if (isOpen) {
      fetchLasaRows();
    }
  }, [isOpen, user?.id]);

  // Calculate total budget from items
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.estimatedTotalCost, 0);
    step5Form.setValue("totalBudgetAmount", total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleNext = async () => {
    let isValid = false;

    switch (currentStep) {
      case 0:
        isValid = await step1Form.trigger();
        if (!isValid) {
          toast.error("Please complete all required fields in Step 1");
        }
        break;
      case 1:
        // Validate items
        if (items.length === 0) {
          toast.error("At least one item is required");
          return;
        }
        isValid = true;
        break;
      case 2:
        isValid = await step4Form.trigger();
        if (!isValid) {
          const errors = step4Form.formState.errors;
          const errorMessages = Object.values(errors)
            .map((error) => error?.message)
            .filter((msg): msg is string => typeof msg === "string");
          if (errorMessages.length > 0) {
            toast.error(errorMessages[0]);
          } else {
            toast.error("Please check the form for validation errors");
          }
        }
        break;
      case 3:
        isValid = await step5Form.trigger();
        if (!isValid) {
          toast.error("Please complete all required fields in Step 4");
        }
        break;
      case 4:
        // Check for required Market Scoping Checklist
        const hasMarketScoping = attachments.some(
          (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
        );
        if (!hasMarketScoping) {
          toast.error("Market Scoping Checklist is required");
          return;
        }
        isValid = true;
        break;
      case 5:
        isValid = await step7Form.trigger();
        // Check basis of revision for new versions
        if (editData && editData.version > 1) {
          const basis = step7Form.getValues("basisOfRevision");
          if (!basis || basis.trim().length === 0) {
            toast.error("Basis of revision is required for new versions");
            return;
          }
        }
        break;
    }

    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    // Validate all steps
    const step1Valid = await step1Form.trigger();
    const step4Valid = await step4Form.trigger();
    const step5Valid = await step5Form.trigger();
    const step7Valid = await step7Form.trigger();

    if (!step1Valid || !step4Valid || !step5Valid || !step7Valid) {
      toast.error("Please complete all required fields");
      return;
    }

    if (items.length === 0) {
      toast.error("At least one item is required");
      return;
    }

    // Check attachments from database if PPMP exists, otherwise use state
    let currentAttachments = attachments;
    if (ppmpId) {
      try {
        const { data: dbAttachments } = await supabase
          .from("ppmp_attachments")
          .select("*")
          .eq("ppmp_id", ppmpId);

        if (dbAttachments && dbAttachments.length > 0) {
          // Merge database attachments with state attachments (state takes precedence for new uploads)
          const dbAttachmentsMap = new Map(
            dbAttachments.map((att) => [att.file_url, att])
          );
          const stateAttachmentsMap = new Map(
            attachments.map((att) => [att.fileUrl, att])
          );

          // Combine: state attachments override DB attachments, then add any DB-only attachments
          const combined = [
            ...Array.from(stateAttachmentsMap.values()),
            ...Array.from(dbAttachmentsMap.values())
              .filter((dbAtt) => !stateAttachmentsMap.has(dbAtt.file_url))
              .map((dbAtt) => ({
                id: dbAtt.id,
                documentType: dbAtt.document_type,
                fileName: dbAtt.file_name,
                fileUrl: dbAtt.file_url,
                fileSize: dbAtt.file_size || undefined,
                mimeType: dbAtt.mime_type || undefined,
                isRequired: dbAtt.is_required,
              })),
          ];
          currentAttachments = combined;
        }
      } catch (error) {
        console.error("Error fetching attachments:", error);
        // Fall back to state if DB fetch fails
      }
    }

    const hasMarketScoping = currentAttachments.some(
      (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
    );
    if (!hasMarketScoping) {
      toast.error("Market Scoping Checklist is required for submission");
      return;
    }

    setIsSubmitting(true);
    try {
      const step1Data = step1Form.getValues();
      const step4Data = step4Form.getValues();
      const step5Data = step5Form.getValues();
      const step7Data = step7Form.getValues();

      // Determine office/school
      const officeId = user.office_id ? String(user.office_id) : null;
      const schoolId = user.school_id ? String(user.school_id) : null;

      const ppmpData = {
        fiscalYear: step1Data.fiscalYear,
        officeId,
        schoolId,
        projectTitle: step1Data.projectTitle,
        generalDescription: step1Data.generalDescription,
        objective: step1Data.objective,
        implementationMode: "PROCUREMENT", // Default value since field is removed
        projectType: step1Data.projectType,
        suggestedModeOfProcurement: step4Data.suggestedModeOfProcurement,
        procurementStartMonth: step4Data.procurementStartMonth,
        procurementStartYear: step4Data.procurementStartYear,
        procurementEndMonth: step4Data.procurementEndMonth,
        procurementEndYear: step4Data.procurementEndYear,
        deliveryStartMonth: step4Data.deliveryStartMonth,
        deliveryStartYear: step4Data.deliveryStartYear,
        deliveryEndMonth: step4Data.deliveryEndMonth,
        deliveryEndYear: step4Data.deliveryEndYear,
        sourceOfFunds: step5Data.sourceOfFunds,
        totalBudgetAmount: step5Data.totalBudgetAmount,
        budgetOverrideJustification: step5Data.budgetOverrideJustification,
        lasaId: step5Data.lasaId,
        remarks: step7Data.remarks,
        submittedBy: String(user.id),
        items,
      };

      let finalPpmpId = ppmpId;

      if (ppmpId && editData) {
        // Convert camelCase to snake_case for updatePPMP
        const updateData: {
          fiscal_year?: number;
          office_id?: string | null;
          school_id?: string | null;
          project_title?: string;
          general_description?: string;
          objective?: string;
          project_type?: string;
          suggested_mode_of_procurement?: string | null;
          procurement_start_month?: number | null;
          procurement_start_year?: number | null;
          procurement_end_month?: number | null;
          procurement_end_year?: number | null;
          delivery_start_month?: number | null;
          delivery_start_year?: number | null;
          delivery_end_month?: number | null;
          delivery_end_year?: number | null;
          source_of_funds?: string;
          total_budget_amount?: number;
          budget_override_justification?: string | null;
          lasa_id?: string | null;
          remarks?: string | null;
          items?: typeof items;
        } = {
          fiscal_year: step1Data.fiscalYear,
          office_id: officeId || null,
          school_id: schoolId || null,
          project_title: step1Data.projectTitle,
          general_description: step1Data.generalDescription,
          objective: step1Data.objective,
          project_type: step1Data.projectType,
          suggested_mode_of_procurement:
            step4Data.suggestedModeOfProcurement || null,
          procurement_start_month: step4Data.procurementStartMonth || null,
          procurement_start_year: step4Data.procurementStartYear || null,
          procurement_end_month: step4Data.procurementEndMonth || null,
          procurement_end_year: step4Data.procurementEndYear || null,
          delivery_start_month: step4Data.deliveryStartMonth || null,
          delivery_start_year: step4Data.deliveryStartYear || null,
          delivery_end_month: step4Data.deliveryEndMonth || null,
          delivery_end_year: step4Data.deliveryEndYear || null,
          source_of_funds: step5Data.sourceOfFunds,
          total_budget_amount: step5Data.totalBudgetAmount,
          budget_override_justification:
            step5Data.budgetOverrideJustification || null,
          lasa_id: step5Data.lasaId || null,
          remarks: step7Data.remarks || null,
          items,
        };
        await updatePPMP(
          ppmpId,
          updateData as Parameters<typeof updatePPMP>[1]
        );
      } else {
        const newPPMP = await createPPMP(ppmpData);
        finalPpmpId = newPPMP.id;
        setPpmpId(newPPMP.id);
      }

      if (!finalPpmpId) {
        toast.error("PPMP ID not found");
        return;
      }

      // Save attachments that don't have an ID yet (for new PPMPs)
      for (const attachment of attachments) {
        if (!attachment.id) {
          try {
            const { data, error } = await supabase
              .from("ppmp_attachments")
              .insert({
                ppmp_id: parseInt(finalPpmpId),
                document_type: attachment.documentType,
                file_name: attachment.fileName,
                file_url: attachment.fileUrl,
                file_size: attachment.fileSize,
                mime_type: attachment.mimeType,
                is_required: attachment.isRequired,
                uploaded_by: user?.id ? parseInt(String(user.id)) : null,
              })
              .select("id")
              .single();

            if (!error && data) {
              // Update the attachment in state with the new ID
              setAttachments((prev) =>
                prev.map((att) =>
                  att.fileUrl === attachment.fileUrl
                    ? { ...att, id: data.id }
                    : att
                )
              );
            }
          } catch (error) {
            console.error("Failed to save attachment:", error);
            // Continue with other attachments even if one fails
          }
        }
      }

      // Submit PPMP
      await submitPPMP(finalPpmpId);
      toast.success("PPMP submitted for approval successfully");
      onSubmitComplete?.();
      onClose();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit PPMP"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep3();
      case 2:
        return renderStep4();
      case 3:
        return renderStep5();
      case 4:
        return renderStep6();
      case 5:
        return renderStep7();
      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <Form {...step1Form}>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={step1Form.control}
            name="fiscalYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fiscal Year <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={step1Form.control}
            name="projectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Project Type <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GOODS">Goods</SelectItem>
                    <SelectItem value="INFRASTRUCTURE">
                      Infrastructure
                    </SelectItem>
                    <SelectItem value="CONSULTING_SERVICES">
                      Consulting Services
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={step1Form.control}
          name="projectTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Project Title <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter project title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={step1Form.control}
            name="generalDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  General Description <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter general description of the project"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={step1Form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Objective <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter objective of the project"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Auto-generated fields display */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Auto-generated Information
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Office/School</p>
              <p className="font-medium">
                {user?.office_id
                  ? availableOffices.find(
                      (o) => String(o.id) === String(user.office_id)
                    )?.name
                  : user?.school_id
                  ? availableSchools.find(
                      (s) => String(s.id) === String(user.school_id)
                    )?.name
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created By</p>
              <p className="font-medium">{user?.name || "-"}</p>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );

  const renderStep3 = () => {
    const handleAddItem = () => {
      const validation = itemSchema.safeParse(newItem);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (editingItemIndex !== null) {
        const updated = [...items];
        updated[editingItemIndex] = validation.data;
        setItems(updated);
        setEditingItemIndex(null);
        toast.success("Item updated successfully");
      } else {
        setItems([...items, validation.data]);
        toast.success("Item added successfully");
      }

      setNewItem({
        itemDescription: "",
        unitOfMeasure: "",
        quantity: 0,
        sizeSpecification: "",
        estimatedUnitCost: 0,
        estimatedTotalCost: 0,
      });
      setShowAddItemModal(false);
    };

    const handleDeleteItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
      toast.success("Item deleted successfully");
    };

    const handleEditItem = (index: number) => {
      setNewItem(items[index]);
      setEditingItemIndex(index);
      setShowAddItemModal(true);
    };

    const calculateTotal = () => {
      return items.reduce((sum, item) => sum + item.estimatedTotalCost, 0);
    };

    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itemization
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add items to be procured for this project
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditingItemIndex(null);
              setShowAddItemModal(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Items Table */}
        {items.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Items ({items.length})
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  Total:{" "}
                  {new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  }).format(calculateTotal())}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="w-[120px]">Quantity</TableHead>
                      <TableHead className="w-[120px]">Unit</TableHead>
                      <TableHead className="w-[150px]">Unit Cost</TableHead>
                      <TableHead className="w-[150px]">Total Cost</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className="group">
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.itemDescription}
                            </p>
                            {item.sizeSpecification && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.sizeSpecification}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.quantity.toLocaleString("en-PH", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.unitOfMeasure}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                            minimumFractionDigits: 2,
                          }).format(item.estimatedUnitCost)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                            minimumFractionDigits: 2,
                          }).format(item.estimatedTotalCost)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditItem(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-4 border-t bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total Budget:
                </span>
                <span className="text-xl font-bold">
                  {new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: "PHP",
                    minimumFractionDigits: 2,
                  }).format(calculateTotal())}
                </span>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-semibold mb-1">No items added yet</h4>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                Start building your procurement list by adding items to be
                procured
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingItemIndex(null);
                  setShowAddItemModal(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Your First Item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Item Modal */}
        {showAddItemModal && (
          <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {editingItemIndex !== null ? "Edit Item" : "Add New Item"}
                </DialogTitle>
                <DialogDescription>
                  {editingItemIndex !== null
                    ? "Update the item details below"
                    : "Fill in the details for the item to be procured"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label>
                    Item Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={newItem.itemDescription}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        itemDescription: e.target.value,
                      })
                    }
                    placeholder="Enter a detailed description of the item"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a clear and detailed description of the item
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Unit of Measure <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={newItem.unitOfMeasure}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          unitOfMeasure: e.target.value,
                        })
                      }
                      placeholder="e.g., unit, set, piece, box"
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard unit for measuring quantity
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={newItem.quantity === 0 ? "" : newItem.quantity}
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 0;
                        const total = qty * newItem.estimatedUnitCost;
                        setNewItem({
                          ...newItem,
                          quantity: qty,
                          estimatedTotalCost: total,
                        });
                      }}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of units needed
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Size / Specification (Optional)</Label>
                  <Textarea
                    value={newItem.sizeSpecification ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        sizeSpecification: e.target.value,
                      })
                    }
                    placeholder="Enter size, dimensions, or technical specifications"
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional technical details or specifications
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Estimated Unit Cost{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        type="number"
                        value={
                          newItem.estimatedUnitCost === 0
                            ? ""
                            : newItem.estimatedUnitCost
                        }
                        onChange={(e) => {
                          const cost = parseFloat(e.target.value) || 0;
                          const total = cost * newItem.quantity;
                          setNewItem({
                            ...newItem,
                            estimatedUnitCost: cost,
                            estimatedTotalCost: total,
                          });
                        }}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cost per unit
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Estimated Total Cost{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        type="number"
                        value={
                          newItem.estimatedTotalCost === 0
                            ? ""
                            : newItem.estimatedTotalCost
                        }
                        onChange={(e) => {
                          const total = parseFloat(e.target.value) || 0;
                          setNewItem({
                            ...newItem,
                            estimatedTotalCost: total,
                          });
                        }}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="pl-8 font-semibold"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      Auto-calculated: Quantity × Unit Cost
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddItemModal(false);
                    setEditingItemIndex(null);
                    setNewItem({
                      itemDescription: "",
                      unitOfMeasure: "",
                      quantity: 0,
                      sizeSpecification: "",
                      estimatedUnitCost: 0,
                      estimatedTotalCost: 0,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddItem}>
                  {editingItemIndex !== null ? "Update" : "Add"} Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    const procurementStartMonth = step4Form.watch("procurementStartMonth");
    const procurementStartYear = step4Form.watch("procurementStartYear");
    const procurementEndMonth = step4Form.watch("procurementEndMonth");
    const procurementEndYear = step4Form.watch("procurementEndYear");
    const deliveryStartMonth = step4Form.watch("deliveryStartMonth");
    const deliveryStartYear = step4Form.watch("deliveryStartYear");
    const deliveryEndMonth = step4Form.watch("deliveryEndMonth");
    const deliveryEndYear = step4Form.watch("deliveryEndYear");

    const formatDate = (
      month: number | undefined,
      year: number | undefined
    ) => {
      if (!month || !year) return "Not set";
      const monthName = new Date(2000, month - 1, 1).toLocaleString("default", {
        month: "short",
      });
      return `${monthName} ${year}`;
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Procurement Schedule
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set the timeline for procurement and delivery/implementation
          </p>
        </div>

        <Form {...step4Form}>
          {/* Mode of Procurement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Procurement Method</CardTitle>
              <CardDescription>
                Suggest a preferred procurement method (advisory only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={step4Form.control}
                name="suggestedModeOfProcurement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested Mode of Procurement</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Public Bidding, Shopping, Negotiated Procurement"
                      />
                    </FormControl>
                    <FormDescription>
                      This is advisory. BAC will finalize the procurement method
                      during APP stage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Procurement Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Procurement Timeline
              </CardTitle>
              <CardDescription>
                Define when the procurement process will start and end
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    Start Date
                  </FormLabel>
                  <div className="flex gap-3">
                    <FormField
                      control={step4Form.control}
                      name="procurementStartMonth"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {new Date(2000, i, 1).toLocaleString(
                                    "default",
                                    { month: "long" }
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step4Form.control}
                      name="procurementStartYear"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {procurementStartMonth && procurementStartYear && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(procurementStartMonth, procurementStartYear)}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    End Date
                  </FormLabel>
                  <div className="flex gap-3">
                    <FormField
                      control={step4Form.control}
                      name="procurementEndMonth"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {new Date(2000, i, 1).toLocaleString(
                                    "default",
                                    { month: "long" }
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step4Form.control}
                      name="procurementEndYear"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {procurementEndMonth && procurementEndYear && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(procurementEndMonth, procurementEndYear)}
                    </p>
                  )}
                </div>
              </div>

              {/* Visual Timeline Indicator */}
              {procurementStartMonth &&
                procurementStartYear &&
                procurementEndMonth &&
                procurementEndYear && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Procurement Period:
                      </span>
                      <span className="font-medium">
                        {formatDate(
                          procurementStartMonth,
                          procurementStartYear
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(procurementEndMonth, procurementEndYear)}
                      </span>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Delivery/Implementation Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Delivery/Implementation Timeline
              </CardTitle>
              <CardDescription>
                Define when delivery or implementation will start and end
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    Start Date
                  </FormLabel>
                  <div className="flex gap-3">
                    <FormField
                      control={step4Form.control}
                      name="deliveryStartMonth"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {new Date(2000, i, 1).toLocaleString(
                                    "default",
                                    { month: "long" }
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step4Form.control}
                      name="deliveryStartYear"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {deliveryStartMonth && deliveryStartYear && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(deliveryStartMonth, deliveryStartYear)}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    End Date
                  </FormLabel>
                  <div className="flex gap-3">
                    <FormField
                      control={step4Form.control}
                      name="deliveryEndMonth"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {new Date(2000, i, 1).toLocaleString(
                                    "default",
                                    { month: "long" }
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step4Form.control}
                      name="deliveryEndYear"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                value ? parseInt(value) : undefined
                              )
                            }
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {deliveryEndMonth && deliveryEndYear && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(deliveryEndMonth, deliveryEndYear)}
                    </p>
                  )}
                </div>
              </div>

              {/* Visual Timeline Indicator */}
              {deliveryStartMonth &&
                deliveryStartYear &&
                deliveryEndMonth &&
                deliveryEndYear && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Delivery Period:
                      </span>
                      <span className="font-medium">
                        {formatDate(deliveryStartMonth, deliveryStartYear)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(deliveryEndMonth, deliveryEndYear)}
                      </span>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </Form>
      </div>
    );
  };

  const renderStep5 = () => {
    const totalFromItems = items.reduce(
      (sum, item) => sum + item.estimatedTotalCost,
      0
    );
    const budgetOverride =
      step5Form.watch("totalBudgetAmount") !== totalFromItems;

    return (
      <div className="space-y-4">
        <Form {...step5Form}>
          <FormField
            control={step5Form.control}
            name="sourceOfFunds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Source of Funds <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    // Update field value
                    field.onChange(value);
                    // Also use setValue to ensure validation runs immediately
                    step5Form.setValue("sourceOfFunds", value, {
                      shouldValidate: true,
                      shouldTouch: true,
                    });
                  }}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source of funds" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GAA">
                      GAA (General Appropriations Act)
                    </SelectItem>
                    <SelectItem value="COB">
                      COB (Continuing Obligation Budget)
                    </SelectItem>
                    <SelectItem value="IGP">
                      IGP (Income Generating Project)
                    </SelectItem>
                    <SelectItem value="Trust">Trust Fund</SelectItem>
                    <SelectItem value="MOOE">
                      MOOE (Maintenance and Other Operating Expenses)
                    </SelectItem>
                    <SelectItem value="SDF">
                      SDF (Special Development Fund)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* LASA Selection Section */}
          {step5Form.watch("sourceOfFunds") && (
            <div className="pt-4 border-t">
              <FormField
                control={step5Form.control}
                name="lasaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to LASA (Optional)</FormLabel>
                    {loadingLasa ? (
                      <div className="text-sm text-gray-500 py-2">
                        Loading LASA data...
                      </div>
                    ) : lasaRows.length > 0 ? (
                      <div className="space-y-2">
                        <Select
                          onValueChange={(value) => {
                            field.onChange(
                              value === "none" ? undefined : value
                            );
                          }}
                          value={
                            field.value && field.value !== ""
                              ? field.value
                              : "none"
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a LASA row" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {lasaRows.map((row) => (
                              <SelectItem key={row.id} value={String(row.id)}>
                                {row.project_title} -{" "}
                                {new Intl.NumberFormat("en-PH", {
                                  style: "currency",
                                  currency: "PHP",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(row.planned_amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select a LASA row where you are the proponent. This
                          links the PPMP to the LASA budget.
                        </FormDescription>
                        {field.value && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            Selected LASA:{" "}
                            {
                              lasaRows.find((r) => String(r.id) === field.value)
                                ?.project_title
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 py-2">
                        No LASA rows found where you are the proponent for this
                        fiscal year and fund source.
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Budget</p>
            <FormField
              control={step5Form.control}
              name="totalBudgetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                      className="text-lg font-semibold"
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormDescription>
                    Auto-calculated from items:{" "}
                    {new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(totalFromItems)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {budgetOverride && (
            <FormField
              control={step5Form.control}
              name="budgetOverrideJustification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Budget Override Justification{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain why the budget differs from item totals"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </Form>
      </div>
    );
  };

  const renderStep6 = () => {
    const step1Data = step1Form.getValues();
    const projectType = step1Data.projectType;

    const handleFileUpload = async (file: UploadedFile) => {
      // Save attachment to database if PPMP exists first
      let attachmentId: string | undefined = undefined;
      if (ppmpId) {
        try {
          const { data, error } = await supabase
            .from("ppmp_attachments")
            .insert({
              ppmp_id: parseInt(ppmpId),
              document_type: file.documentType,
              file_name: file.fileName,
              file_url: file.fileUrl,
              file_size: file.fileSize,
              mime_type: file.mimeType,
              is_required: file.isRequired,
              uploaded_by: user?.id ? parseInt(String(user.id)) : null,
            })
            .select("id")
            .single();

          if (!error && data) {
            attachmentId = data.id;
          }
        } catch (error) {
          console.error("Failed to save attachment:", error);
        }
      }

      // Update state with the file (including ID if available)
      setAttachments((prev) => {
        // Check if file already exists to avoid duplicates
        const exists = prev.some((a) => a.fileUrl === file.fileUrl);
        if (exists) return prev;
        return [...prev, { ...file, id: attachmentId || file.id }];
      });
    };

    const handleFileDelete = async (fileUrl: string) => {
      // Use functional update to ensure we have the latest state
      setAttachments((prev) => prev.filter((a) => a.fileUrl !== fileUrl));

      // Delete from database if PPMP exists
      if (ppmpId) {
        try {
          await supabase
            .from("ppmp_attachments")
            .delete()
            .eq("file_url", fileUrl);
        } catch (error) {
          console.error("Failed to delete attachment:", error);
        }
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Required Attachments</h3>
          <FileUpload
            ppmpId={ppmpId || "temp"}
            documentType="MARKET_SCOPING_CHECKLIST"
            label="Market Scoping Checklist"
            isRequired={true}
            description="Required for submission"
            onUploadComplete={handleFileUpload}
            onDelete={handleFileDelete}
            existingFiles={attachments.filter(
              (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Optional Attachments</h3>
          <div className="space-y-4">
            {projectType === "GOODS" && (
              <FileUpload
                ppmpId={ppmpId || "temp"}
                documentType="TECHNICAL_SPECIFICATIONS"
                label="Technical Specifications"
                description="Technical specifications for goods"
                onUploadComplete={handleFileUpload}
                onDelete={handleFileDelete}
                existingFiles={attachments.filter(
                  (a) => a.documentType === "TECHNICAL_SPECIFICATIONS"
                )}
              />
            )}

            {projectType === "CONSULTING_SERVICES" && (
              <>
                <FileUpload
                  ppmpId={ppmpId || "temp"}
                  documentType="TOR"
                  label="Terms of Reference (TOR)"
                  description="TOR for consulting services"
                  onUploadComplete={handleFileUpload}
                  onDelete={handleFileDelete}
                  existingFiles={attachments.filter(
                    (a) => a.documentType === "TOR"
                  )}
                />
              </>
            )}

            {projectType === "INFRASTRUCTURE" && (
              <>
                <FileUpload
                  ppmpId={ppmpId || "temp"}
                  documentType="ENGINEERING_PLANS"
                  label="Engineering Plans"
                  description="Engineering plans and drawings"
                  onUploadComplete={handleFileUpload}
                  onDelete={handleFileDelete}
                  existingFiles={attachments.filter(
                    (a) => a.documentType === "ENGINEERING_PLANS"
                  )}
                />
                <FileUpload
                  ppmpId={ppmpId || "temp"}
                  documentType="FEASIBILITY_STUDY"
                  label="Feasibility Study"
                  description="Feasibility study report"
                  onUploadComplete={handleFileUpload}
                  onDelete={handleFileDelete}
                  existingFiles={attachments.filter(
                    (a) => a.documentType === "FEASIBILITY_STUDY"
                  )}
                />
              </>
            )}

            <FileUpload
              ppmpId={ppmpId || "temp"}
              documentType="OTHER"
              label="Other Documents"
              description="Any other supporting documents"
              onUploadComplete={handleFileUpload}
              onDelete={handleFileDelete}
              existingFiles={attachments.filter(
                (a) => a.documentType === "OTHER"
              )}
            />
          </div>
        </div>
      </div>
    );
  };

  // Helper function to check if step 1 is valid
  const isStep1Valid = () => {
    const values = step1Form.getValues();
    const result = step1Schema.safeParse(values);
    return result.success;
  };

  // Helper function to check if step 4 is valid
  const isStep4Valid = () => {
    const values = step4Form.getValues();
    const result = step4Schema.safeParse(values);
    return result.success;
  };

  // Helper function to check if step 5 is valid
  const isStep5Valid = () => {
    const values = step5Form.getValues();
    const result = step5Schema.safeParse(values);
    return result.success;
  };

  const renderStep7 = () => {
    const isNewVersion = editData && editData.version > 1;
    const step1Valid = isStep1Valid();
    const step4Valid = isStep4Valid();
    const step5Valid = isStep5Valid();

    return (
      <div className="space-y-4">
        <Form {...step7Form}>
          <FormField
            control={step7Form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter any additional remarks"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isNewVersion && (
            <FormField
              control={step7Form.control}
              name="basisOfRevision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Basis of Revision <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain the reason for creating a new version"
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Required when creating a new version of an existing PPMP
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Validation Summary */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Submission Checklist</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={step1Valid ? "text-green-600" : "text-red-600"}
                >
                  {step1Valid ? "✓" : "✗"}
                </span>
                <span>Step 1: Header & Project Info</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    items.length > 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {items.length > 0 ? "✓" : "✗"}
                </span>
                <span>Step 2: At least one item added</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={step4Valid ? "text-green-600" : "text-red-600"}
                >
                  {step4Valid ? "✓" : "✗"}
                </span>
                <span>Step 3: Procurement Schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={step5Valid ? "text-green-600" : "text-red-600"}
                >
                  {step5Valid ? "✓" : "✗"}
                </span>
                <span>Step 4: Budget & Funding</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    attachments.some(
                      (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
                    )
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {attachments.some(
                    (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
                  )
                    ? "✓"
                    : "✗"}
                </span>
                <span>Step 5: Market Scoping Checklist uploaded</span>
              </div>
            </div>
          </div>
        </Form>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[95vh] p-0 flex flex-col sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw]">
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editData ? "Edit" : "Create"} PPMP
            </DialogTitle>
            <DialogDescription>
              {editData
                ? "Update PPMP information. Only DRAFT PPMPs can be edited."
                : "Fill in all steps to create a new Procurement Program and Management Plan."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 border-b">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          <div className="min-h-[500px]">{renderStepContent()}</div>
        </div>

        <DialogFooter className="flex justify-between px-6 py-4 border-t bg-muted/50">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </span>
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
