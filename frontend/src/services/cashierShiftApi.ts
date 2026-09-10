import api from './api';
import {
  CashierShiftResponse,
  CashierShiftOpenRequest,
  CashierShiftCloseRequest,
  MessageResponse
} from '../types';

export const cashierShiftApi = {
  open: async (payload: CashierShiftOpenRequest): Promise<CashierShiftResponse> =>
    (await api.post<CashierShiftResponse>('/shifts', payload)).data,

  getCurrent: async (): Promise<CashierShiftResponse> =>
    (await api.get<CashierShiftResponse>('/shifts/current')).data,

  getHistory: async (): Promise<CashierShiftResponse[]> =>
    (await api.get<CashierShiftResponse[]>('/shifts/history')).data,

  preview: async (shiftId: number | string): Promise<any> =>
    (await api.get(`/shifts/${shiftId}/preview`)).data,

  close: async (shiftId: number | string, payload: CashierShiftCloseRequest): Promise<CashierShiftResponse> =>
    (await api.post<CashierShiftResponse>(`/shifts/${shiftId}/close`, payload)).data,

  reopen: async (shiftId: number | string, payload?: any): Promise<CashierShiftResponse> =>
    (await api.post<CashierShiftResponse>(`/shifts/${shiftId}/reopen`, payload)).data,

  list: async (params?: any): Promise<CashierShiftResponse[]> =>
    (await api.get<CashierShiftResponse[]>('/shifts', { params })).data,
};

export default cashierShiftApi;
