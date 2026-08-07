/**
 * Centralized formatting utility functions.
 * Consolidates all duplicate helpers previously copy-pasted across pages.
 */

// ─── Date Formatting ───────────────────────────────────────────────────────

/**
 * Format a Date object to YYYY-MM-DD string (local timezone)
 * @param {Date} date
 * @returns {string}
 */
export const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY for display
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDateVN = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Format ISO datetime string to DD/MM/YYYY HH:mm
 * @param {string} dateString
 * @returns {string}
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

/**
 * Format ISO datetime string to DD/MM/YYYY HH:mm:ss (includes seconds)
 * @param {string} dateString
 * @returns {string}
 */
export const formatDateTimeFull = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateString;
  }
};

/**
 * Format date using vi-VN locale with full options
 * @param {string} dateString
 * @returns {string}
 */
export const formatDateLong = (dateString) => {
  if (!dateString) return 'Chưa có thông tin';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Currency Formatting ───────────────────────────────────────────────────

/**
 * Format number as Vietnamese currency
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

// ─── Label Mappers ─────────────────────────────────────────────────────────

/**
 * Get Vietnamese label for membership tier
 * @param {string} tier
 * @returns {string}
 */
export const getTierLabel = (tier) => {
  switch (tier) {
    case 'DIAMOND': return 'Kim cương';
    case 'PLATINUM': return 'Bạch kim';
    case 'GOLD': return 'Vàng';
    case 'SILVER': return 'Bạc';
    case 'BRONZE': return 'Đồng';
    default: return 'Thành viên';
  }
};

/**
 * Get Vietnamese label for booking status
 * @param {string} status
 * @returns {string}
 */
export const getBookingStatusLabel = (status) => {
  switch (status) {
    case 'NEW': return 'Chờ lễ tân duyệt';
    case 'CONFIRMED': return 'Đã gán phòng';
    case 'CHECKED_IN': return 'Đang lưu trú';
    case 'CHECKED_OUT': return 'Đã trả phòng';
    case 'CANCELLED': return 'Đã hủy';
    case 'NO_SHOW': return 'Khách không đến';
    default: return status || '—';
  }
};

/**
 * Get Vietnamese label for room status
 * @param {string} status
 * @returns {string}
 */
export const getRoomStatusLabel = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'Sẵn sàng';
    case 'OCCUPIED': return 'Có khách';
    case 'NEEDS_CLEANING': return 'Cần dọn dẹp';
    case 'MAINTENANCE': return 'Bảo trì';
    default: return status || '—';
  }
};

/**
 * Get Vietnamese label for booking source
 * @param {string} source
 * @returns {string}
 */
export const getSourceLabel = (source) => {
  switch (source) {
    case 'BOOKING_PORTAL': return 'Đặt từ Web';
    case 'WALK_IN': return 'Khách vãng lai';
    case 'PHONE': return 'Điện thoại';
    case 'EXTERNAL_CHANNEL': return 'Kênh ngoài';
    default: return source || 'Trực tiếp';
  }
};

// ─── Activity Log Entity Labels ─────────────────────────────────────────────

const ENTITY_LABELS = {
  USER: 'Người dùng',
  BOOKING: 'Đặt phòng',
  ROOM: 'Phòng',
  INVOICE: 'Hóa đơn',
  PAYMENT: 'Thanh toán',
  SURCHARGE: 'Dịch vụ phụ thu',
  ROOM_TYPE: 'Loại phòng',
  SEASONAL_RATE: 'Giá theo mùa',
  GUEST: 'Khách hàng',
  SETTINGS: 'Cài đặt cơ sở',
};

/**
 * Get Vietnamese label for an activity log entity type
 * @param {string} entity
 * @returns {string}
 */
export const formatEntityLabel = (entity) => {
  if (!entity) return '—';
  return ENTITY_LABELS[entity.toUpperCase()] || entity;
};

