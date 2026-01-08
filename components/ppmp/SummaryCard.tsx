"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PPMPWithRelations } from "@/types/database";
import { format } from "date-fns";
import { StatusBadge } from "./StatusBadge";

interface SummaryCardProps {
  ppmp: PPMPWithRelations;
  onAction?: (action: string) => void;
}

export function SummaryCard({ ppmp, onAction }: SummaryCardProps) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{ppmp.project_title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              PPMP {ppmp.ppmp_number} • FY {ppmp.fiscal_year}
            </p>
          </div>
          <StatusBadge status={ppmp.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Office/School</p>
            <p className="text-sm font-medium">
              {ppmp.office?.name || ppmp.school?.name || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="text-sm font-medium">{ppmp.ppmp_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Project Type</p>
            <p className="text-sm font-medium">{ppmp.project_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="text-sm font-medium">v{ppmp.version}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Total Budget</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(ppmp.total_budget_amount)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{formatDate(ppmp.created_at)}</p>
          </div>
          {ppmp.submitted_at && (
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm">{formatDate(ppmp.submitted_at)}</p>
            </div>
          )}
        </div>

        {ppmp.items && ppmp.items.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Items: {ppmp.items.length}
            </p>
            {ppmp.lots && ppmp.lots.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Lots: {ppmp.lots.length}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
