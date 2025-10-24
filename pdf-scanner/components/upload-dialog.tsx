"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EventStream } from "@/components/event-stream";
import { useSSE } from "@/hooks/use-sse";
import { scanApi } from "@/lib/api-client";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  onUploadComplete?: () => void;
  children?: React.ReactNode;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function UploadDialog({ onUploadComplete, children }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { events, connect, clearEvents } = useSSE({
    onComplete: () => {
      setIsUploading(false);
      setUploadComplete(true);
      setTimeout(() => {
        onUploadComplete?.();
        handleClose();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
      } else {
        setFile(selectedFile);
        setError(null);
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
      } else {
        setFile(droppedFile);
        setError(null);
      }
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    clearEvents();

    try {
      const response = await scanApi.uploadPdf(file);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      connect(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    
    setOpen(false);
    setTimeout(() => {
      setFile(null);
      setError(null);
      setUploadComplete(false);
      clearEvents();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="lg" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload PDF for AI Scanning</DialogTitle>
          <DialogDescription>
            Upload a PDF file to analyze it with AI. You&apos;ll see real-time processing updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isUploading && !uploadComplete && (
            <>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  file && "border-primary bg-primary/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  
                  {file ? (
                    <div className="text-center">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-medium">Drag and drop your PDF here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                  )}

                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Browse Files
                    </Button>
                  </Label>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Scan
                </Button>
              </div>
            </>
          )}

          {isUploading && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Processing your PDF file. This may take a few moments...
                </AlertDescription>
              </Alert>
              
              <EventStream events={events} />
            </div>
          )}

          {uploadComplete && (
            <Alert className="bg-green-500/10 text-green-700 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                PDF uploaded and scanned successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

