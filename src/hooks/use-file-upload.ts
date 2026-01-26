"use client";

import { useState, useCallback } from "react";

const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadResult {
  key: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  category: "flags" | "audio" | "content";
  nationSlug: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({
  category,
  nationSlug,
  onSuccess,
  onError,
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
        setError("Image must be less than 100MB");
        setUploading(false);
        return null;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("nationSlug", nationSlug);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const result: UploadResult = await response.json();
        setProgress(100);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        onError?.(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [category, nationSlug, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return { upload, uploading, progress, error, reset };
}
