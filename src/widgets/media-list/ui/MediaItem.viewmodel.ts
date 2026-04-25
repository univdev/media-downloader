import { useCallback } from "react";
import { useOpenFolder } from "@/features/open-folder";
import type { Download } from "@/entities/download";

export function useMediaItemViewModel(download: Download) {
  const { open } = useOpenFolder();

  const handleClick = useCallback(() => {
    open(download.save_directory);
  }, [open, download.save_directory]);

  const hasFailures = download.failed_files > 0;
  const isComplete = download.status === "completed";
  const totalFiles = download.total_files;
  const completedFiles = download.completed_files;
  const failedFiles = download.failed_files;
  const date = download.created_at.split("T")[0];
  const folderName = download.save_directory.split("/").slice(-2).join("/");

  return {
    folderName,
    totalFiles,
    completedFiles,
    failedFiles,
    date,
    hasFailures,
    isComplete,
    handleClick,
  };
}
