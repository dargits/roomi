/**
 * Tiện ích che thông tin cá nhân (QTN-24)
 * - Họ tên: Giữ chữ cái đầu mỗi từ
 * - Số điện thoại: Che 3-4 số ở giữa, giữ 3 số đầu và 4 số cuối
 * - Email: Giữ ký tự đầu của username + giữ nguyên domain
 * - CCCD / Hộ chiếu: Giữ nguyên cơ chế hiện tại (**** + 4 ký tự cuối)
 * - Điều kiện: Chỉ OWNER và RECEPTIONIST được xem đầy đủ
 */

export const CAN_VIEW_FULL_ROLES = ['OWNER', 'RECEPTIONIST'];

export const canViewFullPersonalData = (userOrRole) => {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return CAN_VIEW_FULL_ROLES.includes(role);
};

export const maskName = (name) => {
  return name;
};

export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  const trimmed = phone.trim();
  if (!trimmed) return phone;
  if (trimmed.includes('*')) return trimmed;
  if (trimmed.length <= 6) return '****';

  const startLen = 3;
  const endLen = 3;
  const middleLen = trimmed.length - startLen - endLen;
  return trimmed.slice(0, startLen) + '*'.repeat(middleLen) + trimmed.slice(-endLen);
};

export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
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

export const maskIdentifier = (idNumber) => {
  if (!idNumber || typeof idNumber !== 'string') return idNumber;
  const trimmed = idNumber.trim();
  if (!trimmed) return idNumber;
  if (trimmed.length <= 4) return '****';
  return '****' + trimmed.slice(-4);
};

export const maskCCCD = maskIdentifier;

export const formatName = (name, userOrRole) => {
  if (!name) return '—';
  return name;
};

export const formatPhone = (phone, userOrRole) => {
  if (!phone) return '—';
  return canViewFullPersonalData(userOrRole) ? phone : maskPhone(phone);
};

export const formatEmail = (email, userOrRole) => {
  if (!email) return '—';
  return canViewFullPersonalData(userOrRole) ? email : maskEmail(email);
};

export const formatCCCD = (cccd, userOrRole) => {
  if (!cccd) return 'Chưa cập nhật';
  return canViewFullPersonalData(userOrRole) ? cccd : maskCCCD(cccd);
};
