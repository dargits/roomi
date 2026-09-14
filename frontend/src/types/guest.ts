export interface GuestResponse {
  id: number;
  name: string;
  phone: string;
  email?: string;
  idNumber?: string;
  nationality?: string;
  totalBookings?: number;
  totalSpent?: number;
  loyaltyTierId?: number;
  loyaltyTierName?: string;
  loyaltyPoints?: number;
  createdAt?: string;
}

export interface GuestRequest {
  name: string;
  phone: string;
  email?: string;
  idNumber?: string;
  nationality?: string;
}

export interface RoomStayGuestResponseDto {
  id: number;
  bookingId: number;
  fullName: string;
  birthYear?: number;
  documentType?: string;
  documentNumber?: string;
  isChild?: boolean;
  isPrimaryGuest?: boolean;
  checkInAt?: string;
  leftEarlyAt?: string;
  isExported?: boolean;
  isCurrentlyStaying?: boolean;
}

export interface RoomStayGuestCreateDto {
  fullName: string;
  birthYear?: number | null;
  documentType?: string;
  documentNumber?: string;
  isChild?: boolean;
}

export interface StayingGuestsSummaryDto {
  guests: RoomStayGuestResponseDto[];
  standardCapacity: number;
  maxCapacity: number;
  extraPersonChargePerNight: number;
  maxChildAgeFree: number;
  totalNights: number;
  totalGuests: number;
  extraGuests: number;
  childCount: number;
  chargeableExtraGuests: number;
  extraChargePerNight: number;
  totalExtraCharge: number;
  baseRoomPrice: number;
  currentActualPrice: number;
}

export type StayDeclarationStatus = 'PENDING' | 'SUBMITTED' | 'REJECTED';

export interface StayDeclarationResponseDTO {
  id: number;
  bookingId: number;
  guestName: string;
  idNumber: string;
  declarationDate: string;
  status: StayDeclarationStatus;
  notes?: string;
}
