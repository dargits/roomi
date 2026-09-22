export type IncidentSeverity = 'LIGHT' | 'HEAVY' | 'OUT_OF_SERVICE';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface RoomIncidentResponse {
  id: number;
  roomId: number;
  roomNumber: string;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  reportedByName?: string;
  reportedAt?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  affectedBookingsCount?: number;
}

export interface RoomIncidentReportRequest {
  roomId: number;
  description: string;
  severity: IncidentSeverity;
}

export interface CleaningTask {
  roomId: number;
  roomNumber: string;
  roomTypeName: string;
  status: string;
  assignedHousekeeperId?: number;
  assignedHousekeeperName?: string;
  priorityLevel?: 'URGENT' | 'HIGH' | 'NORMAL';
  nextCheckInDate?: string;
  nextCheckInTime?: string;
  nextGuestName?: string;
  cleaningStartedAt?: string;
  isCleaningInProgress?: boolean;
  standardCleaningMinutes?: number;
}

export interface CleaningStandardResponse {
  roomTypeId: number;
  roomTypeName: string;
  standardCheckoutCleaningMinutes: number;
  standardPeriodicCleaningMinutes: number;
  totalRooms?: number;
}

export interface CleaningStandardUpdateItem {
  roomTypeId: number;
  standardCheckoutCleaningMinutes: number;
  standardPeriodicCleaningMinutes: number;
}

export interface CleaningStandardUpdateRequest {
  standards: CleaningStandardUpdateItem[];
}

export interface HousekeeperProductivityStat {
  housekeeperId: number;
  housekeeperName: string;
  housekeeperPhone?: string;
  totalRoomsCleaned: number;
  completedNormalRoomsCount: number;
  interruptedOrIncidentRoomsCount: number;
  averageDurationMinutes: number;
  targetStandardMinutesAverage: number;
  rejectedInspectionCount: number;
  incidentReportedCount: number;
  checkoutRoomsCleaned: number;
  periodicRoomsCleaned: number;
}

export interface CleaningRecordDetailResponse {
  id: number;
  roomId: number;
  roomNumber: string;
  roomTypeId: number;
  roomTypeName: string;
  housekeeperId?: number;
  housekeeperName?: string;
  cleaningType?: string;
  startedAt?: string;
  completedAt?: string;
  actualDurationMinutes?: number;
  standardDurationMinutes?: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  isInterrupted: boolean;
  interruptionReason?: string;
  hasIncident: boolean;
  incidentCount: number;
  rejectionCount: number;
  rejectionNote?: string;
  inspectedByName?: string;
  inspectedAt?: string;
  isExcludedFromAverage: boolean;
}

export interface HousekeepingProductivityReportResponse {
  period: 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
  startDate: string;
  endDate: string;
  totalRoomsCleaned: number;
  facilityAverageDurationMinutes: number;
  facilityStandardDurationAverage: number;
  totalInterruptedOrIncidentRooms: number;
  totalRejectedInspections: number;
  totalIncidentsReported: number;
  isSingleStaffView: boolean;
  housekeeperStats: HousekeeperProductivityStat[];
  records: CleaningRecordDetailResponse[];
  standards: CleaningStandardResponse[];
}
