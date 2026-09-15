import api from './api';
import type { NotificationItem, NotificationPage, NotificationPref, NotificationType } from '../types/notification';

export const notificationApi = {
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    return res.data.count;
  },

  getLatest5: async (): Promise<NotificationItem[]> => {
    const res = await api.get<NotificationItem[]>('/notifications/latest');
    return res.data;
  },

  getList: async (params: {
    type?: NotificationType | '';
    unreadOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<NotificationPage> => {
    const res = await api.get<NotificationPage>('/notifications', { params });
    return res.data;
  },

  markRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  getPreferences: async (): Promise<NotificationPref[]> => {
    const res = await api.get<NotificationPref[]>('/notifications/preferences');
    return res.data;
  },

  updatePreference: async (type: NotificationType, enabled: boolean): Promise<void> => {
    await api.put('/notifications/preferences', { type, enabled });
  },
};
