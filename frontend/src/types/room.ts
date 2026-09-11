export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'DIRTY'
  | 'INSPECTING'
  | 'MAINTENANCE';

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Sẵn sàng đón khách',
  OCCUPIED: 'Đang có khách',
  DIRTY: 'Cần dọn dẹp',
  INSPECTING: 'Chờ kiểm tra',
  MAINTENANCE: 'Đang bảo trì'
};

export type PriorityLevel = 'URGENT' | 'HIGH' | 'NORMAL';

export interface RoomResponse {
  id: number;
  roomNumber: string;
  roomTypeId: number;
  roomTypeName: string;
  maxCapacity?: number;
  floor?: string;
  status: RoomStatus;
  notes?: string;
  assignedHousekeeperId?: number;
  assignedHousekeeperName?: string;
  assignedAt?: string;
  nextCheckInDate?: string;
  nextCheckInTime?: string;
  nextGuestName?: string;
  priorityLevel?: PriorityLevel;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomRequest {
  roomNumber: string;
  roomTypeId: number;
  floor?: string;
  status?: RoomStatus;
  notes?: string;
}

export interface RoomTypeResponse {
  id: number;
  name: string;
  standardCapacity: number;
  maxCapacity: number;
  extraPersonChargePerNight?: number;
  maxChildAgeFree?: number;
  basePrice: number;
  currentPrice?: number;
  priceSource?: string;
  priceSourceName?: string;
  amenitiesDescription?: string;
  imageUrls?: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomTypeRequest {
  name: string;
  standardCapacity: number;
  maxCapacity: number;
  extraPersonChargePerNight?: number;
  maxChildAgeFree?: number;
  basePrice: number;
  amenitiesDescription?: string;
  imageUrls?: string[];
  active?: boolean;
}
