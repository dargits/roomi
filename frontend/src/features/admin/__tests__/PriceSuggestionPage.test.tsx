import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import PriceSuggestionPage from '../PriceSuggestionPage';
import priceSuggestionApi from '../../../services/priceSuggestionApi';
import { PriceSuggestionResponse } from '../../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, account: 'chusohuu', name: 'Trần Thị Mai', role: 'OWNER' },
    isAuthenticated: true,
  }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    toastSuccess: mockToastSuccess,
    toastError: mockToastError,
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock('../../../services/priceSuggestionApi', () => ({
  default: {
    getSuggestions: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    dismissSuggestion: vi.fn(),
    restoreSuggestion: vi.fn(),
  },
}));

const mockSuggestionData: PriceSuggestionResponse = {
  suggestions: [
    {
      targetDate: '2026-10-05',
      dayOfWeek: 'Thứ Hai',
      daysRemaining: 13,
      totalRooms: 10,
      occupiedRooms: 9,
      vacantRooms: 1,
      currentOccupancyRate: 90.0,
      referenceOccupancyRate: 85.0,
      highThreshold: 80.0,
      lowThreshold: 30.0,
      imminentDaysThreshold: 7,
      suggestionType: 'INCREASE_PRICE',
      suggestionTitle: 'Cân nhắc tăng giá',
      recommendation: 'Mức lấp đầy đạt 90.0% (vượt ngưỡng cấu hình 80.0%). Còn trống 1 phòng, còn 13 ngày tới ngày đón khách. Cân nhắc tăng giá phòng.',
      confidenceLevel: 'HIGH',
      confidenceNote: 'Dữ liệu quá khứ đầy đủ >= 1 năm, tham chiếu cùng kỳ năm trước đạt 85.0%.',
      dismissed: false,
      roomTypeBreakdown: [
        {
          roomTypeId: 1,
          roomTypeName: 'Phòng Deluxe',
          totalRooms: 5,
          occupiedRooms: 5,
          vacantRooms: 0,
          basePrice: 1200000
        },
        {
          roomTypeId: 2,
          roomTypeName: 'Phòng Standard',
          totalRooms: 5,
          occupiedRooms: 4,
          vacantRooms: 1,
          basePrice: 800000
        }
      ]
    },
    {
      targetDate: '2026-09-25',
      dayOfWeek: 'Thứ Sáu',
      daysRemaining: 3,
      totalRooms: 10,
      occupiedRooms: 2,
      vacantRooms: 8,
      currentOccupancyRate: 20.0,
      referenceOccupancyRate: null,
      highThreshold: 80.0,
      lowThreshold: 30.0,
      imminentDaysThreshold: 7,
      suggestionType: 'DECREASE_PRICE_OR_CHANNELS',
      suggestionTitle: 'Cân nhắc giảm giá hoặc mở bán thêm kênh',
      recommendation: 'Chỉ còn 3 ngày nữa nhưng mức lấp đầy mới đạt 20.0% (dưới ngưỡng 30.0%), còn trống 8/10 phòng. Cân nhắc giảm giá kích cầu.',
      confidenceLevel: 'LOW',
      confidenceNote: 'Dữ liệu quá khứ chưa đủ 1 năm (2.5 tháng), hệ thống chỉ dùng ngưỡng cấu hình làm tham chiếu và ghi chú mức tin cậy thấp.',
      dismissed: false,
      roomTypeBreakdown: [
        {
          roomTypeId: 1,
          roomTypeName: 'Phòng Deluxe',
          totalRooms: 5,
          occupiedRooms: 1,
          vacantRooms: 4,
          basePrice: 1200000
        }
      ]
    },
    {
      targetDate: '2026-09-28',
      dayOfWeek: 'Thứ Hai',
      daysRemaining: 6,
      totalRooms: 10,
      occupiedRooms: 1,
      vacantRooms: 9,
      currentOccupancyRate: 10.0,
      referenceOccupancyRate: null,
      highThreshold: 80.0,
      lowThreshold: 30.0,
      imminentDaysThreshold: 7,
      suggestionType: 'DECREASE_PRICE_OR_CHANNELS',
      suggestionTitle: 'Cân nhắc giảm giá hoặc mở bán thêm kênh',
      recommendation: 'Đã bị bỏ qua trước đó.',
      confidenceLevel: 'LOW',
      confidenceNote: 'Dữ liệu quá khứ chưa đủ 1 năm.',
      dismissed: true,
      roomTypeBreakdown: []
    }
  ],
  hasMinimumData: true,
  dataMonthsCount: 4.5,
  earliestBookingDate: '2026-05-01',
  hasFullYearData: false,
  configured: true,
  highOccupancyThreshold: 80.0,
  lowOccupancyThreshold: 30.0,
  imminentDaysThreshold: 7,
  totalRooms: 10,
  totalSuggestionsCount: 3,
  increaseCount: 1,
  decreaseCount: 2,
  dismissedCount: 1
};

