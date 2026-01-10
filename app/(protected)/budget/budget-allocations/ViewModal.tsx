"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBudgetAllocationById } from "@/lib/services/budget-allocations";
import { BudgetAllocationWithRelations } from "@/types/database";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface ViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocationId: string | null;
}

export function ViewModal({
  isOpen,
  onClose,
  allocationId,
}: ViewModalProps) {
  const [allocation, setAllocation] =
    useState<BudgetAllocationWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && allocationId) {
      setLoading(true);
      getBudgetAllocationById(allocationId)
        .then((data) => {
          setAllocation(data);
        })
        .catch((error) => {
          console.error("Failed to load budget allocation:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAllocation(null);
    }
  }, [isOpen, allocationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Closed
          </Badge>
        );
      case "draft":
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
            Draft
          </Badge>
        );
    }
  };

  if (!allocation && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {allocation?.allocation_name || "Budget Allocation Details"}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Fiscal Year {allocation?.fiscal_year} •{" "}
                {allocation?.fund_source}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {allocation && getStatusBadge(allocation.status)}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading budget allocation details...
          </div>
        ) : allocation ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Allocation Name
                  </p>
                  <p className="font-medium">{allocation.allocation_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(allocation.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fiscal Year</p>
                  <p className="font-medium">{allocation.fiscal_year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fund Source</p>
                  <p className="font-medium">{allocation.fund_source}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Allocation Amount
                  </p>
                  <p className="font-medium text-lg">
                    {formatCurrency(allocation.allocation_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* LASA Link (if applicable) */}
            {allocation.lasa && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Linked LASA
                </h3>
                <div className="p-4 border rounded-lg bg-blue-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {allocation.lasa.project_title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fiscal Year {allocation.lasa.fiscal_year} •{" "}
                        {allocation.lasa.fund_source}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        Planned Amount:{" "}
                        {formatCurrency(allocation.lasa.planned_amount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remarks */}
            {allocation.remarks && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Remarks</h3>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm whitespace-pre-wrap">
                    {allocation.remarks}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold border-b pb-2">Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(allocation.created_at)}</p>
                </div>
                {allocation.created_by_user && (
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="text-sm">{allocation.created_by_user.name}</p>
                    {allocation.created_by_user.email && (
                      <p className="text-xs text-muted-foreground">
                        {allocation.created_by_user.email}
                      </p>
                    )}
                  </div>
                )}
                {allocation.proponent && (
                  <div>
                    <p className="text-sm text-muted-foreground">Proponent</p>
                    <p className="text-sm">{allocation.proponent.name}</p>
                    {allocation.proponent.email && (
                      <p className="text-xs text-muted-foreground">
                        {allocation.proponent.email}
                      </p>
                    )}
                  </div>
                )}
                {allocation.updated_at &&
                  allocation.updated_at !== allocation.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Updated
                      </p>
                      <p className="text-sm">
                        {formatDate(allocation.updated_at)}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {allocation && (
          <div className="flex items-center justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
