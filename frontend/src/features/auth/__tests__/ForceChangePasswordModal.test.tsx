import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForceChangePasswordModal from '../ForceChangePasswordModal';
import { passwordResetApi } from '../../../services/passwordResetApi';

vi.mock('../../../services/passwordResetApi', () => ({
  passwordResetApi: {
    forceChangePassword: vi.fn()
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

describe('ForceChangePasswordModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with account name and password inputs', () => {
    render(<ForceChangePasswordModal isOpen={true} account="staff01" />);
    expect(screen.getByText(/thiết lập mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('staff01')).toBeInTheDocument();
  });

  it('shows error if new password is too short', async () => {
    render(<ForceChangePasswordModal isOpen={true} account="staff01" />);

    const tempInput = screen.getByPlaceholderText(/nhập mật khẩu tạm được cấp/i);
    fireEvent.change(tempInput, { target: { value: 'temp123' } });

    const newPassInput = screen.getByPlaceholderText(/tối thiểu 6 ký tự/i);
    fireEvent.change(newPassInput, { target: { value: '123' } });

    const confirmInput = screen.getByPlaceholderText(/nhập lại mật khẩu mới/i);
    fireEvent.change(confirmInput, { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /xác nhận đổi mật khẩu/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(mockToastError).toHaveBeenCalledWith('Mật khẩu mới phải có ít nhất 6 ký tự.');
  });

  it('submits successfully when form is valid', async () => {
    const handleSuccess = vi.fn();
    (passwordResetApi.forceChangePassword as any).mockResolvedValue({
      message: 'Thành công'
    });

    render(<ForceChangePasswordModal isOpen={true} account="staff01" onSuccess={handleSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/nhập mật khẩu tạm được cấp/i), {
      target: { value: 'tempPass123' }
    });
    fireEvent.change(screen.getByPlaceholderText(/tối thiểu 6 ký tự/i), {
      target: { value: 'newPass123' }
    });
    fireEvent.change(screen.getByPlaceholderText(/nhập lại mật khẩu mới/i), {
      target: { value: 'newPass123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /xác nhận đổi mật khẩu/i }));

    await waitFor(() => {
      expect(passwordResetApi.forceChangePassword).toHaveBeenCalledWith({
        account: 'staff01',
        tempPassword: 'tempPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123'
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });
});
