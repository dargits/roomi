import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BookingConfirmationModal } from '../BookingConfirmationModal';
import { bookingConfirmationApi } from '../../../services/bookingConfirmationApi';
import { ToastProvider } from '../../../context/ToastContext';
import { BookingConfirmationData } from '../../../types/bookingConfirmation';

vi.mock('../../../services/bookingConfirmationApi', () => ({
  bookingConfirmationApi: {
    getConfirmationData: vi.fn(),
    confirmBooking: vi.fn(),
    sendConfirmation: vi.fn(),
    getConfirmationLogs: vi.fn()
  }
}));

const mockConfirmationData: BookingConfirmationData = {
  bookingId: 101,
  bookingCode: '#101',
  status: 'CONFIRMED',
  guestId: 1,
  guestName: 'Nguyễn Văn A',
  guestPhone: '0912345678',
  guestEmail: 'nguyenvana@gmail.com',
  hasGuestPhone: true,
  hasGuestEmail: true,
  hasContactInfo: true,
  checkInDate: '2026-10-01',
  checkOutDate: '2026-10-03',
  standardCheckInTime: '14:00:00',
  standardCheckOutTime: '12:00:00',
  totalNights: 2,
  roomTypeId: 10,
  roomTypeName: 'Deluxe Hướng Biển',
  roomId: 201,
  roomNumber: '302',
  nightlyDetails: [
    {
      date: '2026-10-01',
      dayOfWeek: 'Thứ 5',
      appliedPrice: 1200000,
      priceSource: 'BASE',
      sourceName: 'Giá cơ bản'
    },
    {
      date: '2026-10-02',
      dayOfWeek: 'Thứ 6',
      appliedPrice: 1300000,
      priceSource: 'WEEKEND',
      sourceName: 'Giá cuối tuần'
    }
  ],
  totalRoomPrice: 2500000,
  extraPersonCharge: 0,
  grandTotalPrice: 2500000,
  depositPercent: 30,
  requiredDepositAmount: 750000,
  collectedDepositAmount: 0,
  freeCancelHours: 24,
  penaltyPercent: 50,
  cancellationPolicySummary: 'Miễn phí hủy trước 24 giờ nhận phòng.',
  propertyName: 'StayAway Resort & Spa',
  hotelAddress: '123 Đường Trần Phú, Nha Trang',
  hotelPhone: '02583888999',
  hotelEmail: 'contact@stayaway.vn',
  emailConfigured: true,
  formattedMessage: '🏨 [XÁC NHẬN ĐẶT PHÒNG - STAYAWAY]\nMã: #101\nKhách: Nguyễn Văn A',
  emailSendCountToday: 0,
  maxEmailSendQuota: 5,
  emailCooldownSecondsRemaining: 0,
  confirmationLogs: []
};

