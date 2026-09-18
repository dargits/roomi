import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import ChannelCalendarPage from '../ChannelCalendarPage';
import { channelApi } from '../../../services/channelApi';
import { roomTypeApi } from '../../../services/roomTypeApi';
import { roomApi } from '../../../services/roomApi';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Chủ cơ sở', role: 'OWNER' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../../services/channelApi', () => ({
  channelApi: {
    getAll: vi.fn(),
    getWarningSummary: vi.fn(),
    testConnection: vi.fn(),
    syncAll: vi.fn(),
    syncChannel: vi.fn(),
    toggleActive: vi.fn(),
    refreshToken: vi.fn(),
    delete: vi.fn(),
    getChannelLogs: vi.fn(),
    getLogsWithFilter: vi.fn(),
    getRecentLogs: vi.fn(),
    checkAvailability: vi.fn(),
  },
}));

vi.mock('../../../services/roomTypeApi', () => ({
  roomTypeApi: {
    getAllRoomTypes: vi.fn(),
  },
}));

vi.mock('../../../services/roomApi', () => ({
  roomApi: {
    getAllRooms: vi.fn(),
  },
}));

const mockChannels = [
  {
    id: 1,
    name: 'Airbnb - Deluxe',
    channelCode: 'AIRBNB',
    feedToken: 'token123',
    feedUrl: 'https://stayaway.io.vn/api/public/calendar/feeds/token123.ics',
    externalCalendarUrl: 'https://airbnb.com/ical/123.ics',
    syncIntervalMinutes: 15,
    isActive: true,
    lastSyncedAt: new Date().toISOString(),
    connectionStatus: 'HEALTHY' as const,
    connectionStatusMessage: 'Kết nối ổn định',
    lastBlockedPeriodsCount: 2,
    createdAt: new Date().toISOString(),
    mappings: [],
  },
  {
    id: 2,
    name: 'Booking.com - Standard',
    channelCode: 'BOOKING_COM',
    feedToken: 'token456',
    feedUrl: 'https://stayaway.io.vn/api/public/calendar/feeds/token456.ics',
    externalCalendarUrl: 'https://booking.com/ical/456.ics',
    syncIntervalMinutes: 15,
    isActive: true,
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: 'ERROR',
    lastSyncErrorMessage: 'HTTP 404 Not Found',
    consecutiveFailures: 2,
    connectionStatus: 'DISCONNECTED' as const,
    connectionStatusMessage: 'Mất kết nối: HTTP 404 Not Found',
    lastBlockedPeriodsCount: 0,
    createdAt: new Date().toISOString(),
    mappings: [],
  },
];

const mockWarningSummary = {
  totalChannels: 2,
  activeChannels: 2,
  healthyChannels: 1,
  disconnectedChannels: 1,
  staleChannels: 0,
  pausedChannels: 0,
  syncSuccessRate24h: 50.0,
  totalSyncs24h: 10,
  failedSyncs24h: 5,
  hasWarning: true,
  warningChannels: [mockChannels[1]],
};

describe('ChannelCalendarPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(channelApi.getAll).mockResolvedValue(mockChannels);
    vi.mocked(channelApi.getWarningSummary).mockResolvedValue(mockWarningSummary);
    vi.mocked(roomTypeApi.getAllRoomTypes).mockResolvedValue([]);
    vi.mocked(roomApi.getAllRooms).mockResolvedValue([]);
  });

  it('renders header, warning banner, and channel list with connection statuses', async () => {
    await act(async () => {
      render(<ChannelCalendarPage />);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Quản Lý Kênh Phân Phối & Nhật Ký Đồng Bộ Lịch (OTA Calendar)')
      ).toBeInTheDocument();
    });

    // Warning Banner should be visible because hasWarning is true
    expect(
      screen.getByText(/CẢNH BÁO: PHÁT HIỆN KÊNH OTA MẤT KẾT NỐI HOẶC NGỪNG CẬP NHẬT!/i)
    ).toBeInTheDocument();

    // Check channels displayed
    expect(screen.getByText('Airbnb - Deluxe')).toBeInTheDocument();
    expect(screen.getAllByText('Booking.com - Standard').length).toBeGreaterThanOrEqual(1);

    // Check status badges
    expect(screen.getByText('Kết nối tốt')).toBeInTheDocument();
    expect(screen.getByText('Mất kết nối')).toBeInTheDocument();
  });
});
