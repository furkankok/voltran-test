"use client";

import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
}

const eventTypeStyles = {
  status: "bg-blue-500/10 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800",
  answer_key_complete: "bg-green-500/10 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800",
  student_reading_complete: "bg-green-500/10 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800",
  evaluation_chunk: "bg-purple-500/10 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800",
  evaluation_complete: "bg-purple-500/10 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800",
  response_id: "bg-gray-500/10 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800",
  chat_chunk: "bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800",
  chat_complete: "bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800",
  done: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800",
  error: "bg-red-500/10 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800",
};

const eventTypeLabels = {
  status: "Status",
  answer_key_complete: "Answer Key",
  student_reading_complete: "Student Exams",
  evaluation_chunk: "Evaluation",
  evaluation_complete: "Evaluation",
  response_id: "Response",
  chat_chunk: "Assistant",
  chat_complete: "Assistant",
  done: "Complete",
  error: "Error",
};

const eventIcons = {
  status: Info,
  answer_key_complete: CheckCircle2,
  student_reading_complete: CheckCircle2,
  evaluation_chunk: Loader2,
  evaluation_complete: CheckCircle2,
  response_id: Info,
  chat_chunk: Loader2,
  chat_complete: CheckCircle2,
  done: CheckCircle2,
  error: Info,
};

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const Icon = eventIcons[message.type] || Info;
  const isEvaluation = message.type === "evaluation_chunk" || message.type === "evaluation_complete";
  const isChat = message.type === "chat_chunk" || message.type === "chat_complete";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all duration-300 animate-in slide-in-from-bottom-2",
        eventTypeStyles[message.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon 
            className={cn(
              "h-4 w-4",
              message.isAccumulating && "animate-spin"
            )} 
          />
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", eventTypeStyles[message.type])}
            >
              {eventTypeLabels[message.type]}
            </Badge>
            <span className="text-xs opacity-60">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <div 
            className={cn(
              "text-sm whitespace-pre-wrap break-words",
              (isEvaluation || isChat) && "font-mono leading-relaxed"
            )}
          >
            {message.content}
            {message.isAccumulating && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
          
          {message.data && !isEvaluation && !isChat && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">
                View details
              </summary>
              <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-x-auto">
                {JSON.stringify(message.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

