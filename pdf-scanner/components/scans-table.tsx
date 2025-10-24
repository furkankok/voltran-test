"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanDetailsDialog } from "@/components/scan-details";
import type { Scan, ScanStatus } from "@/types";
import { Eye, ArrowUpDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScansTableProps {
  scans: Scan[];
  loading?: boolean;
  onRefresh?: () => void;
}

type SortField = "created_at" | "filename" | "status";
type SortOrder = "asc" | "desc";

const statusConfig: Record<ScanStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-gray-500/10 text-gray-700 border-gray-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/10 text-green-700 border-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-700 border-red-200",
  },
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No scans yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Upload your first PDF to get started with AI-powered document scanning.
      </p>
    </div>
  );
}

export function ScansTable({ scans, loading, onRefresh }: ScansTableProps) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => {
      let aValue: string | number = a[sortField] || "";
      let bValue: string | number = b[sortField] || "";

      if (sortField === "created_at") {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [scans, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (scans.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("filename")}
                  className="h-8 px-2 lg:px-3"
                >
                  Filename
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("status")}
                  className="h-8 px-2 lg:px-3"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">File Size</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("created_at")}
                  className="h-8 px-2 lg:px-3"
                >
                  Upload Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedScans.map((scan) => (
              <TableRow key={scan.id} className="group">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-xs">{scan.filename}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(statusConfig[scan.status].className)}
                  >
                    {statusConfig[scan.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {formatFileSize(scan.file_size)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(scan.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedScan(scan)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ScanDetailsDialog
        scan={selectedScan}
        open={!!selectedScan}
        onOpenChange={(open) => !open && setSelectedScan(null)}
      />
    </>
  );
}

