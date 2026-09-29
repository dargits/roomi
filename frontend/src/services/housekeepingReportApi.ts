import api from './api';

export interface CleaningSummary {
  totalCleanedRooms: number;
  checkoutCleanedRooms: number;
  periodicCleanedRooms: number;
  avgDurationMinutes: number | null;
  standardAvgDurationMinutes: number | null;
  totalRejections: number;
  totalIncidents: number;
  totalInterruptedRooms: number;
}

export interface StaffProductivity {
  housekeeperId: number;
  housekeeperName: string;
  housekeeperAccount: string;
  phone?: string;
  totalCleanedRooms: number;
  checkoutRooms: number;
  periodicRooms: number;
  avgDurationMinutes: number | null;
  standardAvgMinutes: number | null;
  rejectionCount: number;
  incidentCount: number;
  interruptedCount: number;
}

export interface RoomTypeProductivity {
  roomTypeId: number;
  roomTypeName: string;
  standardCheckoutMinutes: number;
  standardPeriodicMinutes: number;
  totalCleanedRooms: number;
  avgCheckoutMinutes: number | null;
  avgPeriodicMinutes: number | null;
}

export interface CleaningRecordItem {
  id: number;
  roomNumber: string;
  roomTypeName: string;
  housekeeperId?: number;
  housekeeperName: string;
  cleaningType: string;
  startedAt?: string;
  completedAt?: string;
  actualDurationMinutes?: number;
  standardDurationMinutes?: number;
  status: string;
  isInterrupted?: boolean;
  interruptionReason?: string;
  hasIncident?: boolean;
  incidentCount?: number;
  rejectionCount?: number;
  rejectionNote?: string;
  inspectedByName?: string;
}

export interface HousekeepingProductivityResponse {
  period: string;
  startDate: string;
  endDate: string;
  summary: CleaningSummary;
  staffStats: StaffProductivity[];
  roomTypeStats: RoomTypeProductivity[];
  recentRecords: CleaningRecordItem[];
}

export const housekeepingReportApi = {
  getProductivityReport: async (params?: {
    period?: 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | string;
    startDate?: string;
    endDate?: string;
    housekeeperId?: number | string;
  }): Promise<HousekeepingProductivityResponse> => {
    const res = await api.get<HousekeepingProductivityResponse>('/housekeeping/reports/productivity', {
      params
    });
    return res.data;
  }
};

export default housekeepingReportApi;
