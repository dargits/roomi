export type ConfirmationChannel = 'EMAIL' | 'MESSAGING_APP' | 'PRINT_EXPORT';

export interface NightlyPriceDetail {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Thứ 2, Thứ 3, ...
  appliedPrice: number;
  priceSource: string; // BASE, WEEKEND, HOLIDAY, SEASONAL
  sourceName: string; // "Giá cơ bản", "Giá cuối tuần", "Lễ 2/9", ...
}

export interface BookingConfirmationLog {
  id: number;
  bookingId: number;
  channel: ConfirmationChannel;
  channelDisplayName: string;
  recipient?: string;
  sentById?: number;
  sentByName?: string;
  status: 'SUCCESS' | 'FAILED';
  note?: string;
  sentAt: string;
}

export interface BookingConfirmationData {
  bookingId: number;
  bookingCode: string;
  status: string;

  // Khách hàng & cảnh báo
  guestId?: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  hasGuestPhone: boolean;
  hasGuestEmail: boolean;
  hasContactInfo: boolean;
  contactWarning?: string;

  // Thời gian
  checkInDate: string;
  checkOutDate: string;
  standardCheckInTime?: string; // HH:mm:ss
  standardCheckOutTime?: string; // HH:mm:ss
  totalNights: number;

  // Phòng
  roomTypeId?: number;
  roomTypeName?: string;
  roomId?: number;
  roomNumber?: string;
  standardCapacity?: number;
  maxCapacity?: number;
  guestCount?: number;

  // Giá từng đêm & tổng
  nightlyDetails: NightlyPriceDetail[];
  totalRoomPrice: number;
  extraPersonCharge: number;
  grandTotalPrice: number;

  // Tiền cọc
  depositPercent: number;
  requiredDepositAmount: number;
  collectedDepositAmount: number;
  depositStatus?: string;

  // Chính sách hủy
  freeCancelHours: number;
  penaltyPercent: number;
  cancellationPolicySummary: string;

  // Cơ sở
  propertyName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;

  // Cấu hình email & tin nhắn
  emailConfigured: boolean;
  formattedMessage: string;

  // Kiểm soát chống spam gửi email
  lastEmailSentAt?: string;
  lastEmailRecipient?: string;
  lastEmailSenderName?: string;
  lastEmailStatus?: string;
  emailSendCountToday: number;
  maxEmailSendQuota: number;
  emailCooldownSecondsRemaining: number;

  // Lịch sử gửi
  confirmationLogs: BookingConfirmationLog[];
}

export interface SendConfirmationRequest {
  channel: ConfirmationChannel;
  customEmail?: string;
  customPhone?: string;
  note?: string;
}
