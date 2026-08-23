import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import * as AuthContext from '../../../context/AuthContext';
import * as ToastContext from '../../../context/ToastContext';
import * as AppConfigContext from '../../../context/AppConfigContext';
import authApi from '../../../services/authApi';

// Mock the API and Context
vi.mock('../../../services/authApi', () => ({
  default: {
    login: vi.fn(),
  }
}));

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      login: mockLogin,
      user: null
    });

    vi.spyOn(ToastContext, 'useToast').mockReturnValue({
      showToast: mockShowToast
    });

    vi.spyOn(AppConfigContext, 'useAppConfig').mockReturnValue({
      hotelSetting: { propertyName: 'Test Hotel', homeImage: '' },
      isAppLoading: false
    });
  });

  it('renders login form correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByPlaceholderText(/Nhập tài khoản/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng Nhập/i })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    await act(async () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );
    });

    const phoneInput = screen.getByPlaceholderText(/Nhập tài khoản/i);
    const passwordInput = screen.getByPlaceholderText(/Nhập mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: /Đăng Nhập/i });

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: '0901234567' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('0901234567', 'password123', false);
    });
  });

  it('handles login failure', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, message: 'Sai thông tin đăng nhập' });

    await act(async () => {
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );
    });

    const phoneInput = screen.getByPlaceholderText(/Nhập tài khoản/i);
    const passwordInput = screen.getByPlaceholderText(/Nhập mật khẩu/i);
    const submitBtn = screen.getByRole('button', { name: /Đăng Nhập/i });

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: '0901234567' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('0901234567', 'wrongpass', false);
      expect(screen.getByText('Sai thông tin đăng nhập')).toBeInTheDocument();
    });
  });
});
