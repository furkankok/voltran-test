"use client";

import { FileText, Files } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UploadedFiles } from "@/types";

interface FileIndicatorProps {
  files: UploadedFiles;
}

export function FileIndicator({ files }: FileIndicatorProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border mb-6">
      <div className="flex items-center gap-2 flex-1">
        <FileText className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Answer Key</p>
          <p className="text-sm font-medium truncate">{files.answerKey.name}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {(files.answerKey.size / 1024 / 1024).toFixed(2)} MB
        </Badge>
      </div>
      
      <div className="h-8 w-px bg-border" />
      
      <div className="flex items-center gap-2 flex-1">
        <Files className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Student Exams</p>
          <p className="text-sm font-medium">
            {files.studentExams.length} file{files.studentExams.length > 1 ? "s" : ""}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {(files.studentExams.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
        </Badge>
      </div>
    </div>
  );
}

