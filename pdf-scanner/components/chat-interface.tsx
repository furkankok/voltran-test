"use client";

import { useState, useRef, useEffect } from "react";
import { FileUploadForm } from "@/components/file-upload-form";
import { FileIndicator } from "@/components/file-indicator";
import { ChatMessageComponent } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSSE } from "@/hooks/use-sse";
import { scanApi } from "@/lib/api-client";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ChatMessage, UploadedFiles, SSEEvent } from "@/types";

export function ChatInterface() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSSEEvent = (event: SSEEvent) => {
    const timestamp = new Date();
    
    if (event.data.response_id) {
      setResponseId(event.data.response_id);
    }
    
    switch (event.event) {
      case "response_id":
        if (event.data.response_id) {
          setResponseId(event.data.response_id);
        }
        break;
        
      case "status":
        setMessages(prev => [...prev, {
          id: `status-${Date.now()}-${Math.random()}`,
          type: "status",
          content: event.data.message || "",
          timestamp,
          stage: event.data.stage,
        }]);
        break;
        
      case "answer_key_complete":
        setMessages(prev => [...prev, {
          id: `answer-${Date.now()}-${Math.random()}`,
          type: "answer_key_complete",
          content: event.data.message || "Answer key reading completed",
          timestamp,
          data: event.data.data,
        }]);
        break;
        
      case "student_reading_complete":
        setMessages(prev => [...prev, {
          id: `student-${Date.now()}-${Math.random()}`,
          type: "student_reading_complete",
          content: `${event.data.count || 0} student exams read successfully`,
          timestamp,
          data: event.data.data,
        }]);
        break;
        
      case "evaluation_chunk":
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          
          if (lastMessage && lastMessage.isAccumulating) {
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? { ...msg, content: msg.content + (event.data.delta || "") }
                : msg
            );
          } else {
            const newId = `eval-${Date.now()}-${Math.random()}`;
            setCurrentEvaluationId(newId);
            return [...prev, {
              id: newId,
              type: "evaluation_chunk",
              content: event.data.delta || "",
              timestamp,
              isAccumulating: true,
            }];
          }
        });
        break;
        
      case "evaluation_complete":
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.isAccumulating) {
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? { ...msg, type: "evaluation_complete", isAccumulating: false }
                : msg
            );
          }
          return prev;
        });
        setCurrentEvaluationId(null);
        break;
        
      case "chat_chunk":
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          
          if (lastMessage && lastMessage.isAccumulating && lastMessage.type === "chat_chunk") {
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? { ...msg, content: msg.content + (event.data.delta || "") }
                : msg
            );
          } else {
            const newId = `chat-${Date.now()}-${Math.random()}`;
            return [...prev, {
              id: newId,
              type: "chat_chunk",
              content: event.data.delta || "",
              timestamp,
              isAccumulating: true,
            }];
          }
        });
        break;
        
      case "chat_complete":
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.isAccumulating) {
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? { ...msg, type: "chat_complete", isAccumulating: false }
                : msg
            );
          }
          return prev;
        });
        setIsStreaming(false);
        break;
        
      case "done":
        setMessages(prev => [...prev, {
          id: `done-${Date.now()}-${Math.random()}`,
          type: "done",
          content: event.data.message || "All operations completed successfully",
          timestamp,
        }]);
        setIsUploading(false);
        setIsStreaming(false);
        break;
        
      case "error":
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}-${Math.random()}`,
          type: "error",
          content: event.data.message || "An error occurred",
          timestamp,
        }]);
        setIsUploading(false);
        setIsStreaming(false);
        break;
    }
  };

  const { connect, clearEvents } = useSSE({
    onEvent: handleSSEEvent,
    onComplete: () => {
      setIsUploading(false);
      setIsStreaming(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsUploading(false);
      setIsStreaming(false);
    },
  });

  const handleUpload = async (answerKey: File, studentExams: File[]) => {
    setIsUploading(true);
    setIsStreaming(true);
    setError(null);
    setMessages([]);
    setCurrentEvaluationId(null);
    setResponseId(null);
    clearEvents();

    try {
      const response = await scanApi.uploadExams(answerKey, studentExams);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadedFiles({ answerKey, studentExams });
      connect(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setIsUploading(false);
      setIsStreaming(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!responseId) {
      setError("No response ID available");
      return;
    }

    setIsStreaming(true);
    setError(null);
    setCurrentEvaluationId(null);

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}-${Math.random()}`,
      type: "status",
      content: message,
      timestamp: new Date(),
    }]);

    try {
      const response = await scanApi.sendMessage(responseId, message);
      
      if (!response.ok) {
        throw new Error(`Message send failed: ${response.statusText}`);
      }

      connect(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setUploadedFiles(null);
    setMessages([]);
    setError(null);
    setIsUploading(false);
    setIsStreaming(false);
    setCurrentEvaluationId(null);
    setResponseId(null);
    clearEvents();
  };

  if (!uploadedFiles) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <FileUploadForm onUpload={handleUpload} isUploading={isUploading} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Exam Evaluation</h1>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isUploading}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Chat
          </Button>
        </div>

        <FileIndicator files={uploadedFiles} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden flex flex-col">
          <div 
            ref={chatContainerRef}
            className="p-6 min-h-[500px] max-h-[600px] overflow-y-auto space-y-4 flex-1"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Waiting for evaluation to start...</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          <ChatInput 
            onSend={handleSendMessage} 
            disabled={isStreaming || !responseId}
            placeholder={!responseId ? "Upload files to start chatting..." : "Type your message..."}
          />
        </div>
      </div>
    </div>
  );
}

