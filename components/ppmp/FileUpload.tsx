"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deletePPMPAttachment,
  uploadPPMPAttachment,
} from "@/lib/services/storage";
import { cn } from "@/lib/utils";
import { PPMPAttachmentType } from "@/types/database";
import { FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export interface UploadedFile {
  id?: string;
  documentType: PPMPAttachmentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  isRequired: boolean;
}

interface FileUploadProps {
  ppmpId: string;
  documentType: PPMPAttachmentType;
  label: string;
  isRequired?: boolean;
  description?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  onUploadComplete?: (file: UploadedFile) => void;
  onDelete?: (fileUrl: string) => void;
  existingFiles?: UploadedFile[];
  disabled?: boolean;
}

export function FileUpload({
  ppmpId,
  documentType,
  label,
  isRequired = false,
  description,
  acceptedFileTypes = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
  ],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  onUploadComplete,
  onDelete,
  existingFiles = [],
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const fileExtension =
      "." + selectedFile.name.split(".").pop()?.toLowerCase();
    if (
      !acceptedFileTypes.some((type) =>
        fileExtension.includes(type.toLowerCase())
      )
    ) {
      toast.error(
        `File type not allowed. Accepted types: ${acceptedFileTypes.join(", ")}`
      );
      return;
    }

    // Validate file size
    if (selectedFile.size > maxFileSize) {
      toast.error(
        `File size exceeds maximum allowed size of ${
          maxFileSize / 1024 / 1024
        }MB`
      );
      return;
    }

    setUploading(true);
    try {
      const result = await uploadPPMPAttachment(
        selectedFile,
        ppmpId,
        documentType
      );

      const newFile: UploadedFile = {
        documentType,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        isRequired,
      };

      setFiles((prev) => [...prev, newFile]);
      onUploadComplete?.(newFile);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleDelete = async (fileUrl: string, index: number) => {
    if (disabled) return;

    try {
      await deletePPMPAttachment(fileUrl);
      setFiles((prev) => prev.filter((_, i) => i !== index));
      onDelete?.(fileUrl);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-4 w-4" />;
    if (mimeType.includes("pdf"))
      return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    if (mimeType.includes("image")) {
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`file-upload-${documentType}`}
          className="text-sm font-medium"
        >
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="space-y-2">
        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <Input
            id={`file-upload-${documentType}`}
            type="file"
            accept={acceptedFileTypes.join(",")}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
          <Label
            htmlFor={`file-upload-${documentType}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer transition-colors",
              disabled || uploading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent"
            )}
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">
              {uploading ? "Uploading..." : "Choose file"}
            </span>
          </Label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    {file.fileSize && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(file.fileUrl, "_blank")}
                    className="h-8 w-8"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.fileUrl, index)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Required indicator */}
        {isRequired && files.length === 0 && (
          <p className="text-xs text-destructive">
            This file is required for submission
          </p>
        )}
      </div>
    </div>
  );
}
