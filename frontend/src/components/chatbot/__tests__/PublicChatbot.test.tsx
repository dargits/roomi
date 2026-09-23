import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PublicChatbot from '../PublicChatbot';
import { AppConfigProvider } from '../../../context/AppConfigContext';

// Mock APIs
vi.mock('../../../services/roomTypeApi', () => ({
  default: {
    getPublicRoomTypes: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Phòng Tiêu Chuẩn',
        standardCapacity: 2,
        maxCapacity: 2,
        basePrice: 500000,
        currentPrice: 500000,
        amenitiesDescription: 'Tivi, Điều hòa',
        imageUrls: ['https://example.com/standard.jpg'],
        active: true
      },
      {
        id: 2,
        name: 'Phòng Gia Đình VIP',
        standardCapacity: 2,
        maxCapacity: 4,
        basePrice: 1200000,
        currentPrice: 1200000,
        amenitiesDescription: 'Ban công, Bồn tắm',
        imageUrls: ['https://example.com/family.jpg'],
        active: true
      }
    ])
  }
}));

vi.mock('../../../services/extraServiceApi', () => ({
  default: {
    getPublicServices: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Ăn sáng buffet',
        unit: 'lượt',
        unitPrice: 150000,
        description: 'Buffet Á - Âu',
        active: true
      },
      {
        id: 2,
        name: 'Thuê xe máy tự lái',
        unit: 'ngày',
        unitPrice: 120000,
        description: 'Xe tay ga đời mới',
        active: true
      }
    ])
  }
}));

vi.mock('../../../services/hotelSettingApi', () => ({
  default: {
    getPublicSetting: vi.fn().mockResolvedValue({
      propertyName: 'STAY AWAY LUXURY',
      address: 'Z115, Phan Đình Phùng, Thái Nguyên',
      phone: '0365224245',
      email: 'lienhe@stayaway.vn',
      defaultCheckinTime: '14:00',
      defaultCheckoutTime: '12:00'
    })
  }
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const renderChatbot = (props: { onOpenLookup?: () => void } = {}) => {
  return render(
    <BrowserRouter>
      <AppConfigProvider>
        <PublicChatbot {...props} />
      </AppConfigProvider>
    </BrowserRouter>
  );
};

describe('PublicChatbot component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the floating action button (FAB)', () => {
    renderChatbot();
    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    expect(fab).toBeInTheDocument();
  });

  it('opens popup when clicking the FAB and shows welcome message', async () => {
    renderChatbot();
    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText('StayBot Concierge')).toBeInTheDocument();
    });
    expect(screen.getByText(/Trợ lý hỗ trợ đặt phòng trực tuyến/)).toBeInTheDocument();
    expect(screen.getByText('🛏️ Gợi ý phòng nghỉ')).toBeInTheDocument();
  });

  it('handles sending a message and renders bot response with typing delay', async () => {
    vi.useFakeTimers();
    renderChatbot();

    // Open chat
    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    fireEvent.click(fab);

    const input = screen.getByPlaceholderText(/Nhập câu hỏi/);
    fireEvent.change(input, { target: { value: 'mấy giờ nhận phòng' } });

    const sendBtn = screen.getByTitle('Gửi câu hỏi');
    fireEvent.click(sendBtn);

    // User message immediately visible
    expect(screen.getByText('mấy giờ nhận phòng')).toBeInTheDocument();

    // Fast-forward bot typing delay
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText(/Quy định Giờ Nhận & Trả phòng/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('triggers onOpenLookup callback when clicking lookup button', async () => {
    const handleOpenLookup = vi.fn();
    renderChatbot({ onOpenLookup: handleOpenLookup });

    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    fireEvent.click(fab);

    const lookupBtn = screen.getByText('Tra cứu đơn');
    fireEvent.click(lookupBtn);

    expect(handleOpenLookup).toHaveBeenCalledTimes(1);
  });

  it('resets conversation when clicking reset button', async () => {
    renderChatbot();
    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    fireEvent.click(fab);

    const resetBtn = screen.getByTitle('Làm mới cuộc trò chuyện');
    fireEvent.click(resetBtn);

    expect(screen.getByText(/Trợ lý hỗ trợ đặt phòng trực tuyến/)).toBeInTheDocument();
  });

  it('closes popup when clicking close button in header', async () => {
    renderChatbot();
    const fab = screen.getByTitle('Mở trợ lý tư vấn trực tuyến');
    fireEvent.click(fab);

    expect(screen.getByText('StayBot Concierge')).toBeInTheDocument();

    const closeBtn = screen.getByTitle('Thu nhỏ');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('StayBot Concierge')).not.toBeInTheDocument();
  });
});
