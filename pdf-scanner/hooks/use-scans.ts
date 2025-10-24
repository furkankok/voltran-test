"use client";

import { useState, useEffect, useCallback } from "react";
import { scanApi } from "@/lib/api-client";
import type { Scan } from "@/types";

export function useScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await scanApi.getScans();
      setScans(response.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch scans";
      setError(message);
      console.error("Error fetching scans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  return {
    scans,
    loading,
    error,
    refetch: fetchScans,
  };
}

