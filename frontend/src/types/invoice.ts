export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PENDING_DISCOUNT_APPROVAL'
  | 'PAID'
  | 'ADJUSTED'
  | 'PENDING';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_DISCOUNT_APPROVAL: 'Chờ duyệt giảm giá',
  PAID: 'Đã thanh toán',
  ADJUSTED: 'Đã điều chỉnh',
  PENDING: 'Chờ thanh toán'
};

export type InvoiceMode = 'INDIVIDUAL' | 'GROUP';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'MOMO'
  | 'VNPAY'
  | 'DEBT';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CREDIT_CARD: 'Thẻ tín dụng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPay',
  DEBT: 'Ghi nợ'
};

export interface InvoiceResponse {
  id: number;
  bookingId?: number;
  groupBookingId?: number;
  mode?: InvoiceMode;
  roomAmount: number;
  serviceAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  adjustmentOfId?: number;
  note?: string;
  createdAt?: string;
}

export interface PaymentResponse {
  id: number;
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  paidAt: string;
  receivedById?: number;
  receivedByName?: string;
}

export interface PaymentRequest {
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  note?: string;
}

export type DepositStatus =
  | 'PENDING'
  | 'COLLECTED'
  | 'SHORT_PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FORFEITED';

export interface DepositResponse {
  id: number;
  bookingId?: number;
  groupBookingId?: number;
  requiredAmount?: number;
  collectedAmount?: number;
  refundedAmount?: number;
  penaltyAmount?: number;
  amount?: number;
  status: DepositStatus;
  paymentMethod?: PaymentMethod | string;
  method?: PaymentMethod;
  shortPaidReason?: string;
  note?: string;
  collectedByName?: string;
  processedByName?: string;
  collectedAt?: string;
  processedAt?: string;
  receivedAt?: string;
  refundedAt?: string;
  createdAt?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountStatus = 'PENDING_APPROVAL' | 'APPLIED' | 'REJECTED';

export interface DiscountResponse {
  id: number;
  invoiceId: number;
  discountType: DiscountType;
  discountValue: number;
  calculatedAmount: number;
  reason: string;
  status: DiscountStatus;
  statusMessage?: string;
  createdAt: string;
  createdByName?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  rejectReason?: string;
}

export interface ApplyDiscountRequest {
  discountType: DiscountType;
  discountValue: number;
  reason: string;
}

export type InvoiceDiscountResponse = DiscountResponse;
export type InvoiceDiscountApplyRequest = ApplyDiscountRequest;

export interface GroupInvoiceResponse {
  groupBookingId: number;
  mode: InvoiceMode;
  suggestedMode?: InvoiceMode;
  roomAmount: number;
  serviceAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  invoices: InvoiceResponse[];
}
