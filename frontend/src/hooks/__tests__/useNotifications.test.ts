import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { notificationApi } from '../../services/notificationApi';

vi.mock('../../services/notificationApi', () => ({
  notificationApi: {
    getUnreadCount: vi.fn(),
    getLatest5: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn()
  }
}));

describe('useNotifications hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('staygo_token', 'test-token');
  });

  it('should fetch unread count and latest notifications on refetch', async () => {
    (notificationApi.getUnreadCount as any).mockResolvedValue(3);
    (notificationApi.getLatest5 as any).mockResolvedValue([
      { id: 1, title: 'Checkin hôm nay', isRead: false },
      { id: 2, title: 'Hóa đơn giảm giá', isRead: true }
    ]);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.unreadCount).toBe(3);
    expect(result.current.latest.length).toBe(2);
  });

  it('should mark single notification as read', async () => {
    (notificationApi.getUnreadCount as any).mockResolvedValue(2);
    (notificationApi.getLatest5 as any).mockResolvedValue([
      { id: 1, title: 'Thông báo 1', isRead: false },
      { id: 2, title: 'Thông báo 2', isRead: false }
    ]);
    (notificationApi.markRead as any).mockResolvedValue({});

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.refetch();
    });

    await act(async () => {
      await result.current.markRead(1);
    });

    expect(result.current.latest.find(n => n.id === 1)?.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark all notifications as read', async () => {
    (notificationApi.getUnreadCount as any).mockResolvedValue(5);
    (notificationApi.getLatest5 as any).mockResolvedValue([
      { id: 1, title: 'Thông báo 1', isRead: false }
    ]);
    (notificationApi.markAllRead as any).mockResolvedValue({});

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.refetch();
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.latest[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});
