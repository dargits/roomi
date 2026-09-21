/**
 * Các hằng số liên quan đến trạng thái Booking, Phòng, Hóa đơn, v.v.
 * Dùng để hiển thị label / màu sắc nhất quán trên toàn app.
 */

// ── Trạng thái Booking ────────────────────────────────────────────────────────
export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đang lưu trú',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến',
};

export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  CONFIRMED: 'text-blue-700 bg-blue-50 border-blue-200',
  CHECKED_IN: 'text-green-700 bg-green-50 border-green-200',
  CHECKED_OUT: 'text-gray-600 bg-gray-50 border-gray-200',
  CANCELLED: 'text-red-700 bg-red-50 border-red-200',
  NO_SHOW: 'text-orange-700 bg-orange-50 border-orange-200',
};

// ── Trạng thái Phòng ──────────────────────────────────────────────────────────
export const ROOM_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  CLEANING: 'CLEANING',
  BLOCKED: 'BLOCKED',
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang sử dụng',
  RESERVED: 'Đã đặt trước',
  MAINTENANCE: 'Bảo trì',
  CLEANING: 'Đang dọn',
  BLOCKED: 'Tạm khóa',
};

export const ROOM_STATUS_COLOR: Record<RoomStatus, string> = {
  AVAILABLE: 'text-green-700 bg-green-50 border-green-200',
  OCCUPIED: 'text-blue-700 bg-blue-50 border-blue-200',
  RESERVED: 'text-purple-700 bg-purple-50 border-purple-200',
  MAINTENANCE: 'text-red-700 bg-red-50 border-red-200',
  CLEANING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  BLOCKED: 'text-gray-600 bg-gray-100 border-gray-200',
};

// ── Trạng thái Thanh toán ─────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
  DEBT: 'DEBT',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
  DEBT: 'Ghi nợ',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  UNPAID: 'text-red-700 bg-red-50 border-red-200',
  PARTIALLY_PAID: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  PAID: 'text-green-700 bg-green-50 border-green-200',
  REFUNDED: 'text-blue-700 bg-blue-50 border-blue-200',
  DEBT: 'text-orange-700 bg-orange-50 border-orange-200',
};

// ── Vai trò người dùng ────────────────────────────────────────────────────────
export const USER_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  RECEPTIONIST: 'RECEPTIONIST',
  HOUSEKEEPER: 'HOUSEKEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán',
};

// ── Phương thức thanh toán ────────────────────────────────────────────────────
export const PAYMENT_METHOD = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD',
  MOMO: 'MOMO',
  VNPAY: 'VNPAY',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CREDIT_CARD: 'Thẻ tín dụng',
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
};
