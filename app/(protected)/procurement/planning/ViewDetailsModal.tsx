/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { supabase } from "@/lib/supabase/client";
import { ProcurementProposal } from "@/types/database";
import { Download } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type ItemType = ProcurementProposal;

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-500";
    case "rejected":
      return "bg-red-500";
    case "under_evaluation":
      return "bg-yellow-500";
    case "returned":
      return "bg-orange-500";
    case "submitted":
      return "bg-blue-500";
    case "draft":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ItemType | null;
}

const parseDocumentUrls = (
  documentUrl: string | null | undefined
): string[] => {
  if (!documentUrl) return [];
  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(documentUrl);
    if (Array.isArray(parsed)) {
      // Ensure all items are strings
      return parsed.filter((item): item is string => typeof item === "string");
    }
    // If it's a single string (backward compatibility)
    return typeof documentUrl === "string" ? [documentUrl] : [];
  } catch {
    // If parsing fails, treat as single URL (backward compatibility)
    return typeof documentUrl === "string" ? [documentUrl] : [];
  }
};

export const ViewDetailsModal = ({ isOpen, onClose, proposal }: ModalProps) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (!proposal) return null;

  const documentUrls = parseDocumentUrls(proposal.document_url);

  // Extract file path from Supabase Storage URL
  const extractFilePath = (url: string): string | null => {
    try {
      // URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.indexOf("public");
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        // Get everything after "public/[bucket-name]/"
        const filePathParts = pathParts.slice(bucketIndex + 2);
        return filePathParts.join("/");
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleDownload = async (url: string, index: number) => {
    setDownloadingIndex(index);
    try {
      // Ensure url is a string
      const urlString = typeof url === "string" ? url : String(url);

      // Extract file path from the stored URL
      const filePath = extractFilePath(urlString);

      if (!filePath) {
        // Fallback: try direct URL if path extraction fails
        const link = document.createElement("a");
        link.href = urlString;
        link.target = "_blank";
        const fileName =
          urlString.split("/").pop() ||
          `proposal-${proposal.proposal_number || proposal.id}-${
            index + 1
          }.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Generate signed URL for download
      const { data, error } = await supabase.storage
        .from("procurement_documents")
        .createSignedUrl(filePath, 3600); // URL valid for 1 hour

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.target = "_blank";
        const fileName =
          urlString.split("/").pop() ||
          `proposal-${proposal.proposal_number || proposal.id}-${
            index + 1
          }.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Failed to generate download URL");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(
        error.message || "Failed to download document. Please try again."
      );
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Proposal Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this procurement proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Proposal Number
                </label>
                <p className="text-sm font-medium mt-1">
                  {proposal.proposal_number || "-"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Type
                </label>
                <p className="text-sm mt-1">
                  <span className="app__badge">{proposal.type || "-"}</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Category
                </label>
                <p className="text-sm mt-1">
                  <span className="app__badge">{proposal.category || "-"}</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Level
                </label>
                <p className="text-sm mt-1">
                  <span className="app__badge">{proposal.level || "-"}</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Fiscal Year
                </label>
                <p className="text-sm mt-1">{proposal.fiscal_year || "-"}</p>
              </div>
              {proposal.quarter && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Quarter
                  </label>
                  <p className="text-sm mt-1">Q{proposal.quarter}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Status
                </label>
                <p className="text-sm mt-1">
                  <Badge className={getStatusColor(proposal.status)}>
                    {formatStatus(proposal.status)}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Version
                </label>
                <p className="text-sm mt-1">{proposal.version || 1}</p>
              </div>
            </div>
          </div>

          {/* Proposal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Proposal Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Title
                </label>
                <p className="text-sm font-medium mt-1">
                  {proposal.title || "-"}
                </p>
              </div>
              {proposal.description && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {proposal.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Financial Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Total Amount
                </label>
                <p className="text-sm font-medium mt-1">
                  ₱{proposal.total_amount?.toLocaleString() || "0.00"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Budget Source
                </label>
                <p className="text-sm mt-1">{proposal.budget_source || "-"}</p>
              </div>
              {proposal.fund_code && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Fund Code
                  </label>
                  <p className="text-sm mt-1">{proposal.fund_code}</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Attachments */}
          {documentUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Attachments ({documentUrls.length})
              </h3>
              <div className="space-y-2">
                {documentUrls.map((url, index) => {
                  // Ensure url is a string
                  const urlString = typeof url === "string" ? url : String(url);
                  const fileName =
                    urlString.split("/").pop() || `Document ${index + 1}`;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-md bg-gray-50"
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
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Document {index + 1} of {documentUrls.length}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(urlString, index)}
                        variant="outline"
                        size="sm"
                        className="h-9 flex-shrink-0"
                        disabled={downloadingIndex === index}
                      >
                        {downloadingIndex === index ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {downloadingIndex === index
                          ? "Downloading..."
                          : "Download"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Created At
                </label>
                <p className="text-sm mt-1">
                  {proposal.created_at
                    ? new Date(proposal.created_at).toLocaleString()
                    : "-"}
                </p>
              </div>
              {proposal.submitted_at && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Submitted At
                  </label>
                  <p className="text-sm mt-1">
                    {new Date(proposal.submitted_at).toLocaleString()}
                  </p>
                </div>
              )}
              {proposal.approved_at && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Approved At
                  </label>
                  <p className="text-sm mt-1">
                    {new Date(proposal.approved_at).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Last Updated
                </label>
                <p className="text-sm mt-1">
                  {proposal.updated_at
                    ? new Date(proposal.updated_at).toLocaleString()
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="h-10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
