export interface SeasonalPriceResponse {
  id: number;
  roomTypeId: number;
  roomTypeName?: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  createdAt?: string;
}

export interface SeasonalPriceRequest {
  startDate: string;
  endDate: string;
  pricePerNight: number;
}

export interface HolidayPriceResponse {
  id: number;
  roomTypeId: number;
  roomTypeName?: string;
  holidayName: string;
  holidayDate: string;
  pricePerNight: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HolidayPriceRequest {
  roomTypeId: number;
  holidayName: string;
  holidayDate: string;
  pricePerNight: number;
  active?: boolean;
}

export interface WeekendPriceConfigResponse {
  id: number;
  roomTypeId: number;
  roomTypeName?: string;
  weekendDays: string;
  pricePerNight: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeekendPriceConfigRequest {
  roomTypeId: number;
  weekendDays: string;
  pricePerNight: number;
  active?: boolean;
}

export interface ExtraServiceResponse {
  id: number;
  name: string;
  description?: string;
  unitPrice: number;
  price?: number;
  unit: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtraServiceRequest {
  name: string;
  description?: string;
  unitPrice?: number;
  price?: number;
  unit: string;
  active?: boolean;
}

export interface DepositPolicyResponse {
  id: number;
  roomTypeId?: number | null;
  roomTypeName?: string;
  depositPercent: number;
  freeCancellationHours?: number;
  lateCancellationFeePercent?: number;
  noShowPenaltyPercent?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type DebtApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DebtApprovalResponseDto {
  id: number;
  bookingId: number;
  invoiceId?: number;
  invoiceNumber?: string;
  guestId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  roomNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  debtAmount: number;
  dueDate: string;
  daysOverdue?: number;
  status: DebtApprovalStatus;
  reason?: string;
  requestedByName?: string;
  requestedAt?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  documentSentAt?: string;
  documentSentTo?: string;
  reminderSentForDueDate?: string;
  reminderSentAt?: string;
}
