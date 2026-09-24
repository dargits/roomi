import api from './api';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  message: string;
  checkIn?: string; // ISO date
  checkOut?: string;
}

export interface AiChatResponse {
  reply: string;
  error: boolean;
  errorMessage?: string;
}

export interface AiPriceAnalysisRequest {
  question?: string;
  targetDate?: string;
  days?: number;
}

const aiApi = {
  /** Chat công khai với AI khách sạn (không cần token) */
  publicChat: async (req: AiChatRequest): Promise<AiChatResponse> => {
    const response = await api.post<AiChatResponse>('/ai/chat', req);
    return response.data;
  },

  /** Phân tích tổng quan 30 ngày gợi ý giá (OWNER/ADMIN) */
  analyzeOverall: async (days = 30): Promise<AiChatResponse> => {
    const response = await api.post<AiChatResponse>('/ai/price-analysis/overall', { days });
    return response.data;
  },

  /** Phân tích chi tiết một ngày cụ thể (OWNER/ADMIN) */
  analyzeDay: async (date: string, question?: string): Promise<AiChatResponse> => {
    const response = await api.post<AiChatResponse>(`/ai/price-analysis/day/${date}`, { question });
    return response.data;
  },

  /** Đặt câu hỏi tùy ý về giá/chiến lược (OWNER/ADMIN) */
  askAboutPricing: async (req: AiPriceAnalysisRequest): Promise<AiChatResponse> => {
    const response = await api.post<AiChatResponse>('/ai/price-analysis/ask', req);
    return response.data;
  },
};

export default aiApi;
