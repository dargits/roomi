export type BookingStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'CHANNEL_BLOCKED';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận phòng',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Khách không đến',
  CHANNEL_BLOCKED: 'Kênh giữ chỗ'
};

export interface BookingResponse {
  id: number;
  guestId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  guestIdNumber?: string;
  roomTypeId?: number;
  roomTypeName?: string;
  roomId?: number;
  roomNumber?: string;
  roomCapacity?: number;
  standardCapacity?: number;
  maxCapacity?: number;
  extraPersonChargePerNight?: number;
  maxChildAgeFree?: number;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  expectedPrice?: number;
  actualPrice?: number;
  cancellationFee?: number;
  note?: string;
  source?: string;
  createdAt?: string;
  groupBookingId?: number;
  paymentStatus?: string;
  roomStatus?: string;
  payLaterCheckout?: boolean;
  reminderSentAt?: string;
  channelId?: number;
  channelName?: string;
  channelCode?: string;
  isChannelBlock?: boolean;
  blockId?: number;
  isExcess?: boolean;
  priceSource?: 'STANDARD' | 'NEGOTIATED' | string;
  appliedAgreementId?: number;
  appliedAgreementName?: string;
  stayingGuests?: Array<{
    id?: number;
    name?: string;
    phone?: string;
    idNumber?: string;
    email?: string;
  }>;
}

export interface BookingRequest {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestIdNumber?: string;
  roomTypeId: number;
  checkInDate: string;
  checkOutDate: string;
  note?: string;
  source?: string;
  roomId?: number;
  corporateClientId?: number;
}

export interface GuestCheckInDto {
  name: string;
  idNumber: string;
  phone?: string;
  nationality?: string;
  birthDate?: string;
  gender?: string;
}

export interface CheckInRequest {
  guests: GuestCheckInDto[];
}

export interface BulkCheckInRoomRequest {
  bookingId: number;
  roomId?: number;
  guests?: GuestCheckInDto[];
}

export interface BulkCheckInRequest {
  rooms: BulkCheckInRoomRequest[];
}

export interface BulkCheckInResultResponse {
  totalRequested: number;
  successfulRooms: BookingResponse[];
  failedRooms: Array<{
    bookingId: number;
    roomNumber?: string;
    reason: string;
  }>;
  missingDocumentRoomCount?: number;
  successCount?: number;
  failureCount?: number;
  failures?: Array<{
    bookingId: number;
    roomNumber?: string;
    reason: string;
  }>;
}

export interface BulkCheckOutRequest {
  bookingIds: number[];
}

export interface BulkCheckOutRoomDetailDto {
  bookingId: number;
  roomNumber: string;
  guestName: string;
  invoiceId?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

export interface BulkCheckOutSummaryResponse {
  totalRooms: number;
  canCheckOutCount: number;
  hasUnpaidCount: number;
  rooms: BulkCheckOutRoomDetailDto[];
}

export interface RescheduleDateRequest {
  newCheckInDate: string;
  newCheckOutDate: string;
  keepCurrentPrice?: boolean;
}

export interface RescheduleDatePreviewResponse {
  bookingId: number;
  oldCheckInDate: string;
  oldCheckOutDate: string;
  newCheckInDate: string;
  newCheckOutDate: string;
  oldPrice: number;
  newPrice: number;
  priceDifference: number;
  available: boolean;
  message?: string;
}

export interface UpgradeRoomRequest {
  newRoomTypeId: number;
  newRoomId?: number;
  additionalCharge?: number;
}

export interface GroupBookingResponse {
  id: number;
  groupName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  totalRooms: number;
  totalExpectedAmount: number;
  status: string;
  createdAt?: string;
}

export interface PublicGroupBookingRoomRequest {
  roomTypeId: number;
  roomTypeName: string;
  quantity: number;
}

export interface PublicGroupBookingRequestResponse {
  id: number;
  representativeName: string;
  phone: string;
  email?: string;
  checkInDate: string;
  checkOutDate: string;
  note?: string;
  status: string;
  rejectReason?: string;
  convertedGroupBookingId?: number;
  isDepositPaid?: boolean;
  depositPaid?: boolean;
  rooms: PublicGroupBookingRoomRequest[];
  createdAt: string;
}

export interface InHouseGuestResponse {
  bookingId: number;
  roomId?: number;
  roomNumber: string;
  floor?: string;
  roomTypeId?: number;
  roomTypeName: string;
  primaryGuestId?: number;
  primaryGuestName: string;
  guestPhone?: string;
  occupantCount: number;
  standardCapacity?: number;
  maxCapacity?: number;
  checkInDate: string;
  checkedInAt?: string;
  expectedCheckOutDate: string;
  checkingOutToday: boolean;
  roomAmount: number;
  serviceAmount: number;
  incurredAmount: number;
  paidAmount: number;
  remainingAmount: number;
  hasDebt: boolean;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | string;
  specialRequests?: string;
}

export interface InHouseFilterParams {
  floor?: string;
  roomTypeId?: number | string;
  checkingOutToday?: boolean;
  hasDebt?: boolean;
  search?: string;
}

export interface InHouseFilterOptions {
  floors: string[];
  roomTypes: {
    id: number;
    name: string;
  }[];
}

export interface InHouseSummary {
  totalRooms: number;
  totalOccupants: number;
  checkoutTodayCount: number;
  debtCount: number;
  totalDebtAmount: number;
}


