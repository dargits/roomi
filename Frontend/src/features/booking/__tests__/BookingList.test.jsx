import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BookingList from '../BookingList';
import bookingApi from '../../../services/bookingApi';
import { AuthProvider } from '../../../context/AuthContext';

// Mock bookingApi
vi.mock('../../../services/bookingApi', () => ({
  default: {
    getAllBookings: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    cancelBooking: vi.fn(),
    noShow: vi.fn(),
  }
}));

const mockBookings = [
  {
    id: 1,
    guestName: 'Phạm Văn Mạnh',
    guestPhone: '0912345678',
    roomNumber: '401',
    roomTypeName: 'Suite',
    checkInDate: '2026-08-15',
    checkOutDate: '2026-08-16',
    status: 'CHECKED_IN',
    totalAmount: 1200000
  },
  {
    id: 2,
    guestName: 'Trần Thị Mai',
    guestPhone: '0987654321',
    roomNumber: null,
    roomTypeName: 'Deluxe',
    checkInDate: '2026-08-18',
    checkOutDate: '2026-08-20',
    status: 'CONFIRMED',
    totalAmount: 2000000
  }
];

describe('BookingList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    bookingApi.getAllBookings.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <BookingList />
      </AuthProvider>
    );

    expect(screen.getByText(/Đang tải dữ liệu/i)).toBeInTheDocument();
  });

  it('renders booking list and Vietnamese status badges accurately', async () => {
    bookingApi.getAllBookings.mockResolvedValue(mockBookings);

    render(
      <AuthProvider>
        <BookingList />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Phạm Văn Mạnh')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();
    });

    // Check Vietnamese status badges
    expect(screen.getByText('Đang ở')).toBeInTheDocument();
    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();

    // Check room numbers and unassigned tags
    expect(screen.getByText('Phòng 401')).toBeInTheDocument();
    expect(screen.getByText('Chưa xếp phòng')).toBeInTheDocument();

    // Check stay time and night count formatting
    expect(screen.getByText(/14:00 • 15\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/1 đêm/)).toBeInTheDocument();
    expect(screen.getByText(/2 đêm/)).toBeInTheDocument();
  });
});
