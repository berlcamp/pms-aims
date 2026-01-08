"use client";

import { StatusBadge } from "@/components/ppmp/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtendedUser } from "@/lib/redux/userSlice";
import { getPPMPWithRelations } from "@/lib/services/ppmp";
import { PPMPWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { ApprovalActions } from "./ApprovalActions";

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

  if (!ppmp && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {ppmp?.project_title || "PPMP Details"}
              </DialogTitle>
              <DialogDescription className="mt-2">
                PPMP {ppmp?.ppmp_number} • FY {ppmp?.fiscal_year} • Version{" "}
                {ppmp?.version}
              </DialogDescription>
            </div>
            {ppmp && <StatusBadge status={ppmp.status} />}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading PPMP details...
          </div>
        ) : ppmp ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Office/School</p>
                  <p className="font-medium">
                    {ppmp.office?.name || ppmp.school?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PPMP Type</p>
                  <p className="font-medium">{ppmp.ppmp_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fiscal Year</p>
                  <p className="font-medium">{ppmp.fiscal_year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Implementation Mode
                  </p>
                  <p className="font-medium">{ppmp.implementation_mode}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  General Description
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {ppmp.general_description}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Objective</p>
                <p className="text-sm whitespace-pre-wrap">{ppmp.objective}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(ppmp.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="text-sm">
                    {ppmp.submitted_by_user?.name || "-"}
                  </p>
                </div>
                {ppmp.submitted_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="text-sm">{formatDate(ppmp.submitted_at)}</p>
                  </div>
                )}
                {ppmp.approved_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-sm">{formatDate(ppmp.approved_at)}</p>
                    <p className="text-xs text-muted-foreground">
                      by {ppmp.approved_by_user?.name || "-"}
                    </p>
                  </div>
                )}
              </div>

              {ppmp.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Remarks</p>
                  <p className="text-sm whitespace-pre-wrap">{ppmp.remarks}</p>
                </div>
              )}
            </TabsContent>

            {/* Classification Tab */}
            <TabsContent value="classification" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project Type</p>
                  <p className="font-medium">{ppmp.project_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    General Support Services
                  </p>
                  <p className="font-medium">
                    {ppmp.is_general_support_services ? "Yes" : "No"}
                  </p>
                </div>
                {ppmp.suggested_mode_of_procurement && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Suggested Mode of Procurement
                    </p>
                    <p className="font-medium">
                      {ppmp.suggested_mode_of_procurement}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4">
              {ppmp.lots && ppmp.lots.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Lots</h3>
                  {ppmp.lots.map((lot) => (
                    <div key={lot.id} className="p-4 border rounded-lg">
                      <p className="font-medium">
                        Lot {lot.lot_number}: {lot.lot_name}
                      </p>
                      {lot.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {lot.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {ppmp.items && ppmp.items.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-semibold">Items ({ppmp.items.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ppmp.items.map((item) => {
                      const lot = ppmp.lots?.find((l) => l.id === item.lot_id);
                      return (
                        <div
                          key={item.id}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          {lot && (
                            <p className="text-xs text-muted-foreground">
                              Lot {lot.lot_number}: {lot.lot_name}
                            </p>
                          )}
                          <p className="font-medium">{item.item_description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Quantity:{" "}
                              </span>
                              <span>
                                {item.quantity} {item.unit_of_measure}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Unit Cost:{" "}
                              </span>
                              <span>
                                {formatCurrency(item.estimated_unit_cost)}
                              </span>
                            </div>
                            {item.size_specification && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">
                                  Specification:{" "}
                                </span>
                                <span>{item.size_specification}</span>
                              </div>
                            )}
                            <div className="col-span-2 pt-2 border-t">
                              <span className="text-muted-foreground">
                                Total Cost:{" "}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(item.estimated_total_cost)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Budget:</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(ppmp.total_budget_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No items</p>
              )}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Start of Procurement
                  </p>
                  <p className="font-medium">
                    {formatMonthYear(
                      ppmp.procurement_start_month,
                      ppmp.procurement_start_year
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    End of Procurement
                  </p>
                  <p className="font-medium">
                    {formatMonthYear(
                      ppmp.procurement_end_month,
                      ppmp.procurement_end_year
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Delivery/Implementation Start
                  </p>
                  <p className="font-medium">
                    {formatMonthYear(
                      ppmp.delivery_start_month,
                      ppmp.delivery_start_year
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Delivery/Implementation End
                  </p>
                  <p className="font-medium">
                    {formatMonthYear(
                      ppmp.delivery_end_month,
                      ppmp.delivery_end_year
                    )}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Source of Funds
                  </p>
                  <p className="font-medium">{ppmp.source_of_funds}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(ppmp.total_budget_amount)}
                  </p>
                </div>
                {ppmp.estimated_budget && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimated Budget
                    </p>
                    <p className="font-medium">
                      {formatCurrency(ppmp.estimated_budget)}
                    </p>
                  </div>
                )}
                {ppmp.authorized_budget && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Authorized Budget
                    </p>
                    <p className="font-medium">
                      {formatCurrency(ppmp.authorized_budget)}
                    </p>
                  </div>
                )}
                {ppmp.budget_override_justification && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Budget Override Justification
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {ppmp.budget_override_justification}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-4">
              {ppmp.attachments && ppmp.attachments.length > 0 ? (
                <div className="space-y-2">
                  {ppmp.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{attachment.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {attachment.document_type.replace(/_/g, " ")}
                            {attachment.file_size &&
                              ` • ${(
                                attachment.file_size /
                                1024 /
                                1024
                              ).toFixed(2)} MB`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(attachment.file_url, "_blank")
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No attachments</p>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {ppmp.approval_history && ppmp.approval_history.length > 0 ? (
                <div className="space-y-4">
                  {ppmp.approval_history
                    .sort(
                      (a, b) =>
                        new Date(b.acted_at).getTime() -
                        new Date(a.acted_at).getTime()
                    )
                    .map((history) => (
                      <div key={history.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium capitalize">
                              {history.action}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(history.acted_at)}
                            </p>
                            {history.remarks && (
                              <p className="text-sm mt-2 whitespace-pre-wrap">
                                {history.remarks}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {history.previous_status} → {history.new_status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No history available</p>
              )}
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Action Buttons */}
        {ppmp && (
          <div className="flex items-center justify-between pt-4 border-t">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
