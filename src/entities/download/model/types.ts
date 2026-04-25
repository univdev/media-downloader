export type DownloadStatus =
  | "pending"
  | "scanning"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled";

export interface Download {
  id: number;
  sequence_name: string;
  status: DownloadStatus;
  total_files: number;
  completed_files: number;
  failed_files: number;
  save_directory: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface DownloadProgress {
  download_id: number;
  phase: "scanning" | "downloading";
  current: number;
  total: number;
  current_file: string | null;
  status: "in_progress" | "completed" | "failed";
  failed_count: number;
}
