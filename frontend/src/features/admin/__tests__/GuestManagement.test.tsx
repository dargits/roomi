import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import GuestManagement from '../GuestManagement';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' },
  }),
}));

// Mock guestApi
vi.mock('../../../services/guestApi', () => {
  const mockApi = {
    getGuestsPaged: vi.fn().mockResolvedValue({
      content: [
        { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', idNumber: '123456789012', email: 'a@example.com' },
        { id: 2, name: 'Trần Thị B', phone: '0987654321', idNumber: '987654321098', email: 'b@example.com' },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 15,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }),
    searchGuests: vi.fn().mockResolvedValue([
      { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', idNumber: '123456789012', email: 'a@example.com' },
      { id: 2, name: 'Trần Thị B', phone: '0987654321', idNumber: '987654321098', email: 'b@example.com' },
    ]),
    getGuests: vi.fn().mockResolvedValue([
      { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', idNumber: '123456789012', email: 'a@example.com' },
    ]),
    getGuestHistory: vi.fn().mockResolvedValue([
      {
        id: 101,
        bookingId: 101,
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        roomNumber: '103',
        roomTypeName: 'Tiêu Chuẩn',
        status: 'CHECKED_OUT',
      },
    ]),
    getGuestLoyalty: vi.fn().mockResolvedValue({ tier: 'SILVER', points: 100 }),
  };
  return {
    default: mockApi,
    guestApi: mockApi,
  };
});

describe('GuestManagement Component', () => {
  it('renders guest management header and search input', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <GuestManagement />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Quản lý Khách hàng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm tên, SĐT, CCCD...')).toBeInTheDocument();
  });

  it('renders guest list table headers and loaded data', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <GuestManagement />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Tên Khách Hàng')).toBeInTheDocument();
    expect(screen.getByText('Liên Hệ')).toBeInTheDocument();
    expect(screen.getByText('Hạng Thành Viên')).toBeInTheDocument();
    expect(screen.getByText('Thao tác')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });
  });

  it('opens history modal and clicking on a stay history item navigates to invoice details', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <GuestManagement />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    // Bấm nút xem lịch sử lưu trú
    const historyButtons = screen.getAllByTitle('Lịch sử lưu trú');
    expect(historyButtons.length).toBeGreaterThan(0);

    await act(async () => {
      historyButtons[0].click();
    });

    // Kiểm tra modal lịch sử mở ra với thông tin phòng 103
    await waitFor(() => {
      expect(screen.getByText('Lịch sử Lưu trú')).toBeInTheDocument();
      expect(screen.getByText(/Phòng 103/)).toBeInTheDocument();
    });

    // Bấm vào thẻ lịch sử lưu trú (hoặc nút Xem Hóa đơn)
    const invoiceBtn = screen.getByText('Xem Hóa đơn');
    await act(async () => {
      invoiceBtn.click();
    });

    // Xác nhận đã điều hướng sang /manage/bookings/101?tab=invoice
    expect(mockNavigate).toHaveBeenCalledWith('/manage/bookings/101?tab=invoice', {
      state: { from: '/manage/guests' },
    });
  });
});
