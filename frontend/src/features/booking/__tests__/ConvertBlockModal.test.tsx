import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ConvertBlockModal from '../ConvertBlockModal';
import { channelApi } from '../../../services/channelApi';
import { roomApi } from '../../../services/roomApi';

// Mock ToastContext
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    toastSuccess: mockToastSuccess,
    toastError: mockToastError,
  }),
}));

// Mock channelApi
vi.mock('../../../services/channelApi', () => ({
  channelApi: {
    convertBlockToBooking: vi.fn(),
  },
}));

// Mock roomApi
vi.mock('../../../services/roomApi', () => ({
  roomApi: {
    getAvailableRooms: vi.fn().mockResolvedValue([
      { id: 101, roomNumber: '101', roomTypeId: 1, roomTypeName: 'Deluxe Sea View', status: 'AVAILABLE' },
      { id: 102, roomNumber: '102', roomTypeId: 1, roomTypeName: 'Deluxe Sea View', status: 'AVAILABLE' },
    ]),
  },
}));

describe('ConvertBlockModal Component', () => {
  const mockBlock = {
    id: 42,
    channelId: 1,
    channelName: 'Airbnb',
    channelCode: 'AIRBNB',
    roomTypeId: 1,
    roomTypeName: 'Deluxe Sea View',
    roomId: 101,
    roomNumber: '101',
    startDate: '2026-10-01',
    endDate: '2026-10-04',
    summary: '[Airbnb] Reserved for John Doe',
    note: 'UID: reservation-42@airbnb.com',
    isExcess: false,
  };

  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with channel details and block information', async () => {
    render(
      <ConvertBlockModal
        isOpen={true}
        onClose={mockOnClose}
        block={mockBlock}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Chuyển lượt chặn từ kênh thành Đặt phòng chính thức/i)).toBeInTheDocument();
    expect(screen.getByText('Airbnb')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Sea View')).toBeInTheDocument();
    expect(screen.getByText('Phòng 101')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026 → 04/10/2026')).toBeInTheDocument();
  });

  it('submits conversion form with guest info and calls API', async () => {
    (channelApi.convertBlockToBooking as any).mockResolvedValueOnce({
      id: 888,
      guestName: 'Nguyễn Văn B',
      status: 'CONFIRMED',
    });

    render(
      <ConvertBlockModal
        isOpen={true}
        onClose={mockOnClose}
        block={mockBlock}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in required guest name
    const nameInput = screen.getByPlaceholderText('VD: Nguyễn Văn A');
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn B' } });

    // Fill in phone
    const phoneInput = screen.getByPlaceholderText('0912345678');
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    // Fill in expected price
    const priceInput = screen.getByPlaceholderText('VD: 1500000');
    fireEvent.change(priceInput, { target: { value: '3500000' } });

    // Submit form
    const submitBtn = screen.getByText('Xác nhận chuyển thành Đặt phòng');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(channelApi.convertBlockToBooking).toHaveBeenCalledWith(42, expect.objectContaining({
        guestName: 'Nguyễn Văn B',
        guestPhone: '0987654321',
        expectedPrice: 3500000,
      }));
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays warning badge when block is excess', () => {
    render(
      <ConvertBlockModal
        isOpen={true}
        onClose={mockOnClose}
        block={{ ...mockBlock, isExcess: true }}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Cảnh báo vượt phân bổ/i)).toBeInTheDocument();
  });
});
