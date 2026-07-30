import { useState, useCallback } from 'react';
import { uploadToCloudinary, getFileType, getMediaDownloadURL, type CloudinaryUploadResult } from '@/services/cloudinary';

interface UploadState {
  [key: string]: {
    progress: number;
    result: CloudinaryUploadResult | null;
    error: string | null;
    uploading: boolean;
  };
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadState>({});

  const upload = useCallback(
    async (file: File | Blob): Promise<{ url: string; result: CloudinaryUploadResult } | null> => {
      const name = (file as File).name || `upload-${Date.now()}`;
      const key = `${name}_${Date.now()}`;

      setUploads((prev) => ({
        ...prev,
        [key]: { progress: 0, result: null, error: null, uploading: true },
      }));

      try {
        const result = await uploadToCloudinary(file, (progress) => {
          setUploads((prev) => ({
            ...prev,
            [key]: { ...prev[key], progress },
          }));
        });

        const fileType = getFileType(file);
        const url = getMediaDownloadURL(result.secure_url, fileType);

        setUploads((prev) => ({
          ...prev,
          [key]: { ...prev[key], result, uploading: false, progress: 100 },
        }));
        return { url, result };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads((prev) => ({
          ...prev,
          [key]: { ...prev[key], error: msg, uploading: false },
        }));
        return null;
      }
    },
    [],
  );

  return { uploads, upload };
}
