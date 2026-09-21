/**
 * Tập trung toàn bộ Route Path constants của ứng dụng.
 * Dùng ROUTES thay vì hard-code string path rải rác trong code.
 *
 * @example
 *   navigate(ROUTES.MANAGE.BOOKINGS.ROOT)
 *   <Link to={ROUTES.PUBLIC.LOGIN} />
 */
export const ROUTES = {
  // ── Public ──────────────────────────────────────────────────────────────────
  PUBLIC: {
    HOME: '/',
    ROOMS: '/rooms',
    AMENITIES: '/amenities',
    PROMOTIONS: '/promotions',
    ABOUT: '/about',
    CONTACT: '/contact',
    LOGIN: '/login',
    RESET_PASSWORD: '/reset-password',
    RESET_PASSWORD_TOKEN: (token: string) => `/reset-password/${token}`,
    BOOKING_DETAIL: (bookingId: string | number, tab?: string) =>
      tab ? `/booking-detail/${bookingId}/${tab}` : `/booking-detail/${bookingId}`,
    SHARE_BOOKING: (bookingId: string | number, tab?: string) =>
      tab ? `/share/booking/${bookingId}/${tab}` : `/share/booking/${bookingId}`,
    PUBLIC_BOOKING: (bookingId: string | number, tab?: string) =>
      tab ? `/p/booking/${bookingId}/${tab}` : `/p/booking/${bookingId}`,
  },

  // ── Manage (Protected) ───────────────────────────────────────────────────────
  MANAGE: {
    ROOT: '/manage',
    DASHBOARD: '/manage/dashboard',

    BOOKINGS: {
      ROOT: '/manage/bookings',
      LIST: '/manage/bookings/list',
      CALENDAR: '/manage/bookings/calendar',
      REQUESTS: '/manage/bookings/requests',
      GROUPS: '/manage/bookings/groups',
      DETAIL: (bookingId: string | number, tab?: string) =>
        tab ? `/manage/bookings/${bookingId}/${tab}` : `/manage/bookings/${bookingId}`,
    },

    IN_HOUSE_GUESTS: '/manage/in-house-guests',
    STAY_DECLARATIONS: '/manage/stay-declarations',
    ROOMS: '/manage/rooms',
    ROOM_TYPES: '/manage/room-types',
    GUESTS: '/manage/guests',
    EXTRA_SERVICES: '/manage/extra-services',
    HOUSEKEEPING: '/manage/housekeeping',
    LOST_AND_FOUND: '/manage/lost-and-found',
    REPORTS: '/manage/reports',
    CASHIER_SHIFTS: '/manage/cashier-shifts',
    DAILY_LEDGER: '/manage/daily-ledger',
    AUDIT_LOGS: '/manage/audit-logs',
    PERSONAL_DATA_AUDIT: '/manage/personal-data-audit',
    STAFF: '/manage/staff',
    SETTINGS: '/manage/settings',
    BACKUP: '/manage/backup',
    INVENTORY: '/manage/inventory',
    LOYALTY: '/manage/loyalty',
    DEPOSIT_POLICIES: '/manage/deposit-policies',
    CONCURRENCY: '/manage/concurrency',
    CHANNELS: '/manage/channels',
    PROFILE: '/manage/profile',

    NOTIFICATIONS: {
      ROOT: '/manage/notifications',
      PREFERENCES: '/manage/notifications/preferences',
    },
  },
} as const;
