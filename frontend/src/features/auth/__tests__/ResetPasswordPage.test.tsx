import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from '../ResetPasswordPage';
import { passwordResetApi } from '../../../services/passwordResetApi';
import * as ToastContext from '../../../context/ToastContext';
import * as AppConfigContext from '../../../context/AppConfigContext';

vi.mock('../../../services/passwordResetApi', () => ({
  passwordResetApi: {
    verifyResetToken: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage Component', () => {
  const mockSuccessToast = vi.fn();
  const mockErrorToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(ToastContext, 'useToast').mockReturnValue({
      success: mockSuccessToast,
      error: mockErrorToast,
      showToast: vi.fn(),
    } as any);

    vi.spyOn(AppConfigContext, 'useAppConfig').mockReturnValue({
      hotelSetting: { propertyName: 'StayAway PMS', homeImage: '' },
      isAppLoading: false,
    } as any);
  });

  it('renders loading state initially while verifying token', async () => {
    (passwordResetApi.verifyResetToken as any).mockImplementation(
      () => new Promise(() => {}) // pending promise
    );

    render(
      <MemoryRouter initialEntries={['/reset-password/test-token-1234567890']}>
        <Routes>
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Đang kiểm tra tính hợp lệ của liên kết/i)).toBeInTheDocument();
  });

  it('renders error state when token is invalid or expired', async () => {
    (passwordResetApi.verifyResetToken as any).mockResolvedValueOnce({
      valid: false,
      message: 'Liên kết đặt lại mật khẩu đã hết hiệu lực (quá 10 phút).',
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/reset-password/expired-token-1234567890']}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Liên kết không hợp lệ hoặc đã hết hạn/i)).toBeInTheDocument();
      expect(screen.getByText(/Liên kết đặt lại mật khẩu đã hết hiệu lực/i)).toBeInTheDocument();
    });
  });

  it('renders password reset form when token is valid and submits successfully', async () => {
    (passwordResetApi.verifyResetToken as any).mockResolvedValueOnce({
      valid: true,
      account: 'letan01',
      userName: 'Nguyễn Văn Lễ Tân',
      userEmail: 'le***1@gmail.com',
      remainingSeconds: 590,
      message: 'Liên kết hợp lệ.',
    });

    (passwordResetApi.resetPassword as any).mockResolvedValueOnce({
      message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/reset-password/valid-token-12345678901234567890']}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Lễ Tân')).toBeInTheDocument();
      expect(screen.getByText('letan01')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Nhập tối thiểu 6 ký tự/i)).toBeInTheDocument();
    });

    // Fill new password and confirm password
    const newPassInput = screen.getByPlaceholderText(/Nhập tối thiểu 6 ký tự/i);
    const confirmPassInput = screen.getByPlaceholderText(/Nhập lại mật khẩu mới/i);
    const submitBtn = screen.getByRole('button', { name: /XÁC NHẬN ĐỔI MẬT KHẨU/i });

    await act(async () => {
      fireEvent.change(newPassInput, { target: { value: 'NewPassword@123' } });
      fireEvent.change(confirmPassInput, { target: { value: 'NewPassword@123' } });
    });

    expect(screen.getByText(/Mật khẩu xác nhận trùng khớp/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(passwordResetApi.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token-12345678901234567890',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      });
      expect(screen.getByText(/Đặt lại mật khẩu thành công!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ĐĂNG NHẬP NGAY/i })).toBeInTheDocument();
    });
  });
});
