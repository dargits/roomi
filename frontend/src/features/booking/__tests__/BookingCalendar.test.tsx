import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingCalendar from '../BookingCalendar';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' },
  }),
}));

// Mock ToastContext
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock channelApi
vi.mock('../../../services/channelApi', () => ({
  channelApi: {
    convertBlockToBooking: vi.fn().mockResolvedValue({
      id: 99,
      guestName: 'John Doe',
      roomNumber: '101',
      status: 'CONFIRMED',
    }),
    getBlocks: vi.fn().mockResolvedValue([]),
    getActiveBlocks: vi.fn().mockResolvedValue([]),
  },
}));

const formatTestDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Mock bookingApi
vi.mock('../../../services/bookingApi', () => {
  const mockApi = {
    getBookingCalendar: vi.fn().mockImplementation(() => {
      const today = new Date();
      const d = (offset: number) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + offset);
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return Promise.resolve([
        {
          bookingId: 10,
          bookingCode: 'BK-1001',
          guestName: 'Nguyễn Văn A',
          guestPhone: '0901234567',
          roomId: 1,
          roomNumber: '101',
          checkInDate: d(0),
          checkOutDate: d(1),
          status: 'CHECKED_IN',
          expectedPrice: 1200000,
        },
        {
          bookingId: 99,
          blockId: 5,
          channelId: 1,
          channelName: 'Airbnb',
          channelCode: 'AIRBNB',
          guestName: '[Airbnb] Kênh giữ chỗ',
          roomId: 1,
          roomNumber: '101',
          roomTypeId: 1,
          roomTypeName: 'Standard Room',
          checkInDate: d(1),
          checkOutDate: d(3),
          status: 'CHANNEL_BLOCKED',
          isChannelBlock: true,
        },
      ]);
    }),
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
    getAvailableRooms: vi.fn().mockResolvedValue([
      { id: 1, roomNumber: '101', roomTypeId: 1, roomTypeName: 'Standard Room', status: 'AVAILABLE' },
    ]),
  };
  return {
    default: mockApi,
    roomApi: mockApi,
  };
});

describe('BookingCalendar Component', () => {
  it('renders header, title, and day range selector', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <BookingCalendar onOpenDetail={vi.fn()} />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Về Hôm nay')).toBeInTheDocument();
    expect(screen.getByText('7 NGÀY')).toBeInTheDocument();
    expect(screen.getByText('14 NGÀY')).toBeInTheDocument();
    expect(screen.getByText('21 NGÀY')).toBeInTheDocument();
  });

  it('renders timeline legend and room data', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <BookingCalendar onOpenDetail={vi.fn()} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Trạng thái đặt phòng:')).toBeInTheDocument();
      expect(screen.getByText('Đang ở')).toBeInTheDocument();
      expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Chặn từ kênh (OTA)')).toBeInTheDocument();
      expect(screen.getByText('Đã đi / Lịch sử')).toBeInTheDocument();
    });
  });

  it('renders channel room block and opens ConvertBlockModal on click', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <BookingCalendar onOpenDetail={vi.fn()} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Phòng 101')).toBeInTheDocument();
    });

    const channelElements = screen.getAllByText(/Airbnb/i);
    expect(channelElements.length).toBeGreaterThan(0);

    // Click on the channel block
    const channelBlockEl = channelElements[0].closest('div[class*="cursor-pointer"]');
    expect(channelBlockEl).toBeInTheDocument();

    await act(async () => {
      channelBlockEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByText(/Chuyển lượt chặn từ kênh thành Đặt phòng chính thức/i)).toBeInTheDocument();
      expect(screen.getByText(/Họ và tên khách hàng/i)).toBeInTheDocument();
      expect(screen.getByText(/Xác nhận chuyển thành Đặt phòng/i)).toBeInTheDocument();
    });
  });
});

