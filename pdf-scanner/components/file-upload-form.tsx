"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadFormProps {
  onUpload: (answerKey: File, studentExams: File[]) => void;
  isUploading?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function FileUploadForm({ onUpload, isUploading = false }: FileUploadFormProps) {
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [studentExams, setStudentExams] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingAnswer, setIsDraggingAnswer] = useState(false);
  const [isDraggingStudents, setIsDraggingStudents] = useState(false);
  
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const studentExamsInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    return null;
  };

  const handleAnswerKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setAnswerKey(null);
      } else {
        setAnswerKey(file);
        setError(null);
      }
    }
  };

  const handleStudentExamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const invalidFile = files.find(file => validateFile(file));
      if (invalidFile) {
        setError(validateFile(invalidFile));
      } else {
        setStudentExams(files);
        setError(null);
      }
    }
  };

  const handleAnswerKeyDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnswer(true);
  }, []);

  const handleAnswerKeyDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnswer(false);
  }, []);

  const handleAnswerKeyDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnswer(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setAnswerKey(null);
      } else {
        setAnswerKey(file);
        setError(null);
      }
    }
  }, []);

  const handleStudentsDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStudents(true);
  }, []);

  const handleStudentsDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStudents(false);
  }, []);

  const handleStudentsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStudents(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const invalidFile = files.find(file => validateFile(file));
      if (invalidFile) {
        setError(validateFile(invalidFile));
      } else {
        setStudentExams(files);
        setError(null);
      }
    }
  }, []);

  const removeStudentExam = (index: number) => {
    setStudentExams(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!answerKey || studentExams.length === 0) {
      setError("Please upload both answer key and student exams");
      return;
    }
    onUpload(answerKey, studentExams);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Exam Evaluation</h1>
        <p className="text-muted-foreground">
          Upload answer key and student exams to start evaluation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="answer-key" className="text-base font-semibold">
            Answer Key (Single PDF)
          </Label>
          
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
              isDraggingAnswer
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              answerKey && "border-primary bg-primary/5"
            )}
            onDragOver={handleAnswerKeyDragOver}
            onDragLeave={handleAnswerKeyDragLeave}
            onDrop={handleAnswerKeyDrop}
            onClick={() => answerKeyInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              
              {answerKey ? (
                <div className="text-center">
                  <p className="font-medium text-sm">{answerKey.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(answerKey.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Drop answer key here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          <Input
            ref={answerKeyInputRef}
            type="file"
            accept=".pdf"
            onChange={handleAnswerKeyChange}
            className="hidden"
            id="answer-key"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="student-exams" className="text-base font-semibold">
            Student Exams (Multiple PDFs)
          </Label>
          
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer min-h-[180px]",
              isDraggingStudents
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              studentExams.length > 0 && "border-primary bg-primary/5"
            )}
            onDragOver={handleStudentsDragOver}
            onDragLeave={handleStudentsDragLeave}
            onDrop={handleStudentsDrop}
            onClick={() => studentExamsInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              
              {studentExams.length > 0 ? (
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-center">
                    {studentExams.length} file{studentExams.length > 1 ? "s" : ""} selected
                  </p>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {studentExams.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-background/50 p-1.5 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStudentExam(index);
                          }}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Drop student exams here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          <Input
            ref={studentExamsInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleStudentExamsChange}
            className="hidden"
            id="student-exams"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!answerKey || studentExams.length === 0 || isUploading}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Starting..." : "Start Evaluation"}
        </Button>
      </div>
    </div>
  );
}

