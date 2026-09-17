export interface ChannelRoomMapping {
  id?: number;
  externalRoomTypeCode: string;
  roomTypeId: number;
  roomTypeName?: string;
  allocatedRooms: number;
  totalPhysicalRooms?: number;
  totalAllocatedAcrossChannels?: number;
}

export type ChannelConnectionStatus = 'HEALTHY' | 'DISCONNECTED' | 'STALE' | 'PAUSED';

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
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'NEVER_SYNCED' | 'WARNING' | string;
  lastSyncErrorMessage?: string;
  lastSuccessSyncedAt?: string;
  consecutiveFailures?: number;
  connectionStatus?: ChannelConnectionStatus;
  connectionStatusMessage?: string;
  lastBlockedPeriodsCount?: number;
  activeBlocksCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelWarningSummary {
  totalChannels: number;
  activeChannels: number;
  healthyChannels: number;
  disconnectedChannels: number;
  staleChannels: number;
  pausedChannels: number;
  syncSuccessRate24h: number;
  totalSyncs24h: number;
  failedSyncs24h: number;
  hasWarning: boolean;
  warningChannels: Channel[];
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

export interface ChannelRoomBlock {
  id: number;
  channelId: number;
  channelName: string;
  channelCode: string;
  roomTypeId: number;
  roomTypeName: string;
  roomId?: number;
  roomNumber?: string;
  externalUid: string;
  startDate: string;
  endDate: string;
  summary?: string;
  description?: string;
  status: 'BLOCKED' | 'CONVERTED' | 'CANCELLED';
  isExcess: boolean;
  warningMessage?: string;
  convertedBookingId?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ConvertBlockRequest {
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  guestIdNumber?: string;
  roomId?: number;
  expectedPrice?: number;
  depositAmount?: number;
  paymentMethod?: string;
  note?: string;
}

