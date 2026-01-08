"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PPMPStatus } from "@/types/database";
import { CheckCircle2, Clock, FileCheck, FileX, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: PPMPStatus;
  className?: string;
}

const statusConfig: Record<
  PPMPStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle2;
  }
> = {
  DRAFT: {
    label: "Draft",
    variant: "outline",
    icon: FileX,
  },
  FOR_APPROVAL: {
    label: "For Approval",
    variant: "secondary",
    icon: Clock,
  },
  APPROVED_BY_OFFICE: {
    label: "Approved by Office",
    variant: "default",
    icon: CheckCircle2,
  },
  SUBMITTED_TO_PROCUREMENT: {
    label: "Submitted to Procurement",
    variant: "default",
    icon: FileCheck,
  },
  CONSOLIDATED: {
    label: "Consolidated",
    variant: "default",
    icon: CheckCircle2,
  },
  RETURNED_FOR_REVISION: {
    label: "Returned for Revision",
    variant: "destructive",
    icon: XCircle,
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1.5", className)}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
