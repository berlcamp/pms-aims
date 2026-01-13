"use client";

import { StatusBadge } from "@/components/ppmp/StatusBadge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ExtendedUser } from "@/lib/redux/userSlice";
import { createNewVersion, getPPMPWithRelations } from "@/lib/services/ppmp";
import { supabase } from "@/lib/supabase/client";
import { PPMPWithRelations } from "@/types/database";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  History,
  Info,
  Package,
  Tag,
  User,
  XCircle,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ApprovalActions } from "./ApprovalActions";

const createVersionSchema = z.object({
  basisOfRevision: z
    .string()
    .min(1, "Basis of revision is required")
    .min(10, "Basis of revision must be at least 10 characters"),
});

type CreateVersionFormData = z.infer<typeof createVersionSchema>;

interface ViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ppmpId: string | null;
  user: ExtendedUser | null;
  onActionComplete?: () => void;
}

export function ViewModal({
  isOpen,
  onClose,
  ppmpId,
  user,
  onActionComplete,
}: ViewModalProps) {
  const [ppmp, setPpmp] = useState<PPMPWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  const createVersionForm = useForm<CreateVersionFormData>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: {
      basisOfRevision: "",
    },
  });

  useEffect(() => {
    if (isOpen && ppmpId) {
      setLoading(true);
      getPPMPWithRelations(ppmpId)
        .then((data) => {
          setPpmp(data);
        })
        .catch((error) => {
          console.error("Failed to load PPMP:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, ppmpId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatMonthYear = (
    month: number | null | undefined,
    year: number | null | undefined
  ) => {
    if (!month || !year) return "-";
    const date = new Date(year, month - 1, 1);
    return format(date, "MMM yyyy");
  };

  const handleCreateVersion = async (data: CreateVersionFormData) => {
    if (!ppmp || !user) {
      toast.error("PPMP or user not found");
      return;
    }

    setIsCreatingVersion(true);
    try {
      // Get the system user ID (database ID, not Supabase Auth UUID)
      let systemUserId: string;
      
      if (user.system_user_id) {
        // Use system_user_id if available
        systemUserId = String(user.system_user_id);
      } else {
        // Fetch system user from database using email
        const { data: systemUser, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .eq("is_active", true)
          .single();

        if (userError || !systemUser) {
          throw new Error("System user not found. Please try logging in again.");
        }

        systemUserId = String(systemUser.id);
      }

      // The createNewVersion function creates a new version based on the provided PPMP
      // It will automatically find the root version, increment the version number, and copy all data
      // All versions use the same root version ID as parent_ppmp_id
      await createNewVersion(ppmp.id, data.basisOfRevision, systemUserId);
      toast.success("New version created successfully");
      setShowCreateVersionModal(false);
      createVersionForm.reset();
      onActionComplete?.();
      // Refresh the current PPMP to show updated data
      if (ppmpId) {
        getPPMPWithRelations(ppmpId).then(setPpmp);
      }
    } catch (error) {
      console.error("Failed to create new version:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create new version"
      );
    } finally {
      setIsCreatingVersion(false);
    }
  };

  if (!ppmp && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl sm:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold mb-2">
                {ppmp?.project_title || "PPMP Details"}
              </DialogTitle>
              <DialogDescription className="text-base flex items-center gap-2 flex-wrap">
                <span className="font-medium">PPMP {ppmp?.ppmp_number}</span>
                <span>•</span>
                <span>FY {ppmp?.fiscal_year}</span>
                <span>•</span>
                <span>Version {ppmp?.version}</span>
              </DialogDescription>
            </div>
            {ppmp && <StatusBadge status={ppmp.status} className="shrink-0" />}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 overflow-y-auto py-8 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : ppmp ? (
          <Tabs
            defaultValue="overview"
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="classification"
                className="flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Classification</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Attachments</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Office/School
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">
                      {ppmp.office?.name || ppmp.school?.name || "-"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      PPMP Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{ppmp.ppmp_type}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Fiscal Year
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{ppmp.fiscal_year}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      Implementation Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">
                      {ppmp.implementation_mode}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    General Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {ppmp.general_description || (
                      <span className="text-muted-foreground italic">
                        No description provided
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Objective</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {ppmp.objective || (
                      <span className="text-muted-foreground italic">
                        No objective provided
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Timeline & Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Created
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(ppmp.created_at)}
                      </p>
                      {ppmp.submitted_by_user?.name && (
                        <p className="text-xs text-muted-foreground">
                          by {ppmp.submitted_by_user.name}
                        </p>
                      )}
                    </div>
                    {ppmp.submitted_at && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Submitted
                        </p>
                        <p className="text-sm font-medium">
                          {formatDate(ppmp.submitted_at)}
                        </p>
                      </div>
                    )}
                    {ppmp.approved_at && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Approved
                        </p>
                        <p className="text-sm font-medium">
                          {formatDate(ppmp.approved_at)}
                        </p>
                        {ppmp.approved_by_user?.name && (
                          <p className="text-xs text-muted-foreground">
                            by {ppmp.approved_by_user.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {ppmp.remarks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {ppmp.remarks}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Classification Tab */}
            <TabsContent
              value="classification"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Project Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{ppmp.project_type}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      General Support Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {ppmp.is_general_support_services ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">No</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {ppmp.suggested_mode_of_procurement && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Suggested Mode of Procurement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {ppmp.suggested_mode_of_procurement}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent
              value="items"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              {ppmp.lots && ppmp.lots.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lots</CardTitle>
                    <CardDescription>
                      {ppmp.lots.length} lot{ppmp.lots.length !== 1 ? "s" : ""}{" "}
                      defined
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ppmp.lots.map((lot) => (
                      <div
                        key={lot.id}
                        className="p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              Lot {lot.lot_number}: {lot.lot_name}
                            </p>
                            {lot.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {lot.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {ppmp.items && ppmp.items.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Items</CardTitle>
                    <CardDescription>
                      {ppmp.items.length} item
                      {ppmp.items.length !== 1 ? "s" : ""} in this PPMP
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Item Description</TableHead>
                            <TableHead className="w-[120px]">Lot</TableHead>
                            <TableHead className="w-[120px] text-right">
                              Quantity
                            </TableHead>
                            <TableHead className="w-[140px] text-right">
                              Unit Cost
                            </TableHead>
                            <TableHead className="w-[140px] text-right">
                              Total Cost
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ppmp.items.map((item, index) => {
                            const lot = ppmp.lots?.find(
                              (l) => l.id === item.lot_id
                            );
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="text-muted-foreground">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">
                                      {item.item_description}
                                    </p>
                                    {item.size_specification && (
                                      <p className="text-xs text-muted-foreground">
                                        Spec: {item.size_specification}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {lot ? (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Lot {lot.lot_number}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm">
                                    {item.quantity} {item.unit_of_measure}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm font-medium">
                                    {formatCurrency(item.estimated_unit_cost)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm font-semibold">
                                    {formatCurrency(item.estimated_total_cost)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">
                          Total Budget:
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(ppmp.total_budget_amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      No items added
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Items will appear here once added to this PPMP
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent
              value="schedule"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Procurement Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-medium">
                        {formatMonthYear(
                          ppmp.procurement_start_month,
                          ppmp.procurement_start_year
                        )}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        End Date
                      </p>
                      <p className="text-sm font-medium">
                        {formatMonthYear(
                          ppmp.procurement_end_month,
                          ppmp.procurement_end_year
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Delivery/Implementation Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-medium">
                        {formatMonthYear(
                          ppmp.delivery_start_month,
                          ppmp.delivery_start_year
                        )}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        End Date
                      </p>
                      <p className="text-sm font-medium">
                        {formatMonthYear(
                          ppmp.delivery_end_month,
                          ppmp.delivery_end_year
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent
              value="budget"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Total Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(ppmp.total_budget_amount)}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      Source of Funds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">
                      {ppmp.source_of_funds}
                    </p>
                  </CardContent>
                </Card>
                {ppmp.estimated_budget && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Estimated Budget
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {formatCurrency(ppmp.estimated_budget)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {ppmp.authorized_budget && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        Authorized Budget
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {formatCurrency(ppmp.authorized_budget)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {ppmp.budget_override_justification && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Budget Override Justification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {ppmp.budget_override_justification}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent
              value="attachments"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              {ppmp.attachments && ppmp.attachments.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attachments</CardTitle>
                    <CardDescription>
                      {ppmp.attachments.length} file
                      {ppmp.attachments.length !== 1 ? "s" : ""} attached
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ppmp.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {attachment.file_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground capitalize">
                                {attachment.document_type.replace(/_/g, " ")}
                              </span>
                              {attachment.file_size && (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    •
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {(
                                      attachment.file_size /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 ml-4"
                          onClick={() =>
                            window.open(attachment.file_url, "_blank")
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      No attachments
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Attachments will appear here once uploaded
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent
              value="history"
              className="flex-1 overflow-y-auto space-y-6 mt-0"
            >
              {ppmp.approval_history && ppmp.approval_history.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Approval History
                    </CardTitle>
                    <CardDescription>
                      {ppmp.approval_history.length} event
                      {ppmp.approval_history.length !== 1 ? "s" : ""} recorded
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                      <div className="space-y-6">
                        {ppmp.approval_history
                          .sort(
                            (a, b) =>
                              new Date(b.acted_at).getTime() -
                              new Date(a.acted_at).getTime()
                          )
                          .map((history) => {
                            const isApproved = history.action
                              .toLowerCase()
                              .includes("approve");
                            const isRejected =
                              history.action.toLowerCase().includes("reject") ||
                              history.action.toLowerCase().includes("return");
                            const isSubmitted = history.action
                              .toLowerCase()
                              .includes("submit");

                            return (
                              <div
                                key={history.id}
                                className="relative flex gap-4"
                              >
                                {/* Timeline dot */}
                                <div className="relative z-10 shrink-0">
                                  <div
                                    className={`h-12 w-12 rounded-full flex items-center justify-center border-2 bg-background ${
                                      isApproved
                                        ? "border-green-500 text-green-600"
                                        : isRejected
                                        ? "border-red-500 text-red-600"
                                        : isSubmitted
                                        ? "border-blue-500 text-blue-600"
                                        : "border-muted-foreground text-muted-foreground"
                                    }`}
                                  >
                                    {isApproved ? (
                                      <CheckCircle2 className="h-5 w-5" />
                                    ) : isRejected ? (
                                      <XCircle className="h-5 w-5" />
                                    ) : (
                                      <Clock className="h-5 w-5" />
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-6">
                                  <div className="bg-muted/30 rounded-lg p-4 border">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div>
                                        <p className="font-semibold text-sm capitalize">
                                          {history.action}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatDate(history.acted_at)}
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">
                                            {history.previous_status}
                                          </span>
                                          <span className="text-muted-foreground">
                                            →
                                          </span>
                                          <span className="font-medium">
                                            {history.new_status}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {history.remarks && (
                                      <>
                                        <Separator className="my-3" />
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                          {history.remarks}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      No history available
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Approval history will appear here as actions are taken
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Action Buttons */}
        {ppmp && (
          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateVersionModal(true)}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Create New Version
              </Button>
            </div>
            <div className="flex gap-2">
              <ApprovalActions
                ppmp={ppmp}
                user={user}
                onActionComplete={() => {
                  onActionComplete?.();
                  if (ppmpId) {
                    getPPMPWithRelations(ppmpId).then(setPpmp);
                  }
                }}
              />
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Create New Version Modal */}
      <Dialog
        open={showCreateVersionModal}
        onOpenChange={setShowCreateVersionModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version of this PPMP. The new version will be based
              on the current PPMP data and will start as a DRAFT.
            </DialogDescription>
          </DialogHeader>
          <Form {...createVersionForm}>
            <form
              onSubmit={createVersionForm.handleSubmit(handleCreateVersion)}
              className="space-y-4"
            >
              <FormField
                control={createVersionForm.control}
                name="basisOfRevision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Basis of Revision <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain the reason for creating a new version (e.g., budget changes, scope modifications, etc.)"
                        rows={5}
                        className="resize-none"
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
                  onClick={() => {
                    setShowCreateVersionModal(false);
                    createVersionForm.reset();
                  }}
                  disabled={isCreatingVersion}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingVersion}>
                  {isCreatingVersion ? "Creating..." : "Create New Version"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
