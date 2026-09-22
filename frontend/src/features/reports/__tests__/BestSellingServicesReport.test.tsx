import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import BestSellingServicesReport from '../BestSellingServicesReport';
import reportApi from '../../../services/reportApi';

vi.mock('../../../services/reportApi', () => ({
  default: {
    getBestSellingServicesReport: vi.fn(),
    exportBestSellingServicesCsv: vi.fn()
  }
}));

const mockReportData = {
  from: '2026-09-01',
  to: '2026-09-30',
  selectedRoomTypeId: undefined,
  selectedRoomTypeName: undefined,
  summary: {
    totalSurchargeRevenue: 600000,
    catalogServicesRevenue: 450000,
    autoSurchargeRevenue: 150000,
    totalSalesCount: 4,
    totalQuantity: 7,
    totalCatalogServices: 3,
    activeCatalogServices: 3,
    zeroSalesCatalogServices: 1,
    topServiceName: 'Ăn sáng buffet',
    topServiceRevenue: 300000
  },
  catalogServices: [
    {
      serviceId: 10,
      serviceName: 'Ăn sáng buffet',
      unitPrice: 100000,
      unit: 'lượt',
      active: true,
      salesCount: 2,
      totalQuantity: 3,
      revenue: 300000,
      revenueShare: 50.0,
      roomTypeBreakdown: [
        {
          roomTypeId: 1,
          roomTypeName: 'Phòng Tiêu Chuẩn (Standard)',
          salesCount: 1,
          totalQuantity: 2,
          revenue: 200000,
          shareInService: 66.67
        },
        {
          roomTypeId: 2,
          roomTypeName: 'Phòng Deluxe',
          salesCount: 1,
          totalQuantity: 1,
          revenue: 100000,
          shareInService: 33.33
        }
      ]
    },
    {
      serviceId: 20,
      serviceName: 'Giặt là cao cấp',
      unitPrice: 50000,
      unit: 'kg',
      active: true,
      salesCount: 1,
      totalQuantity: 3,
      revenue: 150000,
      revenueShare: 25.0,
      roomTypeBreakdown: []
    },
    {
      serviceId: 30,
      serviceName: 'Đưa đón sân bay',
      unitPrice: 300000,
      unit: 'chuyến',
      active: true,
      salesCount: 0,
      totalQuantity: 0,
      revenue: 0,
      revenueShare: 0.0,
      roomTypeBreakdown: []
    }
  ],
  autoSurcharges: [
    {
      code: 'EXTRA_PERSON',
      name: 'Phụ thu thêm người / ở ghép vượt tiêu chuẩn',
      salesCount: 1,
      totalQuantity: 1,
      revenue: 150000,
      revenueShare: 25.0,
      roomTypeBreakdown: [
        {
          roomTypeId: 1,
          roomTypeName: 'Phòng Tiêu Chuẩn (Standard)',
          salesCount: 1,
          totalQuantity: 1,
          revenue: 150000,
          shareInService: 100.0
        }
      ]
    }
  ],
  roomTypeComparisons: [
    {
      roomTypeId: 1,
      roomTypeName: 'Phòng Tiêu Chuẩn (Standard)',
      totalRevenue: 350000,
      totalQuantity: 3,
      salesCount: 2,
      revenueShare: 58.33,
      topServices: [
        { name: 'Ăn sáng buffet', revenue: 200000, quantity: 2 },
        { name: 'Phụ thu thêm người', revenue: 150000, quantity: 1 }
      ]
    },
    {
      roomTypeId: 2,
      roomTypeName: 'Phòng Deluxe',
      totalRevenue: 250000,
      totalQuantity: 4,
      salesCount: 2,
      revenueShare: 41.67,
      topServices: [
        { name: 'Giặt là cao cấp', revenue: 150000, quantity: 3 },
        { name: 'Ăn sáng buffet', revenue: 100000, quantity: 1 }
      ]
    }
  ]
};

describe('BestSellingServicesReport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (reportApi.getBestSellingServicesReport as any).mockResolvedValue(mockReportData);
  });

  it('renders report KPI cards and catalog services table', async () => {
    render(<BestSellingServicesReport />);

    await waitFor(() => {
      expect(reportApi.getBestSellingServicesReport).toHaveBeenCalled();
    });

    // Check KPI summary
    expect(screen.getByText('Tổng Phụ Thu Kỳ Này')).toBeInTheDocument();
    expect(screen.getByText('Dịch Vụ Khách Chủ Động Mua')).toBeInTheDocument();
    expect(screen.getByText('Phụ Thu Sinh Tự Động')).toBeInTheDocument();
    expect(screen.getByText('Không Ai Dùng (0 Lượt)')).toBeInTheDocument();

    // Check services rendered inside table
    const table = screen.getByRole('table');
    expect(within(table).getByText('Ăn sáng buffet')).toBeInTheDocument();
    expect(within(table).getByText('Giặt là cao cấp')).toBeInTheDocument();
    expect(within(table).getByText('Đưa đón sân bay')).toBeInTheDocument();

    // Check zero-sales badge inside table
    expect(within(table).getByText(/Không ai dùng — Cân nhắc bỏ/i)).toBeInTheDocument();
  });

  it('filters zero-sales services when clicking zero sales filter chip', async () => {
    render(<BestSellingServicesReport />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Click "Không ai dùng (0 lượt)" chip
    const zeroChip = screen.getByRole('button', { name: /Không ai dùng \(0 lượt\)/i });
    fireEvent.click(zeroChip);

    // Inside table: only 'Đưa đón sân bay' should remain
    const table = screen.getByRole('table');
    expect(within(table).getByText('Đưa đón sân bay')).toBeInTheDocument();
    expect(within(table).queryByText('Ăn sáng buffet')).not.toBeInTheDocument();
    expect(within(table).queryByText('Giặt là cao cấp')).not.toBeInTheDocument();
  });

  it('switches to auto surcharges tab and displays auto items', async () => {
    render(<BestSellingServicesReport />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Click tab "Dòng phụ thu sinh tự động"
    const autoTabBtn = screen.getByRole('button', { name: /Dòng phụ thu sinh tự động/i });
    fireEvent.click(autoTabBtn);

    const table = screen.getByRole('table');
    expect(within(table).getByText('EXTRA_PERSON')).toBeInTheDocument();
    expect(within(table).getByText('Phụ thu thêm người / ở ghép vượt tiêu chuẩn')).toBeInTheDocument();
  });

  it('switches to room types comparison tab and displays room type cards', async () => {
    render(<BestSellingServicesReport />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Click tab "So sánh tiêu thụ giữa các loại phòng"
    const roomTypeTabBtn = screen.getByRole('button', { name: /So sánh tiêu thụ giữa các loại phòng/i });
    fireEvent.click(roomTypeTabBtn);

    expect(screen.getAllByText('Phòng Tiêu Chuẩn (Standard)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phòng Deluxe').length).toBeGreaterThan(0);
  });
});
