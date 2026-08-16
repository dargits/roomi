import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GuestManagement from '../GuestManagement';

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' },
  }),
}));

// Mock guestApi
vi.mock('../../../services/guestApi', () => {
  const mockApi = {
    searchGuests: vi.fn().mockResolvedValue([
      { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', idNumber: '123456789012', email: 'a@example.com' },
      { id: 2, name: 'Trần Thị B', phone: '0987654321', idNumber: '987654321098', email: 'b@example.com' },
    ]),
    getGuests: vi.fn().mockResolvedValue([
      { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', idNumber: '123456789012', email: 'a@example.com' },
    ]),
    getGuestHistory: vi.fn().mockResolvedValue([]),
    getGuestLoyalty: vi.fn().mockResolvedValue({ tier: 'SILVER', points: 100 }),
  };
  return {
    default: mockApi,
    guestApi: mockApi,
  };
});

describe('GuestManagement Component', () => {
  it('renders guest management header and search input', async () => {
    render(<GuestManagement />);

    expect(screen.getByText('Quản lý Khách hàng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm tên, SĐT, CCCD...')).toBeInTheDocument();
  });

  it('renders guest list table headers and loaded data', async () => {
    render(<GuestManagement />);

    expect(screen.getByText('Tên Khách Hàng')).toBeInTheDocument();
    expect(screen.getByText('Liên Hệ')).toBeInTheDocument();
    expect(screen.getByText('Hạng Thành Viên')).toBeInTheDocument();
    expect(screen.getByText('Thao tác')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });
  });
});
