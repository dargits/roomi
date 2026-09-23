import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import UserPermissionModal from '../UserPermissionModal';
import { userPermissionApi } from '../../../services/userPermissionApi';
import { UserResponse } from '../../../types';

vi.mock('../../../services/userPermissionApi', () => ({
  userPermissionApi: {
    getUserPermissions: vi.fn(),
    grantPermission: vi.fn(),
    revokePermission: vi.fn()
  }
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError
  })
}));

describe('UserPermissionModal component', () => {
  const mockUser: UserResponse = {
    id: 10,
    name: 'Lê Văn C',
    account: 'levanc',
    role: 'RECEPTIONIST',
    active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders user permissions overview', async () => {
    (userPermissionApi.getUserPermissions as any).mockResolvedValue({
      userId: 10,
      userName: 'Lê Văn C',
      account: 'levanc',
      role: 'RECEPTIONIST',
      roleDefaultPermissions: ['Tạo đặt phòng', 'Nhận phòng/Trả phòng'],
      extraPermissions: [
        {
          id: 1,
          permission: 'VIEW_REVENUE_REPORT',
          permissionLabel: 'Xem báo cáo doanh thu tổng hợp',
          expiresAt: '2026-12-31',
          reason: 'Hỗ trợ kế toán',
          isExpired: false,
          isRevoked: false
        }
      ],
      availableExtraPermissions: ['VIEW_REVENUE_REPORT', 'VIEW_DEBTS']
    });

    render(<UserPermissionModal isOpen={true} onClose={() => {}} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText(/phân quyền tài khoản/i)).toBeInTheDocument();
      expect(screen.getByText('Xem báo cáo doanh thu tổng hợp')).toBeInTheDocument();
      expect(screen.getByText(/Hỗ trợ kế toán/)).toBeInTheDocument();
    });
  });

  it('opens add permission form and validates selection', async () => {
    (userPermissionApi.getUserPermissions as any).mockResolvedValue({
      userId: 10,
      userName: 'Lê Văn C',
      account: 'levanc',
      role: 'RECEPTIONIST',
      roleDefaultPermissions: [],
      extraPermissions: [],
      availableExtraPermissions: ['VIEW_DEBTS']
    });

    render(<UserPermissionModal isOpen={true} onClose={() => {}} user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cấp quyền bổ sung/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cấp quyền bổ sung/i }));

    const submitBtn = await screen.findByRole('button', { name: /xác nhận cấp quyền/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(mockToastError).toHaveBeenCalledWith('Vui lòng chọn quyền xem muốn cấp.');
  });
});
