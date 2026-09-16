export interface ChannelRoomMapping {
  id?: number;
  externalRoomTypeCode: string;
  roomTypeId: number;
  roomTypeName?: string;
  allocatedRooms: number;
  totalPhysicalRooms?: number;
  totalAllocatedAcrossChannels?: number;
}

export interface Channel {
  id: number;
  name: string;
  channelCode: string;
  roomTypeId?: number;
  roomTypeName?: string;
  allocatedRooms?: number;
  feedToken: string;
  feedUrl: string;
  externalCalendarUrl?: string;
  mappings?: ChannelRoomMapping[];
  syncIntervalMinutes: number;
  isActive: boolean;
  lastSyncedAt?: string;
  lastBlockedPeriodsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelRequest {
  name: string;
  channelCode: string;
  externalCalendarUrl?: string;
  roomTypeId?: number;
  allocatedRooms?: number;
  mappings?: ChannelRoomMapping[];
  syncIntervalMinutes?: number;
  isActive?: boolean;
}

export interface ChannelCalendarSyncLog {
  id: number;
  channelId: number;
  channelName: string;
  roomTypeName: string;
  triggeredBy: string;
  blockedPeriodsCount: number;
  blockedSummary?: string;
  status: string;
  errorMessage?: string;
  syncedAt: string;
}

export interface DailyAvailabilityDetail {
  date: string;
  dayOfWeek: string;
  allocatedRooms: number;
  bookingOccupied: number;
  maintenanceOccupied: number;
  totalOccupied: number;
  availableRooms: number;
  isSoldOut: boolean;
}

export interface ChannelAvailabilityCheckResponse {
  channelId: number;
  channelName: string;
  channelCode: string;
  roomTypeId: number;
  roomTypeName: string;
  externalRoomTypeCode: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  allocatedRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'SOLD_OUT' | 'CHANNEL_INACTIVE' | 'ROOM_NOT_MAPPED';
  message: string;
  dailyDetails: DailyAvailabilityDetail[];
}
