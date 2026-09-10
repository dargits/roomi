export type BookingStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận phòng',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Khách không đến'
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
