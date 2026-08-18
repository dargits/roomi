import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicBookingDetailPage from '../PublicBookingDetailPage';
import publicBookingApi from '../../../services/publicBookingApi';
import { ToastProvider } from '../../../context/ToastContext';
import { AppConfigProvider } from '../../../context/AppConfigContext';

// Mock publicBookingApi
vi.mock('../../../services/publicBookingApi', () => ({
  default: {
    getPublicBookingById: vi.fn(),
    getPublicBookingServices: vi.fn(),
    getPublicBookingInvoice: vi.fn(),
    getPublicBookingDeposits: vi.fn(),
  }
}));

const mockBooking = {
  id: 101,
  guestName: 'Nguyễn Văn An',
  guestPhone: '0901234567',
  guestEmail: 'an.nguyen@example.com',
  roomNumber: '201',
  roomTypeName: 'Phòng Tiêu Chuẩn',
  checkInDate: '2026-08-15',
  checkOutDate: '2026-08-16',
  status: 'CHECKED_IN',
  expectedPrice: 1200000,
  actualPrice: 1200000,
  note: 'Cần phòng tầng cao, view thoáng mát'
};

const renderComponent = (initialPath = '/booking-detail/101/info') => {
  return render(
    <AppConfigProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/booking-detail/:bookingId" element={<PublicBookingDetailPage />} />
            <Route path="/booking-detail/:bookingId/:tab" element={<PublicBookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AppConfigProvider>
  );
};

describe('PublicBookingDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders booking info tab correctly', async () => {
    publicBookingApi.getPublicBookingById.mockResolvedValue(mockBooking);

    renderComponent('/booking-detail/101/info');

    await waitFor(() => {
      expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('0901234567').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Phòng Tiêu Chuẩn').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('1. Thông tin chung')).toBeInTheDocument();
    expect(screen.getByText('2. Dịch vụ phụ thu')).toBeInTheDocument();
    expect(screen.getByText('3. Hóa đơn & Thanh toán')).toBeInTheDocument();
    expect(screen.getByText('4. Đặt cọc')).toBeInTheDocument();
  });

  it('renders services tab with extra services list', async () => {
    publicBookingApi.getPublicBookingById.mockResolvedValue(mockBooking);
    publicBookingApi.getPublicBookingServices.mockResolvedValue([
      { id: 1, serviceName: 'Nước suối Aquafina', quantity: 2, unitPrice: 15000, totalPrice: 30000 }
    ]);

    renderComponent('/booking-detail/101/services');

    await waitFor(() => {
      expect(screen.getByText('Nước suối Aquafina')).toBeInTheDocument();
      expect(screen.getAllByText(/30\.000/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders invoice tab with payment status', async () => {
    publicBookingApi.getPublicBookingById.mockResolvedValue(mockBooking);
    publicBookingApi.getPublicBookingInvoice.mockResolvedValue({
      invoice: { id: 1, roomAmount: 1200000, serviceAmount: 30000, discountAmount: 0, totalAmount: 1230000, status: 'PAID' },
      payments: [{ id: 1, amount: 1230000, paymentMethod: 'TRANSFER', createdAt: '2026-08-15T14:00:00' }]
    });

    renderComponent('/booking-detail/101/invoice');

    await waitFor(() => {
      expect(screen.getAllByText(/1\.230\.000/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('ĐÃ HOÀN TẤT')).toBeInTheDocument();
    });
  });
});
