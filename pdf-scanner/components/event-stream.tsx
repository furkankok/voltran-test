"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SSEEvent } from "@/types";
import { cn } from "@/lib/utils";

interface EventStreamProps {
  events: SSEEvent[];
  className?: string;
}

const eventTypeColors = {
  info: "bg-blue-500/10 text-blue-700 border-blue-200",
  success: "bg-green-500/10 text-green-700 border-green-200",
  warning: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  error: "bg-red-500/10 text-red-700 border-red-200",
  progress: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const eventTypeLabels = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
  progress: "Progress",
};

export function EventStream({ events, className }: EventStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground", className)}>
        <p className="text-sm">Waiting for events...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "max-h-[400px] overflow-y-auto space-y-2 p-4 bg-muted/30 rounded-lg border",
        className
      )}
    >
      {events.map((event, index) => (
        <div
          key={index}
          className={cn(
            "p-3 rounded-md border transition-all duration-300 animate-in slide-in-from-bottom-2",
            eventTypeColors[event.type]
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn("text-xs", eventTypeColors[event.type])}
            >
              {eventTypeLabels[event.type]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <p className="text-sm font-medium mb-1">{event.message}</p>
          
          {event.progress !== undefined && (
            <div className="mt-2 space-y-1">
              <Progress value={event.progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {event.progress}%
              </p>
            </div>
          )}
          
          {event.data && (
            <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

