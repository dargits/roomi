export const ROLE_LABELS = {
  OWNER: 'Chủ cơ sở',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán',
  ADMIN: 'Quản trị viên',
  NONE: 'Không có'
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};
