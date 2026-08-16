import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BookingCalendar from '../BookingCalendar';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' },
  }),
}));

// Mock bookingApi
vi.mock('../../../services/bookingApi', () => {
  const mockApi = {
    getBookingCalendar: vi.fn().mockResolvedValue([
      {
        bookingId: 10,
        bookingCode: 'BK-1001',
        guestName: 'Nguyễn Văn A',
        guestPhone: '0901234567',
        roomId: 1,
        roomNumber: '101',
        checkInDate: '2026-08-15',
        checkOutDate: '2026-08-17',
        status: 'CHECKED_IN',
        expectedPrice: 1200000,
      },
    ]),
    getAll: vi.fn().mockResolvedValue([]),
  };
  return {
    default: mockApi,
    bookingApi: mockApi,
  };
});

// Mock roomApi
vi.mock('../../../services/roomApi', () => {
  const mockApi = {
    getAllRooms: vi.fn().mockResolvedValue([
      { id: 1, roomNumber: '101', roomType: { name: 'Standard Room' }, floor: '1', status: 'AVAILABLE' },
    ]),
  };
  return {
    default: mockApi,
    roomApi: mockApi,
  };
});

describe('BookingCalendar Component', () => {
  it('renders header, title, and day range selector', () => {
    render(<BookingCalendar onOpenDetail={vi.fn()} />);

    expect(screen.getByText('Sơ đồ Lịch Phòng')).toBeInTheDocument();
    expect(screen.getByText('7 ngày')).toBeInTheDocument();
    expect(screen.getByText('14 ngày')).toBeInTheDocument();
    expect(screen.getByText('21 ngày')).toBeInTheDocument();
  });

  it('renders timeline legend and room data', async () => {
    render(<BookingCalendar onOpenDetail={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Trạng thái đặt phòng:')).toBeInTheDocument();
      expect(screen.getByText('Đang ở')).toBeInTheDocument();
      expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Đã đi / Lịch sử')).toBeInTheDocument();
    });
  });
});
