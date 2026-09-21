import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import SessionManagementPage from '../SessionManagementPage';
import userApi from '../../../services/userApi';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, account: 'admin', name: 'Quản trị viên', role: 'ADMIN' },
    isAuthenticated: true,
  }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    toastSuccess: mockToastSuccess,
    toastError: mockToastError,
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock('../../../services/userApi', () => ({
  default: {
    getActiveSessions: vi.fn(),
    forceLogoutSession: vi.fn(),
    forceLogoutAllSessions: vi.fn(),
  },
}));

const mockSessions = [
  {
    id: 101,
    userId: 1,
    account: 'admin',
    name: 'Quản trị viên',
    role: 'ADMIN',
    loginAt: '2026-09-21T08:00:00',
    lastActiveAt: '2026-09-21T08:30:00',
    ipAddress: '192.168.1.50',
    deviceInfo: 'Google Chrome (Windows)',
    status: 'ACTIVE',
    isCurrentSession: true,
  },
  {
    id: 102,
    userId: 2,
    account: 'letan',
    name: 'Lê Ngọc Hân',
    role: 'RECEPTIONIST',
    loginAt: '2026-09-21T07:30:00',
    lastActiveAt: '2026-09-21T08:15:00',
    ipAddress: '192.168.1.100',
    deviceInfo: 'Apple Safari (iPhone)',
    status: 'ACTIVE',
    isCurrentSession: false,
  },
];

describe('SessionManagementPage Component (NCL-10-CN-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (userApi.getActiveSessions as any).mockResolvedValue(mockSessions);
  });

  it('TC-01: Renders active sessions list with employee, device info, and role', async () => {
    render(<SessionManagementPage />);

    expect(screen.getByText(/Theo dõi phiên đăng nhập/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Quản trị viên').length).toBeGreaterThan(0);
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
      expect(screen.getByText('@letan')).toBeInTheDocument();
      expect(screen.getByText('Phiên của bạn')).toBeInTheDocument();
      expect(screen.getByText(/Google Chrome/i)).toBeInTheDocument();
      expect(screen.getByText(/Apple Safari/i)).toBeInTheDocument();
    });
  });

  it('TC-04: Prevents self-logout of the current session', async () => {
    render(<SessionManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Không thể tự ngắt')).toBeInTheDocument();
    });
  });

  it('TC-02: Opens modal and successfully force logouts a remote session', async () => {
    (userApi.forceLogoutSession as any).mockResolvedValue({ message: 'Đã buộc đăng xuất phiên làm việc thành công.' });

    render(<SessionManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
    });

    // Click "Đăng xuất phiên" for letan
    const logoutBtn = screen.getByTitle('Buộc đăng xuất phiên này');
    fireEvent.click(logoutBtn);

    // Modal pops up
    expect(screen.getByText('Xác nhận thao tác quản trị từ xa')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Quên đăng xuất trên máy chung ở quầy')).toBeInTheDocument();

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: 'Buộc đăng xuất' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(userApi.forceLogoutSession).toHaveBeenCalledWith(102, 'Quên đăng xuất trên máy chung ở quầy');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });
});
