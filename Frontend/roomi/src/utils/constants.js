/**
 * Centralized application constants
 * Eliminates magic strings scattered across components
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  RECEPTIONIST: 'RECEPTIONIST',
  HOUSEKEEPER: 'HOUSEKEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
};

export const BOOKING_STATUS = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

export const ROOM_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  NEEDS_CLEANING: 'NEEDS_CLEANING',
  MAINTENANCE: 'MAINTENANCE',
};

export const BOOKING_SOURCE = {
  BOOKING_PORTAL: 'BOOKING_PORTAL',
  WALK_IN: 'WALK_IN',
  PHONE: 'PHONE',
  EXTERNAL_CHANNEL: 'EXTERNAL_CHANNEL',
};

export const MEMBERSHIP_TIER = {
  DIAMOND: 'DIAMOND',
  PLATINUM: 'PLATINUM',
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  BRONZE: 'BRONZE',
  MEMBER: 'MEMBER',
};

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
};

export const NOTIFICATION_DURATION_MS = 4000;

/**
 * Magic tag used in amenities field to mark a room type as hidden from the public booking portal.
 * Filter by checking: !amenities?.includes(ROOM_TYPE_HIDDEN_TAG)
 */
export const ROOM_TYPE_HIDDEN_TAG = '[HIDDEN]';
