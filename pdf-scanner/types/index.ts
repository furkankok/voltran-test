export type ScanStatus = "pending" | "processing" | "completed" | "failed";

export type EventType = "status" | "answer_key_complete" | "student_reading_complete" | "evaluation_chunk" | "evaluation_complete" | "response_id" | "chat_chunk" | "chat_complete" | "done" | "error";

export type ChatStage = "answer_key_reading" | "student_reading" | "evaluation" | "complete";

export interface Question {
  question_number: number;
  question: string;
  answer?: string;
}

export interface StudentExam {
  student_name: string;
  questions: Question[];
}

export interface Scan {
  id: string;
  filename: string;
  status: ScanStatus;
  created_at: string;
  updated_at?: string;
  file_size?: number;
  results?: ScanResults;
}

export interface ScanResults {
  summary?: string;
  pages?: number;
  text_extracted?: boolean;
  ai_analysis?: {
    category?: string;
    confidence?: number;
    entities?: string[];
    keywords?: string[];
    sentiment?: string;
    [key: string]: any;
  };
  processing_time?: number;
  metadata?: Record<string, any>;
}

export interface SSEEvent {
  event: EventType;
  data: {
    stage?: ChatStage;
    message?: string;
    delta?: string;
    data?: any;
    count?: number;
    full_text?: string;
    response_id?: string;
  };
}

export interface ChatMessage {
  id: string;
  type: EventType;
  content: string;
  timestamp: Date;
  stage?: ChatStage;
  data?: any;
  isAccumulating?: boolean;
}

export interface UploadedFiles {
  answerKey: File;
  studentExams: File[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

