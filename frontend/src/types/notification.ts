export type NotificationType =
  | 'CHECKIN_TODAY'
  | 'CHECKOUT_TODAY'
  | 'ROOM_DIRTY'
  | 'ROOM_INCIDENT_LIGHT'
  | 'ROOM_INCIDENT_HEAVY'
  | 'STAY_MILESTONE'
  | 'INVOICE_DISCOUNT_APPROVAL'
  | 'DEBT_REMINDER'
  | 'CHANNEL_DISCONNECT_WARNING'
  | 'CHANNEL_OVERBOOKING_CONFLICT';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  refType: 'BOOKING' | 'ROOM' | 'INVOICE' | 'ROOM_INCIDENT' | 'BOOKING_CALENDAR' | 'CHANNEL' | null;
  refId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPref {
  type: NotificationType;
  enabled: boolean;
  mandatory: boolean;
}

export interface NotificationPage {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const NOTIFICATION_LABELS: Record<string, string> = {
  CHECKIN_TODAY: 'Check-in hôm nay',
  CHECKOUT_TODAY: 'Check-out hôm nay',
  ROOM_DIRTY: 'Phòng cần dọn',
  ROOM_INCIDENT_LIGHT: 'Sự cố phòng (nhẹ)',
  ROOM_INCIDENT_HEAVY: 'Sự cố phòng nghiêm trọng',
  STAY_MILESTONE: 'Nhắc lưu trú',
  INVOICE_DISCOUNT_APPROVAL: 'Hóa đơn chờ duyệt giảm giá',
  DEBT_REMINDER: 'Nhắc hạn thu hồi công nợ',
  CHANNEL_DISCONNECT_WARNING: 'Cảnh báo mất kết nối kênh OTA',
  CHANNEL_OVERBOOKING_CONFLICT: 'Cảnh báo trùng phòng kênh OTA',
};
