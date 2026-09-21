/**
 * Cấu hình chung của ứng dụng — tập trung thay vì rải rác trong từng component.
 *
 * Các giá trị nhạy cảm (API keys, secrets) phải được đặt trong .env,
 * không hard-code ở đây.
 */

// ── Storage Keys ──────────────────────────────────────────────────────────────
/**
 * Các key dùng để lưu dữ liệu vào localStorage / sessionStorage.
 * Tập trung vào đây để tránh typo khi sử dụng ở nhiều nơi.
 */
export const STORAGE_KEYS = {
  /** JWT token xác thực */
  TOKEN: 'staygo_token',
  /** Thông tin user đã đăng nhập */
  USER: 'staygo_user',
} as const;

// ── Pagination Defaults ───────────────────────────────────────────────────────
export const PAGINATION = {
  /** Số bản ghi mặc định mỗi trang */
  DEFAULT_PAGE_SIZE: 10,
  /** Các lựa chọn page size */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// ── Date & Time ───────────────────────────────────────────────────────────────
export const DATE_FORMAT = {
  /** Định dạng ngày hiển thị cho người dùng */
  DISPLAY: 'dd/MM/yyyy',
  /** Định dạng ngày + giờ hiển thị cho người dùng */
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  /** Định dạng gửi lên API (ISO-like) */
  API: 'yyyy-MM-dd',
} as const;

// ── Toast Defaults ────────────────────────────────────────────────────────────
export const TOAST_DURATION = {
  /** Thời gian hiển thị toast mặc định (ms) */
  DEFAULT: 4000,
  /** Thông báo lỗi — hiển thị lâu hơn để người dùng đọc kịp */
  ERROR: 6000,
  /** Thông báo thành công ngắn */
  SUCCESS: 3000,
} as const;

// ── API ───────────────────────────────────────────────────────────────────────
export const API_CONFIG = {
  /** Timeout mặc định cho các request (ms) */
  TIMEOUT: 30_000,
  /** Số lần retry khi request thất bại (nếu có implement) */
  MAX_RETRIES: 3,
} as const;

// ── App Info ──────────────────────────────────────────────────────────────────
export const APP_INFO = {
  NAME: 'Roomi',
  VERSION: '1.0.0',
  /** Email hỗ trợ */
  SUPPORT_EMAIL: 'support@roomi.vn',
} as const;