describe('BookingConfirmationModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation data with room, nightly rates, deposit, and cancellation policy', async () => {
    vi.mocked(bookingConfirmationApi.getConfirmationData).mockResolvedValue(mockConfirmationData);

    render(
      <ToastProvider>
        <BookingConfirmationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingId={101}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Bản xác nhận đặt phòng')).toBeInTheDocument();
    });

    // Check hotel and guest info
    expect(screen.getByText('StayAway Resort & Spa')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Hướng Biển')).toBeInTheDocument();
    expect(screen.getByText('Phòng 302')).toBeInTheDocument();

    // Check nightly prices
    expect(screen.getByText('Giá cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Giá cuối tuần')).toBeInTheDocument();

    // Check deposit
    expect(screen.getByText('Số tiền đặt cọc quy định')).toBeInTheDocument();
    expect(screen.getByText('(30% tổng tiền phòng)')).toBeInTheDocument();

    // Check cancellation policy
    expect(screen.getByText('Miễn phí hủy trước 24 giờ nhận phòng.')).toBeInTheDocument();
  });

  it('navigates to email tab and triggers first email send directly', async () => {
    vi.mocked(bookingConfirmationApi.getConfirmationData).mockResolvedValue(mockConfirmationData);
    vi.mocked(bookingConfirmationApi.sendConfirmation).mockResolvedValue({
      id: 2,
      bookingId: 101,
      channel: 'EMAIL',
      channelDisplayName: 'Thư điện tử (Email)',
      recipient: 'nguyenvana@gmail.com',
      status: 'SUCCESS',
      sentAt: '2026-09-16T09:30:00'
    });

    render(
      <ToastProvider>
        <BookingConfirmationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingId={101}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    // Switch to Email tab
    const emailTabButtons = screen.getAllByRole('button', { name: /Gửi qua Email/i });
    fireEvent.click(emailTabButtons[0]);

    expect(screen.getByText('Cấu hình gửi thư điện tử cho khách')).toBeInTheDocument();
    const sendButton = screen.getByRole('button', { name: /Gửi email xác nhận ngay/i });
    expect(sendButton).toBeInTheDocument();

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(bookingConfirmationApi.sendConfirmation).toHaveBeenCalledWith(101, expect.objectContaining({
        channel: 'EMAIL'
      }));
    });
  });

  it('opens re-confirm dialog when email was already sent before and submits with selected reason', async () => {
    const sentBeforeData: BookingConfirmationData = {
      ...mockConfirmationData,
      lastEmailSentAt: '2026-09-16T08:30:00',
      lastEmailRecipient: 'nguyenvana@gmail.com',
      lastEmailSenderName: 'Lễ tân Hoa',
      lastEmailStatus: 'SUCCESS',
      emailSendCountToday: 1,
      emailCooldownSecondsRemaining: 0
    };

    vi.mocked(bookingConfirmationApi.getConfirmationData).mockResolvedValue(sentBeforeData);
    vi.mocked(bookingConfirmationApi.sendConfirmation).mockResolvedValue({
      id: 3,
      bookingId: 101,
      channel: 'EMAIL',
      channelDisplayName: 'Thư điện tử (Email)',
      recipient: 'nguyenvana@gmail.com',
      status: 'SUCCESS',
      sentAt: '2026-09-16T09:40:00'
    });

    render(
      <ToastProvider>
        <BookingConfirmationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingId={101}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    // Switch to Email tab
    const emailTabButtons = screen.getAllByRole('button', { name: /Gửi qua Email/i });
    fireEvent.click(emailTabButtons[0]);

    // Check recent send banner
    expect(screen.getByText(/Đã gửi lần gần nhất/i)).toBeInTheDocument();
    expect(screen.getByText(/Hôm nay: 1\/5 lượt/i)).toBeInTheDocument();

    // Click Send -> should open Re-confirm dialog
    const sendButton = screen.getByRole('button', { name: /Gửi email xác nhận ngay/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận gửi lại Email cho khách')).toBeInTheDocument();
    });
    expect(screen.getByText(/Lưu ý trước khi gửi lại/i)).toBeInTheDocument();

    // Confirm resend
    const confirmResendBtn = screen.getByRole('button', { name: /Xác nhận gửi lại/i });
    fireEvent.click(confirmResendBtn);

    await waitFor(() => {
      expect(bookingConfirmationApi.sendConfirmation).toHaveBeenCalledWith(101, expect.objectContaining({
        channel: 'EMAIL',
        note: expect.stringContaining('Khách báo chưa nhận được email')
      }));
    });
  });

  it('disables send button and warns when daily email quota is reached', async () => {
    const quotaExceededData: BookingConfirmationData = {
      ...mockConfirmationData,
      lastEmailSentAt: '2026-09-16T08:30:00',
      lastEmailRecipient: 'nguyenvana@gmail.com',
      lastEmailStatus: 'SUCCESS',
      emailSendCountToday: 5,
      maxEmailSendQuota: 5
    };

    vi.mocked(bookingConfirmationApi.getConfirmationData).mockResolvedValue(quotaExceededData);

    render(
      <ToastProvider>
        <BookingConfirmationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingId={101}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    const emailTabButtons = screen.getAllByRole('button', { name: /Gửi qua Email/i });
    fireEvent.click(emailTabButtons[0]);

    expect(screen.getByText(/Đã đạt giới hạn tối đa 5 lần gửi email xác nhận/i)).toBeInTheDocument();
    const quotaButton = screen.getByRole('button', { name: /Đã hết lượt gửi hôm nay/i });
    expect(quotaButton).toBeDisabled();
  });

  it('navigates to messaging tab and allows copying message', async () => {
    vi.mocked(bookingConfirmationApi.getConfirmationData).mockResolvedValue(mockConfirmationData);
    vi.mocked(bookingConfirmationApi.sendConfirmation).mockResolvedValue({
      id: 4,
      bookingId: 101,
      channel: 'MESSAGING_APP',
      channelDisplayName: 'Kênh tin nhắn (Zalo/SMS)',
      status: 'SUCCESS',
      sentAt: '2026-09-16T09:35:00'
    });

    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true
    });

    render(
      <ToastProvider>
        <BookingConfirmationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingId={101}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    // Switch to Messaging tab
    const messagingTabButton = screen.getByRole('button', { name: /Tin nhắn Zalo/i });
    fireEvent.click(messagingTabButton);

    expect(screen.getByText(/Soạn sẵn nội dung tin nhắn/i)).toBeInTheDocument();
    const copyButton = screen.getByRole('button', { name: /Sao chép nội dung tin nhắn/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
