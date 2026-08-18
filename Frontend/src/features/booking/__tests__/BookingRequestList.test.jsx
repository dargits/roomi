import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BookingRequestList from '../BookingRequestList';
import { bookingRequestApi } from '../../../services/bookingRequestApi';

// Mock bookingRequestApi
vi.mock('../../../services/bookingRequestApi', () => ({
  bookingRequestApi: {
    getAllBookingRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
  }
}));

const mockRequests = [
  {
    id: 1,
    guestName: 'Lê Văn Tám',
    phone: '0988111222',
    roomTypeName: 'Phòng Đơn',
    checkInDate: '2026-08-20',
    checkOutDate: '2026-08-22',
    status: 'PENDING',
    createdAt: '2026-08-18T08:00:00',
    note: 'Yêu cầu phòng yên tĩnh'
  },
  {
    id: 2,
    guestName: 'Nguyễn Thị Hoa',
    phone: '0977333444',
    roomTypeName: 'Phòng VIP',
    checkInDate: '2026-08-21',
    checkOutDate: '2026-08-23',
    status: 'APPROVED',
    createdAt: '2026-08-18T07:00:00'
  }
];

describe('BookingRequestList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders booking request list with items properly', async () => {
    bookingRequestApi.getAllBookingRequests.mockResolvedValue(mockRequests);

    render(<BookingRequestList />);

    await waitFor(() => {
      expect(screen.getByText('Lê Văn Tám')).toBeInTheDocument();
      expect(screen.getByText('0988111222')).toBeInTheDocument();
      expect(screen.getByText('Phòng Đơn')).toBeInTheDocument();
      expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument();
      expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    });

    expect(screen.getByText('Duyệt')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
  });

  it('renders empty state when there are no requests', async () => {
    bookingRequestApi.getAllBookingRequests.mockResolvedValue([]);

    render(<BookingRequestList />);

    await waitFor(() => {
      expect(screen.getByText('Chưa có yêu cầu đặt phòng nào từ Web.')).toBeInTheDocument();
    });
  });
});
