import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PeriodComparisonReport from '../PeriodComparisonReport';
import reportApi from '../../../services/reportApi';

// Mock reportApi
vi.mock('../../../services/reportApi', () => ({
  default: {
    getPeriodComparison: vi.fn(),
    exportPeriodComparison: vi.fn()
  }
}));

const mockReportData = {
  currentPeriod: {
    label: 'Tháng 09/2026',
    from: '2026-09-01',
    to: '2026-09-30',
    days: 30
  },
  previousPeriod: {
    label: 'Tháng 08/2026',
    from: '2026-08-01',
    to: '2026-08-31',
    days: 31
  },
  samePeriodLastYear: {
    label: 'Cùng kỳ năm 2025',
    from: '2025-09-01',
    to: '2025-09-30',
    days: 30
  },
  currentMetrics: {
    roomRevenue: 25000000,
    penaltyRevenue: 1000000,
    totalRevenue: 26000000,
    collectedRevenue: 24000000,
    debtRevenue: 1000000,
    totalBookings: 15,
    soldRoomNights: 45,
    availableRoomNights: 60,
    occupancyRate: 75.0,
    adr: 555556,
    revpar: 416667
  },
  previousMetrics: {
    roomRevenue: 20000000,
    penaltyRevenue: 500000,
    totalRevenue: 20500000,
    collectedRevenue: 19000000,
    debtRevenue: 1000000,
    totalBookings: 12,
    soldRoomNights: 35,
    availableRoomNights: 62,
    occupancyRate: 56.45,
    adr: 571429,
    revpar: 322581
  },
  samePeriodLastYearMetrics: {
    roomRevenue: 15000000,
    penaltyRevenue: 0,
    totalRevenue: 15000000,
    collectedRevenue: 15000000,
    debtRevenue: 0,
    totalBookings: 10,
    soldRoomNights: 30,
    availableRoomNights: 60,
    occupancyRate: 50.0,
    adr: 500000,
    revpar: 250000
  },
  popComparison: {
    totalRevenueDiff: 5500000,
    totalRevenueGrowthRate: 26.83,
    roomRevenueDiff: 5000000,
    roomRevenueGrowthRate: 25.0,
    occupancyRateDiff: 18.55,
    occupancyGrowthRate: 32.86,
    adrDiff: -15873,
    adrGrowthRate: -2.78,
    revparDiff: 94086,
    revparGrowthRate: 29.17,
    soldNightsDiff: 10,
    soldNightsGrowthRate: 28.57,
    bookingsDiff: 3,
    bookingsGrowthRate: 25.0
  },
  yoyComparison: {
    totalRevenueDiff: 11000000,
    totalRevenueGrowthRate: 73.33,
    roomRevenueDiff: 10000000,
    roomRevenueGrowthRate: 66.67,
    occupancyRateDiff: 25.0,
    occupancyGrowthRate: 50.0,
    adrDiff: 55556,
    adrGrowthRate: 11.11,
    revparDiff: 166667,
    revparGrowthRate: 66.67,
    soldNightsDiff: 15,
    soldNightsGrowthRate: 50.0,
    bookingsDiff: 5,
    bookingsGrowthRate: 50.0
  },
  timeline: [
    {
      dayIndex: 1,
      currentDate: '2026-09-01',
      currentRevenue: 1000000,
      currentOccupancyRate: 80.0,
      previousDate: '2026-08-01',
      previousRevenue: 800000,
      previousOccupancyRate: 60.0,
      samePeriodLastYearDate: '2025-09-01',
      samePeriodLastYearRevenue: 500000,
      samePeriodLastYearOccupancyRate: 40.0
    }
  ],
  roomTypes: [
    {
      roomTypeId: 1,
      roomTypeName: 'Deluxe Double',
      basePrice: 800000,
      totalRooms: 1,
      currentRevenue: 16000000,
      currentSoldNights: 20,
      currentOccupancyRate: 66.7,
      currentAdr: 800000,
      currentRevpar: 533333,
      currentBookings: 8,
      previousRevenue: 12000000,
      previousSoldNights: 15,
      previousOccupancyRate: 48.4,
      previousAdr: 800000,
      previousRevpar: 387097,
      previousBookings: 6,
      popRevenueGrowth: 33.33,
      popOccupancyDiff: 18.3,
      yoyRevenue: 8000000,
      yoySoldNights: 10,
      yoyOccupancyRate: 33.3,
      yoyAdr: 800000,
      yoyRevpar: 266667,
      yoyBookings: 4,
      yoyRevenueGrowth: 100.0,
      yoyOccupancyDiff: 33.4
    }
  ],
  executiveInsights: [
    'Tổng doanh thu tháng 09/2026 đạt 26,000,000 đ, tăng trưởng +26.8% (+5,500,000 đ) so với kỳ liền trước.',
    'Công suất phòng đạt 75.0% (+18.6 điểm % so với kỳ trước).'
  ]
};

describe('PeriodComparisonReport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (reportApi.getPeriodComparison as any).mockResolvedValue(mockReportData);
  });

  it('renders report data with executive KPI cards and comparison badges correctly', async () => {
    render(<PeriodComparisonReport />);

    await waitFor(() => {
      expect(reportApi.getPeriodComparison).toHaveBeenCalled();
    });

    // Check header / banner info
    expect(screen.getAllByText(/Tháng 09\/2026/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tháng 08\/2026/i).length).toBeGreaterThan(0);

    // Check Executive KPI Values
    expect(screen.getAllByText(/26\.000\.000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/75\.0%/i).length).toBeGreaterThan(0);

    // Check Delta badges
    expect(screen.getAllByText(/\+26\.8%/i).length).toBeGreaterThan(0);

    // Check Executive Insights Box
    expect(screen.getByText(/Đánh giá & Nhận định kinh doanh tự động/i)).toBeInTheDocument();
    expect(screen.getByText(/Tổng doanh thu tháng 09\/2026 đạt 26,000,000 đ/i)).toBeInTheDocument();

    // Check Room Type Matrix
    expect(screen.getByText('Deluxe Double')).toBeInTheDocument();
    expect(screen.getByText('16.000.000 ₫')).toBeInTheDocument();
  });

  it('switches period preset when clicking preset buttons', async () => {
    render(<PeriodComparisonReport />);

    await waitFor(() => {
      expect(reportApi.getPeriodComparison).toHaveBeenCalledTimes(1);
    });

    const lastMonthBtn = screen.getByRole('button', { name: 'Tháng trước' });
    fireEvent.click(lastMonthBtn);

    await waitFor(() => {
      expect(reportApi.getPeriodComparison).toHaveBeenCalledTimes(2);
    });
  });

  it('triggers CSV export when clicking export button', async () => {
    const mockBlob = new Blob(['sample csv'], { type: 'text/csv' });
    (reportApi.exportPeriodComparison as any).mockResolvedValue(mockBlob);

    // Mock URL methods
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/1234');
    window.URL.revokeObjectURL = vi.fn();

    render(<PeriodComparisonReport />);

    await waitFor(() => {
      expect(reportApi.getPeriodComparison).toHaveBeenCalled();
    });

    const exportBtn = screen.getByRole('button', { name: /Xuất CSV \/ Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(reportApi.exportPeriodComparison).toHaveBeenCalled();
    });
  });
});
