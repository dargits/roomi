/**
 * Tiện ích kiểm tra, chuẩn hóa và bảo vệ dữ liệu đầu vào người dùng ở Frontend.
 * Ngăn chặn XSS, Script Injection, nhập liệu sai định dạng trước khi gửi lên API.
 */

// Regex phát hiện các mẫu XSS và script độc hại
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript\s*:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /<img\b[^>]*onerror/gi,
  /<svg\b[^>]*onload/gi
];

/**
 * Loại bỏ các thẻ HTML và đoạn mã script nguy hiểm từ chuỗi nhập vào
 */
export const sanitizeInput = (input: string | undefined | null): string => {
  if (!input) return '';
  let cleaned = String(input);
  DANGEROUS_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  // Loại bỏ các thẻ html đơn giản còn sót lại
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');
  return cleaned.trim();
};

/**
 * Kiểm tra xem chuỗi có chứa mã độc script / injection hay không
 */
export const hasPotentialXss = (input: string | undefined | null): boolean => {
  if (!input) return false;
  const str = String(input);
  return DANGEROUS_PATTERNS.some(p => p.test(str)) ||
         /<[a-z][\s\S]*>/i.test(str) ||
         str.toLowerCase().includes('javascript:');
};

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (10 số, đầu 03, 05, 07, 08, 09 hoặc +84, hoặc số cố định 02x)
 */
export const validatePhone = (
  phone: string | undefined | null,
  required = true
): { valid: boolean; message?: string } => {
  if (!phone || !phone.trim()) {
    if (required) return { valid: false, message: 'Số điện thoại không được để trống' };
    return { valid: true };
  }
  const clean = phone.trim().replace(/[\s.-]/g, '');
  // Chặn tuyệt đối nếu có chứa chữ cái (ví dụ 0365224245s) hoặc ký tự lạ
  if (!/^\+?[0-9]+$/.test(clean)) {
    return { valid: false, message: 'Số điện thoại chỉ được chứa các chữ số (không chứa chữ cái hay ký tự đặc biệt)' };
  }
  // Di động 10 số (hoặc +84), hoặc số bàn 11 số (02x)
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$/;
  if (!phoneRegex.test(clean)) {
    return { valid: false, message: 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)' };
  }
  return { valid: true };
};

/**
 * Kiểm tra định dạng Email hợp lệ chuẩn RFC
 */
export const validateEmail = (
  email: string | undefined | null,
  required = false
): { valid: boolean; message?: string } => {
  if (!email || !email.trim()) {
    if (required) return { valid: false, message: 'Địa chỉ email không được để trống' };
    return { valid: true };
  }
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Địa chỉ email không đúng định dạng (ví dụ: khachhang@gmail.com)' };
  }
  return { valid: true };
};

/**
 * Kiểm tra CCCD / CMND Việt Nam (9 số hoặc 12 số) hoặc Hộ chiếu (1 chữ cái + 7-8 số)
 * Ngăn chặn tuyệt đối các chuỗi rác dạng chữ cái ngẫu nhiên (ví dụ: gggrgrggr).
 */
export const validateCCCD = (
  cccd: string | undefined | null,
  required = false
): { valid: boolean; message?: string } => {
  if (!cccd || !cccd.trim()) {
    if (required) return { valid: false, message: 'Số CCCD/CMND không được để trống' };
    return { valid: true };
  }
  const clean = cccd.trim().replace(/\s/g, '');
  // 9 số (CMND cũ), 12 số (CCCD mới), hoặc Passport quốc tế (1 chữ cái + 7-8 số)
  const cccdRegex = /^[0-9]{9}$|^[0-9]{12}$|^[a-zA-Z][0-9]{7,8}$/;
  if (!cccdRegex.test(clean)) {
    return { 
      valid: false, 
      message: 'Số CCCD/CMND không hợp lệ (phải gồm 9 hoặc 12 chữ số, hoặc Hộ chiếu 1 chữ cái và 7-8 số; không chứa chữ cái tùy tiện)' 
    };
  }
  return { valid: true };
};

/**
 * Kiểm tra khoảng ngày lưu trú (Check-in và Check-out)
 */
export const validateDateRange = (
  checkInDate: string | undefined | null,
  checkOutDate: string | undefined | null
): { valid: boolean; message?: string } => {
  if (!checkInDate) {
    return { valid: false, message: 'Vui lòng chọn ngày nhận phòng' };
  }
  if (!checkOutDate) {
    return { valid: false, message: 'Vui lòng chọn ngày trả phòng' };
  }
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: 'Định dạng ngày không hợp lệ' };
  }

  if (end <= start) {
    return { valid: false, message: 'Ngày trả phòng phải sau ngày nhận phòng' };
  }

  return { valid: true };
};

/**
 * Kiểm tra giá trị tiền hoặc số lượng hợp lệ (không âm, không NaN, trong giới hạn)
 */
export const validatePositiveNumber = (
  value: number | string | undefined | null,
  fieldName = 'Số tiền',
  max?: number
): { valid: boolean; message?: string } => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, message: `${fieldName} không được để trống` };
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} phải là số hợp lệ` };
  }
  if (num < 0) {
    return { valid: false, message: `${fieldName} không được âm` };
  }
  if (max !== undefined && num > max) {
    return { valid: false, message: `${fieldName} không được vượt quá ${max.toLocaleString('vi-VN')}` };
  }
  return { valid: true };
};
