import { supabase } from "@/lib/supabase/client";
import { PPMPAttachmentType } from "@/types/database";

const STORAGE_BUCKET = "procurement_documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload a PPMP attachment file to Supabase Storage
 */
export async function uploadPPMPAttachment(
  file: File,
  ppmpId: string,
  documentType: PPMPAttachmentType
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`
    );
  }

  // Generate unique file name
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${ppmpId}/${documentType}/${timestamp}_${sanitizedFileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to get public URL for uploaded file");
  }

  return {
    fileUrl: urlData.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Delete a PPMP attachment from Supabase Storage
 */
export async function deletePPMPAttachment(fileUrl: string): Promise<void> {
  // Extract file path from URL
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split("/");
  const bucketIndex = pathParts.findIndex((part) => part === STORAGE_BUCKET);

  if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
    throw new Error("Invalid file URL");
  }

  const filePath = pathParts.slice(bucketIndex + 1).join("/");

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get public URL for an attachment
 */
export function getAttachmentUrl(filePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return data?.publicUrl || "";
}

/**
 * Check if storage bucket exists, create if it doesn't
 * Note: This should be run server-side or with admin privileges
 */
export async function ensureStorageBucket(): Promise<void> {
  // Check if bucket exists
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  const bucketExists = buckets?.some(
    (bucket) => bucket.name === STORAGE_BUCKET
  );

  if (!bucketExists) {
    // Note: Creating buckets requires admin privileges
    // This should be done via Supabase dashboard or admin API
    console.warn(
      `Storage bucket "${STORAGE_BUCKET}" does not exist. Please create it in Supabase dashboard.`
    );
  }
}
