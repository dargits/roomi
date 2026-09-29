import api from './api';
import { MessageResponse } from '../types';

export interface CancellationPolicyItem {
  id: number;
  roomTypeId?: number | null;
  roomTypeName: string;
  freeCancelHours: number;
  penaltyPercent: number;
  hoursAfterConfirmation?: number;
  description?: string;
  previousPercent?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedByName?: string;
}

export interface CancellationPolicyRequest {
  roomTypeId?: number | null;
  freeCancelHours: number;
  penaltyPercent: number;
  hoursAfterConfirmation?: number;
  description?: string;
}

export const cancellationPolicyApi = {
  getAllPolicies: async (): Promise<CancellationPolicyItem[]> => {
    const res = await api.get('/cancellation-policies');
    return res.data;
  },

  createPolicy: async (data: CancellationPolicyRequest): Promise<CancellationPolicyItem> => {
    const res = await api.post('/cancellation-policies', data);
    return res.data;
  },

  updatePolicy: async (id: number | string, data: CancellationPolicyRequest): Promise<CancellationPolicyItem> => {
    const res = await api.put(`/cancellation-policies/${id}`, data);
    return res.data;
  },

  deletePolicy: async (id: number | string): Promise<MessageResponse> => {
    const res = await api.delete<MessageResponse>(`/cancellation-policies/${id}`);
    return res.data;
  },
};

export default cancellationPolicyApi;
