import api from './api';

export interface NegotiatedPriceAgreement {
  id: number;
  name: string;
  corporateClientId?: number;
  corporateClientName?: string;
  groupBookingId?: number;
  groupBookingRepName?: string;
  pricePerNight: number;
  startDate: string;
  endDate: string;
  active: boolean;
  note?: string;
  createdById?: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NegotiatedPriceAgreementRequest {
  name: string;
  corporateClientId?: number | null;
  groupBookingId?: number | null;
  pricePerNight: number;
  startDate: string;
  endDate: string;
  active?: boolean;
  note?: string;
}

export interface NegotiatedPricePreviewResponse {
  applied: boolean;
  agreementId?: number;
  agreementName?: string;
  agreementType: 'GROUP' | 'CORPORATE' | 'NONE';
  clientOrGroupName?: string;
  pricePerNight?: number;
  totalNights: number;
  totalPrice: number;
  standardPrice: number;
}

export interface NegotiatedRevenueReport {
  from: string;
  to: string;
  totalRevenue: number;
  negotiatedRevenue: number;
  negotiatedBookingCount: number;
  negotiatedRoomNights: number;
  sharePercent: number;
  agreements: {
    agreementName: string;
    bookingCount: number;
    roomNights: number;
    revenue: number;
  }[];
}

export const negotiatedPriceApi = {
  getAll: async (corporateClientId?: number, groupBookingId?: number): Promise<NegotiatedPriceAgreement[]> => {
    const params = new URLSearchParams();
    if (corporateClientId) params.append('corporateClientId', String(corporateClientId));
    if (groupBookingId) params.append('groupBookingId', String(groupBookingId));
    const response = await api.get<NegotiatedPriceAgreement[]>(`/negotiated-prices?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number | string): Promise<NegotiatedPriceAgreement> => {
    const response = await api.get<NegotiatedPriceAgreement>(`/negotiated-prices/${id}`);
    return response.data;
  },

  create: async (data: NegotiatedPriceAgreementRequest): Promise<NegotiatedPriceAgreement> => {
    const response = await api.post<NegotiatedPriceAgreement>('/negotiated-prices', data);
    return response.data;
  },

  update: async (id: number | string, data: NegotiatedPriceAgreementRequest): Promise<NegotiatedPriceAgreement> => {
    const response = await api.put<NegotiatedPriceAgreement>(`/negotiated-prices/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/negotiated-prices/${id}`);
  },

  preview: async (params: {
    corporateClientId?: number | null;
    groupBookingId?: number | null;
    roomTypeId: number;
    checkInDate: string;
    checkOutDate: string;
    guestCount?: number;
    childCount?: number;
  }): Promise<NegotiatedPricePreviewResponse> => {
    const query = new URLSearchParams();
    if (params.corporateClientId) query.append('corporateClientId', String(params.corporateClientId));
    if (params.groupBookingId) query.append('groupBookingId', String(params.groupBookingId));
    query.append('roomTypeId', String(params.roomTypeId));
    query.append('checkInDate', params.checkInDate);
    query.append('checkOutDate', params.checkOutDate);
    if (params.guestCount) query.append('guestCount', String(params.guestCount));
    if (params.childCount) query.append('childCount', String(params.childCount));

    const response = await api.get<NegotiatedPricePreviewResponse>(`/negotiated-prices/preview?${query.toString()}`);
    return response.data;
  },

  getNegotiatedRevenueReport: async (from: string, to: string): Promise<NegotiatedRevenueReport> => {
    const response = await api.get<NegotiatedRevenueReport>(`/reports/negotiated-revenue?from=${from}&to=${to}`);
    return response.data;
  }
};
