import api from './api';
import { InventoryItemResponse, InventoryItemRequest, MessageResponse } from '../types';

const inventoryApi = {
  getAll: async (): Promise<InventoryItemResponse[]> => {
    const response = await api.get<InventoryItemResponse[]>('/inventory-items');
    return response.data;
  },

  getLowStock: async (): Promise<InventoryItemResponse[]> => {
    const response = await api.get<InventoryItemResponse[]>('/inventory-items/low-stock');
    return response.data;
  },

  create: async (data: InventoryItemRequest): Promise<InventoryItemResponse> => {
    const response = await api.post<InventoryItemResponse>('/inventory-items', data);
    return response.data;
  },

  update: async (id: number | string, data: InventoryItemRequest): Promise<InventoryItemResponse> => {
    const response = await api.put<InventoryItemResponse>(`/inventory-items/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/inventory-items/${id}`);
    return response.data;
  },
};

export default inventoryApi;
