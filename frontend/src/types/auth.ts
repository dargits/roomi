export type Role =
  | 'OWNER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPER'
  | 'ACCOUNTANT'
  | 'ADMIN'
  | 'CUSTOMER'
  | 'NONE';

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Chủ cơ sở',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán',
  ADMIN: 'Quản trị viên',
  CUSTOMER: 'Khách hàng',
  NONE: 'Chưa phân quyền'
};

export interface UserResponse {
  id: number;
  name: string;
  account: string;
  phone?: string;
  email?: string;
  createAt?: string;
  avatarImage?: string | null;
  active: boolean;
  mustChangePassword?: boolean;
  role: Role;
}

export type User = UserResponse;

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface RegisterRequest {
  account: string;
  password: string;
  name: string;
  phone?: string;
  email?: string;
  avatarImage?: string;
  role: Role;
}

export interface UserUpdateRequest {
  name?: string;
  phone?: string;
  email?: string;
  avatarImage?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ForceChangePasswordRequest {
  account: string;
  tempPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AccountCheckResponse {
  exists: boolean;
  account?: string;
  name?: string;
  role?: string;
  active?: boolean;
  hasEmail?: boolean;
}

export interface ForgotPasswordRequest {
  account: string;
}

export interface PasswordResetItemResponse {
  id: number;
  account: string;
  userName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  resolvedAt?: string;
  temporaryPassword?: string;
}
