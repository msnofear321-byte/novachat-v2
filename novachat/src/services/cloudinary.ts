const CLOUD_NAME: string = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET: string = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function getFileType(file: File | Blob): "image" | "video" | "voice" | "file" {
  const mime: string = (file as File).type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "voice";
  return "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k: number = 1024;
  const sizes: string[] = ["B", "KB", "MB", "GB"];
  const i: number = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i];
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + size;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}

export function uploadToCloudinary(
  file: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary environment variables not found."));
      return;
    }

    let resource: string = "raw";
    const mime: string = (file as File).type || "";
    if (mime.startsWith("image/")) {
      resource = "image";
    } else if (mime.startsWith("video/")) {
      resource = "video";
    }

    const cloudName = CLOUD_NAME;
    const uploadUrl: string = "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resource + "/upload";

    const formData: FormData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "novachat");

    const xhr: XMLHttpRequest = new XMLHttpRequest();

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (event.lengthComputable) {
        const progress: number = Math.round((event.loaded / event.total) * 100);
        onProgress?.(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
      } else {
        try {
          const err: { error: { message: string } } = JSON.parse(xhr.responseText);
          reject(new Error(err.error.message));
        } catch {
          reject(new Error("Cloudinary Upload Failed"));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network Error"));
    };

    xhr.open("POST", uploadUrl);
    xhr.send(formData);
  });
}

export function getMediaDownloadURL(
  url: string,
  type: "image" | "video" | "voice" | "file",
): string {
  if (type === "image") {
    return url.replace("/upload/", "/upload/f_auto,q_auto,w_900/");
  }
  if (type === "video") {
    return url.replace("/upload/", "/upload/q_auto,f_auto/");
  }
  return url;
}
