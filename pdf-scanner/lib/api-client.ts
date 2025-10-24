import axios from "axios";
import type { Scan, ApiResponse, PaginatedResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    const message = error.response?.data?.error || error.message || "An error occurred";
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);

export const scanApi = {
  uploadExams: (answerKey: File, studentExams: File[]) => {
    const formData = new FormData();
    formData.append("answer_key", answerKey);
    
    studentExams.forEach((file) => {
      formData.append("student_exams", file);
    });
    
    return fetch(`${API_BASE_URL}/api/scans/upload/`, {
      method: "POST",
      body: formData,
    });
  },

  sendMessage: (responseId: string, message: string) => {
    const formData = new FormData();
    formData.append("response_id", responseId);
    formData.append("message", message);
    
    return fetch(`${API_BASE_URL}/api/scans/upload/`, {
      method: "POST",
      body: formData,
    });
  },

  getScans: async () => {
    const response = await apiClient.get<PaginatedResponse<Scan>>("/api/scans");
    return response.data;
  },

  getScanById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Scan>>(`/api/scans/${id}`);
    return response.data;
  },
};

