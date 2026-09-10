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
}