describe('PriceSuggestionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (priceSuggestionApi.getSuggestions as any).mockResolvedValue(mockSuggestionData);
  });

  it('renders page header, safety guarantee, and preconditions bar correctly', async () => {
    render(<PriceSuggestionPage />);

    // Header & Guarantee
    expect(await screen.findByText('Gợi ý điều chỉnh giá theo công suất dự báo')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống hỗ trợ gợi ý có kiểm soát — Tuyệt đối không tự động đổi giá/i)).toBeInTheDocument();

    // Tiền điều kiện: Dữ liệu công suất & Độ tin cậy
    expect(screen.getByText('Đủ điều kiện (≥ 3 tháng)')).toBeInTheDocument();
    expect(screen.getByText('Mức tin cậy Thấp')).toBeInTheDocument();

    // Ngưỡng cấu hình
    expect(screen.getByText('≥ 80%')).toBeInTheDocument();
    expect(screen.getByText('≤ 30%')).toBeInTheDocument();
  });

  it('renders suggestions list with clear grounds and metrics', async () => {
    render(<PriceSuggestionPage />);

    // Chờ tải xong dữ liệu
    expect(await screen.findByText(/Cân nhắc tăng giá/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cân nhắc giảm giá/i).length).toBeGreaterThan(0);

    // Kiểm tra căn cứ minh bạch (Mức lấp đầy & số phòng còn trống)
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('1 phòng')).toBeInTheDocument();
    expect(screen.getByText('8 phòng')).toBeInTheDocument();

    // Kiểm tra số ngày còn lại
    expect(screen.getByText('Còn 13 ngày')).toBeInTheDocument();
    expect(screen.getByText('Còn 3 ngày')).toBeInTheDocument();

    // Nút hành động
    expect(screen.getAllByText('Xem & Điều chỉnh giá').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Bỏ qua$/ }).length).toBeGreaterThan(0);
  });

  it('filters by tabs correctly (increase, decrease, dismissed)', async () => {
    render(<PriceSuggestionPage />);

    await screen.findByText('Gợi ý điều chỉnh giá theo công suất dự báo');

    // Chuyển sang Tab "Nên tăng giá"
    const increaseTab = screen.getByRole('button', { name: /Nên tăng giá/i });
    fireEvent.click(increaseTab);

    // Chỉ có ngày tăng giá hiển thị
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.queryByText('20%')).not.toBeInTheDocument();

    // Chuyển sang Tab "Đã bỏ qua"
    const dismissedTab = screen.getByRole('button', { name: /Đã bỏ qua/i });
    fireEvent.click(dismissedTab);

    // Ngày đã bỏ qua hiển thị nút "Khôi phục gợi ý"
    expect(await screen.findByText('Khôi phục gợi ý')).toBeInTheDocument();
  });

  it('opens dismiss modal and confirms dismissal', async () => {
    (priceSuggestionApi.dismissSuggestion as any).mockResolvedValue({ message: 'Thành công' });

    render(<PriceSuggestionPage />);

    await screen.findByText('Gợi ý điều chỉnh giá theo công suất dự báo');

    // Bấm nút "Bỏ qua" đầu tiên (dùng exact regex để không dính tab "Đã bỏ qua")
    const dismissBtns = screen.getAllByRole('button', { name: /^Bỏ qua$/ });
    fireEvent.click(dismissBtns[0]);

    // Modal xác nhận xuất hiện
    expect(await screen.findByText(/Xác nhận bỏ qua gợi ý/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn có chắc chắn muốn bỏ qua gợi ý điều chỉnh giá cho ngày/i)).toBeInTheDocument();

    // Bấm nút "Xác nhận bỏ qua" trong modal
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận bỏ qua/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(priceSuggestionApi.dismissSuggestion).toHaveBeenCalledWith('2026-10-05');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('navigates to room types pricing configuration when clicking action button', async () => {
    render(<PriceSuggestionPage />);

    await screen.findByText('Gợi ý điều chỉnh giá theo công suất dự báo');

    const configPriceBtns = screen.getAllByRole('button', { name: /Xem & Điều chỉnh giá/i });
    fireEvent.click(configPriceBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/manage/room-types');
  });

  it('opens configuration modal and saves new thresholds', async () => {
    (priceSuggestionApi.updateConfig as any).mockResolvedValue({
      highOccupancyThreshold: 85,
      lowOccupancyThreshold: 25,
      imminentDaysThreshold: 5,
      configured: true,
      hasMinimumData: true,
      dataMonthsCount: 4.5,
      earliestBookingDate: '2026-05-01',
      hasFullYearData: false,
    });

    render(<PriceSuggestionPage />);

    await screen.findByText('Gợi ý điều chỉnh giá theo công suất dự báo');

    // Bấm mở modal cấu hình ngưỡng
    const configBtn = screen.getByRole('button', { name: /Cấu hình ngưỡng/i });
    fireEvent.click(configBtn);

    expect(screen.getByText('Cấu hình ngưỡng gợi ý điều chỉnh giá')).toBeInTheDocument();

    // Bấm "Lưu cấu hình"
    const saveBtn = screen.getByRole('button', { name: /Lưu cấu hình/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(priceSuggestionApi.updateConfig).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Đã cập nhật cấu hình ngưỡng lấp đầy thành công.');
    });
  });
});
