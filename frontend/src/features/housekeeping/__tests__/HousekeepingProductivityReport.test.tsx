import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HousekeepingProductivityReport from '../HousekeepingProductivityReport';
import { housekeepingProductivityApi } from '../../../services/housekeepingProductivityApi';

// Mock contexts
const mockUser = {
  id: 1,
  name: 'Chủ cơ sở Mai',
  role: 'OWNER',
  email: 'owner@roomi.vn'
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true
  })
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => mockToast
}));

// Mock API
vi.mock('../../../services/housekeepingProductivityApi', () => ({
  housekeepingProductivityApi: {
    getProductivityReport: vi.fn(),
    getCleaningStandards: vi.fn(),
    updateCleaningStandards: vi.fn()
  }
}));

const mockStandards = [
  {
    roomTypeId: 1,
    roomTypeName: 'Phòng Deluxe Đơn',
    standardCheckoutCleaningMinutes: 45,
    standardPeriodicCleaningMinutes: 20
  },
  {
    roomTypeId: 2,
    roomTypeName: 'Phòng Suite Gia Đình',
    standardCheckoutCleaningMinutes: 60,
    standardPeriodicCleaningMinutes: 30
  }
];

const mockReportData = {
  period: 'DAY',
  startDate: '2026-09-22',
  endDate: '2026-09-22',
  totalRoomsCleaned: 5,
  facilityAverageDurationMinutes: 38.5,
  facilityStandardDurationAverage: 45.0,
  totalInterruptedOrIncidentRooms: 2,
  totalRejectedInspections: 1,
  totalIncidentsReported: 1,
  isSingleStaffView: false,
  housekeeperStats: [
    {
      housekeeperId: 10,
      housekeeperName: 'Nguyễn Thị Hoa',
      housekeeperPhone: '0912345678',
      totalRoomsCleaned: 3,
      completedNormalRoomsCount: 2,
      interruptedOrIncidentRoomsCount: 1,
      averageDurationMinutes: 35.0,
      targetStandardMinutesAverage: 45.0,
      rejectedInspectionCount: 0,
      incidentReportedCount: 1,
      checkoutRoomsCleaned: 2,
      periodicRoomsCleaned: 1
    },
    {
      housekeeperId: 11,
      housekeeperName: 'Trần Văn Bình',
      housekeeperPhone: '0987654321',
      totalRoomsCleaned: 2,
      completedNormalRoomsCount: 1,
      interruptedOrIncidentRoomsCount: 1,
      averageDurationMinutes: 42.0,
      targetStandardMinutesAverage: 45.0,
      rejectedInspectionCount: 1,
      incidentReportedCount: 0,
      checkoutRoomsCleaned: 2,
      periodicRoomsCleaned: 0
    }
  ],
  records: [
    {
      id: 101,
      roomId: 1,
      roomNumber: '101',
      roomTypeId: 1,
      roomTypeName: 'Phòng Deluxe Đơn',
      housekeeperId: 10,
      housekeeperName: 'Nguyễn Thị Hoa',
      cleaningType: 'CHECKOUT',
      startedAt: '2026-09-22T08:00:00Z',
      completedAt: '2026-09-22T08:35:00Z',
      actualDurationMinutes: 35,
      standardDurationMinutes: 45,
      status: 'APPROVED',
      isInterrupted: false,
      hasIncident: false,
      incidentCount: 0,
      rejectionCount: 0,
      isExcludedFromAverage: false
    },
    {
      id: 102,
      roomId: 2,
      roomNumber: '102',
      roomTypeId: 1,
      roomTypeName: 'Phòng Deluxe Đơn',
      housekeeperId: 10,
      housekeeperName: 'Nguyễn Thị Hoa',
      cleaningType: 'CHECKOUT',
      startedAt: '2026-09-22T09:00:00Z',
      completedAt: '2026-09-22T10:15:00Z',
      actualDurationMinutes: 75,
      standardDurationMinutes: 45,
      status: 'APPROVED',
      isInterrupted: true,
      interruptionReason: 'Thiếu đồ vải, khăn',
      hasIncident: false,
      incidentCount: 0,
      rejectionCount: 0,
      isExcludedFromAverage: true
    }
  ],
  standards: mockStandards
};

describe('HousekeepingProductivityReport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (housekeepingProductivityApi.getProductivityReport as any).mockResolvedValue(mockReportData);
    (housekeepingProductivityApi.getCleaningStandards as any).mockResolvedValue(mockStandards);
  });

  it('renders ethics banner, KPI summary cards, and staff productivity stats', async () => {
    render(<HousekeepingProductivityReport />);

    // Assert ethics principle banner
    expect(screen.getByText(/Minh bạch • Không phán xét/i)).toBeInTheDocument();
    expect(screen.getByText(/không tự động xếp hạng hay đánh giá con người/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(housekeepingProductivityApi.getProductivityReport).toHaveBeenCalled();
      expect(housekeepingProductivityApi.getCleaningStandards).toHaveBeenCalled();
    });

    // Assert KPI cards
    expect(screen.getByText('5')).toBeInTheDocument(); // total rooms
    expect(screen.getByText('38.5')).toBeInTheDocument(); // average minutes
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // excluded rooms & staff count
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // rejected inspections

    // Assert staff table
    expect(screen.getAllByText('Nguyễn Thị Hoa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trần Văn Bình').length).toBeGreaterThan(0);
    expect(screen.getAllByText('35 phút').length).toBeGreaterThan(0);
  });

  it('allows owner to edit and save cleaning standards for room types', async () => {
    (housekeepingProductivityApi.updateCleaningStandards as any).mockResolvedValue(mockStandards);

    render(<HousekeepingProductivityReport />);

    await waitFor(() => {
      expect(screen.getAllByText('Phòng Deluxe Đơn').length).toBeGreaterThan(0);
    });

    // Click edit button for Deluxe room
    const editBtns = screen.getAllByText('Sửa định mức');
    fireEvent.click(editBtns[0]);

    // Save standard
    const saveBtn = screen.getByText('Lưu');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(housekeepingProductivityApi.updateCleaningStandards).toHaveBeenCalledWith({
        standards: [
          {
            roomTypeId: 1,
            standardCheckoutCleaningMinutes: 45,
            standardPeriodicCleaningMinutes: 20
          }
        ]
      });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('thành công'));
    });
  });

  it('renders detailed cleaning log with exclusion flags for interrupted rooms', async () => {
    render(<HousekeepingProductivityReport />);

    await waitFor(() => {
      expect(screen.getByText('Phòng 101')).toBeInTheDocument();
      expect(screen.getByText('Phòng 102')).toBeInTheDocument();
    });

    // Room 101 is valid for average
    expect(screen.getByText('Hợp lệ tính TB')).toBeInTheDocument();

    // Room 102 was interrupted
    expect(screen.getByText('Loại trừ khỏi TB')).toBeInTheDocument();
    expect(screen.getByText(/Thiếu đồ vải, khăn/i)).toBeInTheDocument();
  });
});
