import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordModal from '../ForgotPasswordModal';
import { passwordResetApi } from '../../../services/passwordResetApi';

vi.mock('../../../services/passwordResetApi', () => ({
  passwordResetApi: {
    checkAccount: vi.fn(),
    requestReset: vi.fn()
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

describe('ForgotPasswordModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen=true', () => {
    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Quên mật khẩu đăng nhập')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/letan/i)).toBeInTheDocument();
  });

  it('shows error when submitting empty account', async () => {
    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);

    const form = screen.getByRole('button', { name: /gửi liên kết/i }).closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByText('Vui lòng nhập tên đăng nhập tài khoản.')).toBeInTheDocument();
  });

  it('submits request successfully when account exists', async () => {
    (passwordResetApi.checkAccount as any).mockResolvedValue({
      exists: true,
      active: true,
      name: 'Nguyen Van A'
    });
    (passwordResetApi.requestReset as any).mockResolvedValue({
      message: 'Đã gửi yêu cầu thành công'
    });

    render(<ForgotPasswordModal isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/letan/i);
    fireEvent.change(input, { target: { value: 'reception01' } });
    fireEvent.blur(input);

    const submitBtn = screen.getByRole('button', { name: /gửi liên kết/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(passwordResetApi.checkAccount).toHaveBeenCalledWith('reception01');
      expect(passwordResetApi.requestReset).toHaveBeenCalledWith('reception01');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });
});
