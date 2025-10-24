"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { scanApi } from "@/lib/api-client";
import type { Scan } from "@/types";
import {
  FileText,
  Calendar,
  Clock,
  Database,
  Brain,
  AlertCircle,
  TrendingUp,
  Tag,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanDetailsDialogProps {
  scan: Scan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: { label: "Pending", className: "bg-gray-500/10 text-gray-700 border-gray-200" },
  processing: { label: "Processing", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-700 border-green-200" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-700 border-red-200" },
};

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1">{value}</div>
      </div>
    </div>
  );
}

export function ScanDetailsDialog({ scan: initialScan, open, onOpenChange }: ScanDetailsDialogProps) {
  const [scan, setScan] = useState<Scan | null>(initialScan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialScan) {
      setLoading(true);
      setError(null);
      
      scanApi
        .getScanById(initialScan.id)
        .then((response) => {
          if (response.data) {
            setScan(response.data);
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to load scan details");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, initialScan]);

  if (!scan) return null;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {scan.filename}
          </DialogTitle>
          <DialogDescription>
            Detailed information and AI analysis results
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={cn("mt-1", statusConfig[scan.status].className)}
                  >
                    {statusConfig[scan.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">File Size</p>
                  <p className="text-sm font-medium mt-1">{formatFileSize(scan.file_size)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">File Information</h3>
              <div className="bg-card border rounded-lg divide-y">
                <DetailRow
                  icon={FileText}
                  label="Filename"
                  value={<p className="text-sm break-all">{scan.filename}</p>}
                />
                <DetailRow
                  icon={Calendar}
                  label="Upload Date"
                  value={<p className="text-sm">{formatDate(scan.created_at)}</p>}
                />
                {scan.updated_at && (
                  <DetailRow
                    icon={Clock}
                    label="Last Updated"
                    value={<p className="text-sm">{formatDate(scan.updated_at)}</p>}
                  />
                )}
                <DetailRow
                  icon={Database}
                  label="Scan ID"
                  value={<p className="text-sm font-mono">{scan.id}</p>}
                />
              </div>
            </div>

            {scan.results && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis Results
                </h3>

                <div className="bg-card border rounded-lg p-4 space-y-4">
                  {scan.results.summary && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Summary</p>
                      <p className="text-sm leading-relaxed">{scan.results.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scan.results.pages && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pages</p>
                        <p className="text-2xl font-bold">{scan.results.pages}</p>
                      </div>
                    )}
                    {scan.results.processing_time && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Processing Time
                        </p>
                        <p className="text-2xl font-bold">
                          {scan.results.processing_time.toFixed(2)}s
                        </p>
                      </div>
                    )}
                  </div>

                  {scan.results.ai_analysis && (
                    <div className="space-y-4 pt-4 border-t">
                      {scan.results.ai_analysis.category && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Category
                          </p>
                          <Badge variant="secondary" className="text-sm">
                            {scan.results.ai_analysis.category}
                          </Badge>
                          {scan.results.ai_analysis.confidence && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({(scan.results.ai_analysis.confidence * 100).toFixed(1)}% confidence)
                            </span>
                          )}
                        </div>
                      )}

                      {scan.results.ai_analysis.sentiment && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Sentiment
                          </p>
                          <Badge variant="outline">{scan.results.ai_analysis.sentiment}</Badge>
                        </div>
                      )}

                      {scan.results.ai_analysis.keywords && scan.results.ai_analysis.keywords.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Keywords
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scan.results.ai_analysis.keywords.map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {scan.results.ai_analysis.entities && scan.results.ai_analysis.entities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Entities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scan.results.ai_analysis.entities.map((entity, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {scan.results.metadata && Object.keys(scan.results.metadata).length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Additional Metadata
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(scan.results.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scan.status === "failed" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This scan failed to complete. Please try uploading the file again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

