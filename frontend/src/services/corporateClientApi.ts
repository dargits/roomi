import api from './api';

export interface CorporateClient {
  id: number;
  companyName: string;
  taxCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  note?: string;
  active: boolean;
  createdById?: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CorporateClientRequest {
  companyName: string;
  taxCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  note?: string;
  active?: boolean;
}

export const corporateClientApi = {
  getAll: async (search?: string, activeOnly?: boolean): Promise<CorporateClient[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (activeOnly !== undefined) params.append('activeOnly', String(activeOnly));
    const response = await api.get<CorporateClient[]>(`/corporate-clients?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number | string): Promise<CorporateClient> => {
    const response = await api.get<CorporateClient>(`/corporate-clients/${id}`);
    return response.data;
  },

  create: async (data: CorporateClientRequest): Promise<CorporateClient> => {
    const response = await api.post<CorporateClient>('/corporate-clients', data);
    return response.data;
  },

  update: async (id: number | string, data: CorporateClientRequest): Promise<CorporateClient> => {
    const response = await api.put<CorporateClient>(`/corporate-clients/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/corporate-clients/${id}`);
  },
};
