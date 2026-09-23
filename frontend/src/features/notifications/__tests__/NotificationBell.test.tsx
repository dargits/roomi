import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import * as notifHook from '../../../hooks/useNotifications';

vi.mock('../../../hooks/useNotifications');

describe('NotificationBell component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell button and does not show badge when unreadCount is 0', () => {
    vi.spyOn(notifHook, 'useNotifications').mockReturnValue({
      unreadCount: 0,
      latest: [],
      loading: false,
      refetch: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn()
    });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /thông báo/i })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows badge when unreadCount > 0 and toggles dropdown on click', () => {
    vi.spyOn(notifHook, 'useNotifications').mockReturnValue({
      unreadCount: 4,
      latest: [
        {
          id: 1,
          type: 'CHECKIN_TODAY',
          title: 'Khách đến hôm nay',
          body: 'Phòng 201 check-in lúc 14:00',
          refType: null,
          refId: null,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ],
      loading: false,
      refetch: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn()
    });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    expect(screen.getByText('4')).toBeInTheDocument();

    const bellBtn = screen.getByTitle('Thông báo');
    fireEvent.click(bellBtn);

    expect(screen.getByText('Khách đến hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Đọc tất cả')).toBeInTheDocument();
  });
});
