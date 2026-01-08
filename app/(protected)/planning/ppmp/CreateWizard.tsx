"use client";

import { FileUpload, UploadedFile } from "@/components/ppmp/FileUpload";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper, StepperStep } from "@/components/ui/stepper";
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
import { Pencil, Trash2 } from "lucide-react";
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
  implementationMode: z.enum(["PROCUREMENT", "BY_ADMINISTRATION"]),
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
  .refine(
    (data) => {
      if (data.procurementStartYear && data.procurementEndYear) {
        if (data.procurementStartYear > data.procurementEndYear) return false;
        if (
          data.procurementStartYear === data.procurementEndYear &&
          data.procurementStartMonth &&
          data.procurementEndMonth &&
          data.procurementStartMonth > data.procurementEndMonth
        ) {
          return false;
        }
      }
      return true;
    },
    { message: "Procurement end date must be after start date" }
  );

// Form Schema for Step 5
const step5Schema = z.object({
  sourceOfFunds: z.string().min(1, "Source of funds is required"),
  totalBudgetAmount: z.number().min(0.01, "Budget must be greater than 0"),
  budgetOverrideJustification: z.string().optional(),
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
      implementationMode: "PROCUREMENT",
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
        implementationMode: editData.implementation_mode,
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
      });

      step7Form.reset({
        remarks: editData.remarks || undefined,
        basisOfRevision: editData.basis_of_revision || undefined,
      });

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

  // Fetch LASA rows when fiscal year and fund source are available
  useEffect(() => {
    const fetchLasaRows = async () => {
      const step1Data = step1Form.getValues();
      const step5Data = step5Form.getValues();
      const fiscalYear = step1Data.fiscalYear;
      const fundSource = step5Data.sourceOfFunds;
      const officeId = user?.office_id ? String(user.office_id) : null;

      if (!fiscalYear || !fundSource || !user?.division_id) {
        setLasaRows([]);
        return;
      }

      setLoadingLasa(true);
      try {
        const rows = await getLasaRowsForPPMPCreation({
          divisionId: String(user.division_id),
          fiscalYear,
          fundSource,
          officeId: officeId || null,
        });
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
  }, [
    isOpen,
    step1Form.watch("fiscalYear"),
    step5Form.watch("sourceOfFunds"),
    user?.division_id,
    user?.office_id,
  ]);

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
        break;
      case 3:
        isValid = await step5Form.trigger();
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

  const handleSaveDraft = async () => {
    if (!user) {
      toast.error("User not found");
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
        implementationMode: step1Data.implementationMode,
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
        remarks: step7Data.remarks,
        submittedBy: String(user.id),
        items,
      };

      if (ppmpId && editData) {
        await updatePPMP(ppmpId, ppmpData);
        toast.success("PPMP draft updated successfully");
      } else {
        const newPPMP = await createPPMP(ppmpData);
        setPpmpId(newPPMP.id);
        toast.success("PPMP draft saved successfully");
      }

      onSubmitComplete?.();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save draft"
      );
    } finally {
      setIsSubmitting(false);
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

    const hasMarketScoping = attachments.some(
      (a) => a.documentType === "MARKET_SCOPING_CHECKLIST"
    );
    if (!hasMarketScoping) {
      toast.error("Market Scoping Checklist is required for submission");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save PPMP first
      await handleSaveDraft();

      if (!ppmpId) {
        toast.error("PPMP ID not found");
        return;
      }

      // Upload attachments
      for (const attachment of attachments) {
        if (!attachment.id) {
          // New attachment, upload to storage and save to DB
          // This would require the file object, so we'll handle it differently
          // For now, assume attachments are already uploaded
        }
      }

      // Submit PPMP
      await submitPPMP(ppmpId);
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
                  rows={4}
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
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={step1Form.control}
          name="implementationMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Implementation Mode <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                  <SelectItem value="BY_ADMINISTRATION">
                    By Administration
                  </SelectItem>
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
                  <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                  <SelectItem value="CONSULTING_SERVICES">
                    Consulting Services
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
      <div className="space-y-4">
        <div className="sticky top-0 z-10 bg-background pb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Items</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingItemIndex(null);
                setShowAddItemModal(true);
              }}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Items List */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Items ({items.length})</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg flex items-start justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.itemDescription}</p>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>
                        {item.quantity} {item.unitOfMeasure}
                      </span>
                      {item.sizeSpecification && (
                        <span className="ml-2">• {item.sizeSpecification}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(item.estimatedTotalCost)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditItem(index)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No items added yet</p>
            <p className="text-sm">Click &quot;Add Item&quot; to get started</p>
          </div>
        )}

        {/* Summary */}
        {items.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Budget:</span>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(calculateTotal())}
              </span>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddItemModal && (
          <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItemIndex !== null ? "Edit Item" : "Add Item"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
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
                    placeholder="Enter item description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                      placeholder="e.g., unit, set, piece"
                    />
                  </div>
                  <div>
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
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label>Size / Specification</Label>
                  <Textarea
                    value={newItem.sizeSpecification ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        sizeSpecification: e.target.value,
                      })
                    }
                    placeholder="Enter size or specification"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Estimated Unit Cost{" "}
                      <span className="text-red-500">*</span>
                    </Label>
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
                    />
                  </div>
                  <div>
                    <Label>
                      Estimated Total Cost{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={
                        newItem.estimatedTotalCost === 0
                          ? ""
                          : newItem.estimatedTotalCost
                      }
                      onChange={(e) => {
                        const total = parseFloat(e.target.value) || 0;
                        setNewItem({ ...newItem, estimatedTotalCost: total });
                      }}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
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

  const renderStep4 = () => (
    <div className="space-y-4">
      <Form {...step4Form}>
        <FormField
          control={step4Form.control}
          name="suggestedModeOfProcurement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suggested Mode of Procurement</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Public Bidding, Shopping"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Start of Procurement</p>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={step4Form.control}
                name="procurementStartMonth"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2000, i, 1).toLocaleString("default", {
                              month: "long",
                            })}
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
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
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
          </div>

          <div>
            <p className="text-sm font-medium mb-2">End of Procurement</p>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={step4Form.control}
                name="procurementEndMonth"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2000, i, 1).toLocaleString("default", {
                              month: "long",
                            })}
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
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">
              Delivery/Implementation Start
            </p>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={step4Form.control}
                name="deliveryStartMonth"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2000, i, 1).toLocaleString("default", {
                              month: "long",
                            })}
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
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
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
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Delivery/Implementation End
            </p>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={step4Form.control}
                name="deliveryEndMonth"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2000, i, 1).toLocaleString("default", {
                              month: "long",
                            })}
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
                  <FormItem>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      value={field.value ? String(field.value) : undefined}
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
          </div>
        </div>
      </Form>
    </div>
  );

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
                    field.onChange(value);
                  }}
                  value={field.value}
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

          {/* LASA Visibility Section */}
          {step5Form.watch("sourceOfFunds") && (
            <div className="pt-4 border-t">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">
                  LASA Budget Visibility (Planning Reference)
                </h4>
                <p className="text-xs text-gray-500">
                  Showing available budget visibility from LASA for reference.
                  This does not block PPMP creation.
                </p>
              </div>
              {loadingLasa ? (
                <div className="text-sm text-gray-500 py-2">
                  Loading LASA data...
                </div>
              ) : lasaRows.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lasaRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">
                          {row.project_title}
                        </div>
                        {row.office && (
                          <div className="text-xs text-gray-500">
                            {row.office.name}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(row.planned_amount)}
                      </div>
                    </div>
                  ))}
                  {step5Form.watch("totalBudgetAmount") > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-300">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          Total LASA Planned:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            lasaRows.reduce(
                              (sum, row) => sum + row.planned_amount,
                              0
                            )
                          )}
                        </span>
                      </div>
                      {step5Form.watch("totalBudgetAmount") >
                        lasaRows.reduce(
                          (sum, row) => sum + row.planned_amount,
                          0
                        ) && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          ⚠️ PPMP budget exceeds total LASA planned amount. This
                          is informational only.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-2">
                  No LASA rows found for this fiscal year and fund source.
                </div>
              )}
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
      setAttachments([...attachments, file]);

      // Save attachment to database if PPMP exists
      if (ppmpId) {
        try {
          await supabase.from("ppmp_attachments").insert({
            ppmp_id: parseInt(ppmpId),
            document_type: file.documentType,
            file_name: file.fileName,
            file_url: file.fileUrl,
            file_size: file.fileSize,
            mime_type: file.mimeType,
            is_required: file.isRequired,
            uploaded_by: user?.id ? parseInt(String(user.id)) : null,
          });
        } catch (error) {
          console.error("Failed to save attachment:", error);
        }
      }
    };

    const handleFileDelete = async (fileUrl: string) => {
      setAttachments(attachments.filter((a) => a.fileUrl !== fileUrl));

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

  const renderStep7 = () => {
    const isNewVersion = editData && editData.version > 1;

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
                  className={
                    step1Form.formState.isValid
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {step1Form.formState.isValid ? "✓" : "✗"}
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
                  className={
                    step4Form.formState.isValid
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {step4Form.formState.isValid ? "✓" : "✗"}
                </span>
                <span>Step 3: Procurement Schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    step5Form.formState.isValid
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {step5Form.formState.isValid ? "✓" : "✗"}
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
            {!editData && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                Save as Draft
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
