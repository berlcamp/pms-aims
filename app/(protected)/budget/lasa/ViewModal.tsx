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
import { getLasaRowById } from "@/lib/services/lasa";
import { LasaRowWithRelations } from "@/types/database";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

interface ViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lasaId: string | null;
}

export function ViewModal({ isOpen, onClose, lasaId }: ViewModalProps) {
  const [lasaRow, setLasaRow] = useState<LasaRowWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lasaId) {
      setLoading(true);
      getLasaRowById(lasaId)
        .then((data) => {
          setLasaRow(data);
        })
        .catch((error) => {
          console.error("Failed to load LASA row:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLasaRow(null);
    }
  }, [isOpen, lasaId]);

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

  const getRowTypeBadge = (rowType: string) => {
    if (rowType === "PPMP_PROJECT") {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          PPMP Project
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        Manual
      </Badge>
    );
  };

  if (!lasaRow && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {lasaRow?.project_title || "LASA Row Details"}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Fiscal Year {lasaRow?.fiscal_year} • {lasaRow?.fund_source}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {lasaRow && getRowTypeBadge(lasaRow.row_type)}
              {lasaRow?.is_locked && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-800"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading LASA row details...
          </div>
        ) : lasaRow ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Row Type</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRowTypeBadge(lasaRow.row_type)}
                    {lasaRow.is_locked && (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fiscal Year</p>
                  <p className="font-medium">{lasaRow.fiscal_year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fund Source</p>
                  <p className="font-medium">{lasaRow.fund_source}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Planned Amount
                  </p>
                  <p className="font-medium text-lg">
                    {formatCurrency(lasaRow.planned_amount)}
                  </p>
                </div>
                {lasaRow.saro_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">SARO Number</p>
                    <p className="font-medium">{lasaRow.saro_number}</p>
                  </div>
                )}
                {lasaRow.office && (
                  <div>
                    <p className="text-sm text-muted-foreground">Office</p>
                    <p className="font-medium">{lasaRow.office.name}</p>
                    {lasaRow.office.code && (
                      <p className="text-xs text-muted-foreground">
                        {lasaRow.office.code}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Project Details
              </h3>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Project / Program Name
                </p>
                <p className="font-medium">{lasaRow.project_title}</p>
              </div>
              {lasaRow.proponent && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Proponent
                  </p>
                  <p className="font-medium">{lasaRow.proponent.name}</p>
                  {lasaRow.proponent.email && (
                    <p className="text-xs text-muted-foreground">
                      {lasaRow.proponent.email}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PPMP Link (if applicable) */}
            {lasaRow.ppmp && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Linked PPMP
                </h3>
                <div className="p-4 border rounded-lg bg-blue-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {lasaRow.ppmp.project_title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PPMP {lasaRow.ppmp.ppmp_number}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-2 bg-white text-xs"
                      >
                        {lasaRow.ppmp.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold border-b pb-2">Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(lasaRow.created_at)}</p>
                </div>
                {lasaRow.created_by_user && (
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="text-sm">{lasaRow.created_by_user.name}</p>
                    {lasaRow.created_by_user.email && (
                      <p className="text-xs text-muted-foreground">
                        {lasaRow.created_by_user.email}
                      </p>
                    )}
                  </div>
                )}
                {lasaRow.updated_at &&
                  lasaRow.updated_at !== lasaRow.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Updated
                      </p>
                      <p className="text-sm">
                        {formatDate(lasaRow.updated_at)}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {lasaRow && (
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
