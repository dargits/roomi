import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BookingInvoiceTab from '../BookingInvoiceTab';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' },
  }),
}));

// Mock invoiceApi
vi.mock('../../../services/invoiceApi', () => {
  const mockApi = {
    getInvoiceByBooking: vi.fn().mockResolvedValue({
      id: 1,
      bookingId: 10,
      roomAmount: 1000000,
      serviceAmount: 200000,
      discountAmount: 0,
      totalAmount: 1200000,
      status: 'PAID',
    }),
    getPayments: vi.fn().mockResolvedValue([
      { id: 1, amount: 1200000, method: 'CASH', paidAt: '2026-08-16T10:00:00', collectedBy: 'Lê Ngọc Hân' }
    ]),
    createInvoice: vi.fn().mockResolvedValue({}),
    recordPayment: vi.fn().mockResolvedValue({}),
  };
  return {
    default: mockApi,
    invoiceApi: mockApi,
  };
});

// Mock depositApi
vi.mock('../../../services/depositApi', () => {
  const mockApi = {
    getDepositsByBooking: vi.fn().mockResolvedValue([]),
  };
  return {
    default: mockApi,
    depositApi: mockApi,
  };
});

// Mock bookingApi
vi.mock('../../../services/bookingApi', () => {
  const mockApi = {
    getBookingServices: vi.fn().mockResolvedValue([]),
    getServiceUsages: vi.fn().mockResolvedValue([]),
  };
  return {
    default: mockApi,
    bookingApi: mockApi,
  };
});

describe('BookingInvoiceTab Component', () => {
  it('renders invoice details and paid status', async () => {
    const mockBooking = {
      id: 10,
      expectedPrice: 1000000,
      actualPrice: 1200000,
      status: 'CHECKED_IN',
    };

    render(
      <BookingInvoiceTab 
        bookingId={10} 
        status="CHECKED_IN" 
        booking={mockBooking} 
        onPrintInvoice={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Đã thanh toán đủ')).toBeInTheDocument();
      expect(screen.getByText('In Hóa Đơn')).toBeInTheDocument();
      expect(screen.getByText('Lịch sử Thanh toán')).toBeInTheDocument();
    });
  });
});
