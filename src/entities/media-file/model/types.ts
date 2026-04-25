export type MediaFileStatus = "pending" | "downloading" | "completed" | "failed";

export interface MediaFile {
  id: number;
  download_id: number;
  source_url: string;
  page_url: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number;
  media_type: "image" | "video";
  status: MediaFileStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}
