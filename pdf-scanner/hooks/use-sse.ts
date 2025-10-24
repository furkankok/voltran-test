import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEEvent } from "@/types";

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    onEvent,
    onComplete,
    onError,
    reconnectAttempts = 3,
    reconnectDelay = 1000,
  } = options;

  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback((response: Response) => {
    if (!response.body) {
      const err = new Error("No response body");
      setError(err);
      onError?.(err);
      return;
    }

    setIsConnected(true);
    setError(null);
    reconnectCountRef.current = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processStream = async () => {
      try {
        let currentEvent: string | null = null;
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            setIsConnected(false);
            onComplete?.();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              try {
                const data = line.slice(6);
                if (!currentEvent) continue;
                
                const parsedData = JSON.parse(data);
                
                const sseEvent: SSEEvent = {
                  event: currentEvent as any,
                  data: parsedData,
                };
                
                setEvents((prev) => [...prev, sseEvent]);
                onEvent?.(sseEvent);
                
                if (currentEvent === "done") {
                  setIsConnected(false);
                  onComplete?.();
                  return;
                }
                
                currentEvent = null;
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Stream processing error");
        setError(error);
        setIsConnected(false);
        onError?.(error);
      }
    };

    processStream();
  }, [onEvent, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    events,
    isConnected,
    error,
    connect,
    disconnect,
    clearEvents,
  };
}

