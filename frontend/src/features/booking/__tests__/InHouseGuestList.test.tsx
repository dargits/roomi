import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InHouseGuestList from '../InHouseGuestList';
import inHouseGuestApi from '../../../services/inHouseGuestApi';
import { AuthProvider } from '../../../context/AuthContext';
import { ToastProvider } from '../../../context/ToastContext';

vi.mock('../../../services/inHouseGuestApi', () => ({
  default: {
    getInHouseGuests: vi.fn(),
    getFilterOptions: vi.fn(),
    getSummary: vi.fn()
  }
}));

const mockInHouseGuests = [
  {
    bookingId: 101,
    roomId: 1,
    roomNumber: '201',
    floor: '2',
    roomTypeId: 1,
    roomTypeName: 'Deluxe King',
    primaryGuestId: 5,
    primaryGuestName: 'Lê Ngọc Hân',
    guestPhone: '0988123456',
    occupantCount: 2,
    checkInDate: '2026-09-14',
    expectedCheckOutDate: '2026-09-15',
    checkingOutToday: true,
    roomAmount: 1200000,
    serviceAmount: 150000,
    incurredAmount: 1350000,
    paidAmount: 500000,
    remainingAmount: 850000,
    hasDebt: true,
    paymentStatus: 'PARTIALLY_PAID',
    specialRequests: 'Thêm gối mềm'
  },
  {
    bookingId: 102,
    roomId: 2,
    roomNumber: '305',
    floor: '3',
    roomTypeId: 2,
    roomTypeName: 'Standard Twin',
    primaryGuestId: 6,
    primaryGuestName: 'Trần Văn Ba',
    guestPhone: '0912987654',
    occupantCount: 1,
    checkInDate: '2026-09-13',
    expectedCheckOutDate: '2026-09-18',
    checkingOutToday: false,
    roomAmount: 2000000,
    serviceAmount: 0,
    incurredAmount: 2000000,
    paidAmount: 2000000,
    remainingAmount: 0,
    hasDebt: false,
    paymentStatus: 'PAID',
    specialRequests: null
  }
];

const mockFilterOptions = {
  floors: ['1', '2', '3'],
  roomTypes: [
    { id: 1, name: 'Deluxe King' },
    { id: 2, name: 'Standard Twin' }
  ]
};

const mockSummary = {
  totalRooms: 2,
  totalOccupants: 3,
  checkoutTodayCount: 1,
  debtCount: 1,
  totalDebtAmount: 850000
};

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <InHouseGuestList />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('InHouseGuestList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inHouseGuestApi.getFilterOptions).mockResolvedValue(mockFilterOptions);
    vi.mocked(inHouseGuestApi.getSummary).mockResolvedValue(mockSummary);
  });

  it('renders summary cards and guest list correctly', async () => {
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue(mockInHouseGuests);

    renderComponent();

    // Check loading initially
    expect(screen.getByText(/Đang tải danh sách khách đang lưu trú/i)).toBeInTheDocument();

    // Check data rendered
    await waitFor(() => {
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Ba')).toBeInTheDocument();
      expect(screen.getByText('201')).toBeInTheDocument();
      expect(screen.getByText('305')).toBeInTheDocument();
      expect(screen.getAllByText('Deluxe King').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Standard Twin').length).toBeGreaterThanOrEqual(1);
    });

    // Check debt and paid status
    expect(screen.getByText(/Còn nợ 850\.000/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã thanh toán/i)).toBeInTheDocument();

    // Check special request
    expect(screen.getByText('Thêm gối mềm')).toBeInTheDocument();
  });

  it('calls API with search term correctly', async () => {
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue(mockInHouseGuests);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
    });

    // Search for 305
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue([mockInHouseGuests[1]]);
    const searchInput = screen.getByPlaceholderText(/Tìm theo số phòng, tên khách/i);
    fireEvent.change(searchInput, { target: { value: '305' } });

    await waitFor(() => {
      expect(inHouseGuestApi.getInHouseGuests).toHaveBeenCalledWith(
        expect.objectContaining({ search: '305' })
      );
    });
  });

  it('calls API with checking out today correctly', async () => {
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue(mockInHouseGuests);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
    });

    // Toggle "Trả phòng hôm nay" button
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue([mockInHouseGuests[0]]);
    const todayBtn = screen.getByRole('button', { name: /Trả phòng hôm nay/i });
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(inHouseGuestApi.getInHouseGuests).toHaveBeenCalledWith(
        expect.objectContaining({ checkingOutToday: true })
      );
    });
  });

  it('calls API with floor filter correctly', async () => {
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue(mockInHouseGuests);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lê Ngọc Hân')).toBeInTheDocument();
    });

    // Find Floor select
    const floorSelect = screen.getByDisplayValue('Tất cả tầng');
    vi.mocked(inHouseGuestApi.getInHouseGuests).mockResolvedValue([mockInHouseGuests[0]]);
    fireEvent.change(floorSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(inHouseGuestApi.getInHouseGuests).toHaveBeenCalledWith(
        expect.objectContaining({ floor: '2' })
      );
    });
  });
});

