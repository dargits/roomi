import { Role } from '../types';

/**
 * Tiện ích che thông tin cá nhân (QTN-24)
 * - Họ tên: Giữ nguyên
 * - Số điện thoại: Che 3-4 số ở giữa, giữ 3 số đầu và 3 số cuối
 * - Email: Giữ ký tự đầu của username + giữ nguyên domain
 * - CCCD / Hộ chiếu: Giữ nguyên cơ chế (**** + 4 ký tự cuối)
 * - Điều kiện: Chỉ OWNER và RECEPTIONIST được xem đầy đủ
 */

export const CAN_VIEW_FULL_ROLES: Role[] = ['OWNER', 'RECEPTIONIST'];

export const canViewFullPersonalData = (userOrRole?: { role?: Role } | Role | string | null): boolean => {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return CAN_VIEW_FULL_ROLES.includes(role as Role);
};

export const maskName = (name?: string | null): any => {
  if (name === null) return null;
  return name || '';
};

export const maskPhone = (phone?: string | null): string => {
  if (!phone || typeof phone !== 'string') return phone || '';
  const trimmed = phone.trim();
  if (!trimmed) return phone;
  if (trimmed.includes('*')) return trimmed;
  if (trimmed.length <= 6) return '****';

  const startLen = 3;
  const endLen = 3;
  const middleLen = trimmed.length - startLen - endLen;
  return trimmed.slice(0, startLen) + '*'.repeat(middleLen) + trimmed.slice(-endLen);
};

export const maskEmail = (email?: string | null): string => {
  if (!email || typeof email !== 'string') return email || '';
  const trimmed = email.trim();
  if (!trimmed) return email;

  const atIndex = trimmed.indexOf('@');
  if (atIndex < 0) return trimmed.charAt(0) + '***';
  if (atIndex === 0) return trimmed;

  const username = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  if (username.includes('*')) return trimmed;

  return username.charAt(0) + '***' + domain;
};

export const maskIdentifier = (idNumber?: string | null): string => {
  if (!idNumber || typeof idNumber !== 'string') return idNumber || '';
  const trimmed = idNumber.trim();
  if (!trimmed) return idNumber;
  if (trimmed.length <= 4) return '****';
  return '****' + trimmed.slice(-4);
};

export const maskCCCD = maskIdentifier;

export const formatName = (name?: string | null, _userOrRole?: any): string => {
  if (!name) return '—';
  return name;
};

export const formatPhone = (phone?: string | null, userOrRole?: any): string => {
  if (!phone) return '—';
  return canViewFullPersonalData(userOrRole) ? phone : maskPhone(phone);
};

export const formatEmail = (email?: string | null, userOrRole?: any): string => {
  if (!email) return '—';
  return canViewFullPersonalData(userOrRole) ? email : maskEmail(email);
};

export const formatCCCD = (cccd?: string | null, userOrRole?: any): string => {
  if (!cccd) return 'Chưa cập nhật';
  return canViewFullPersonalData(userOrRole) ? cccd : maskCCCD(cccd);
};
