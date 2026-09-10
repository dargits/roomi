import api from './api';
import { MessageResponse, ExtraServiceResponse, ExtraServiceRequest } from '../types';

export type ExtraServiceItem = ExtraServiceResponse;

export const extraServiceApi = {
  getPublicServices: async (): Promise<ExtraServiceResponse[]> => {
    const response = await api.get<ExtraServiceResponse[]>('/extra-services/public');
    return response.data;
  },

  getAllServices: async (): Promise<ExtraServiceResponse[]> => {
    const response = await api.get<ExtraServiceResponse[]>('/extra-services');
    return response.data;
  },

  getServiceById: async (id: number | string): Promise<ExtraServiceResponse> => {
    const response = await api.get<ExtraServiceResponse>(`/extra-services/${id}`);
    return response.data;
  },

  createService: async (serviceData: ExtraServiceRequest | Partial<ExtraServiceResponse>): Promise<ExtraServiceResponse> => {
    const response = await api.post<ExtraServiceResponse>('/extra-services', serviceData);
    return response.data;
  },

  updateService: async (id: number | string, serviceData: ExtraServiceRequest | Partial<ExtraServiceResponse>): Promise<ExtraServiceResponse> => {
    const response = await api.put<ExtraServiceResponse>(`/extra-services/${id}`, serviceData);
    return response.data;
  },

  deleteService: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/extra-services/${id}`);
    return response.data;
  }
};

export default extraServiceApi;
