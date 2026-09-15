import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../services/notificationApi';
import type { NotificationItem } from '../types/notification';

const POLL_INTERVAL = 60_000; // 60 giây

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
    if (!token) return;
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
    if (!token) return;
    try {
      setLoading(true);
      const data = await notificationApi.getLatest5();
      setLatest(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchLatest()]);
  }, [fetchUnreadCount, fetchLatest]);

  const markRead = useCallback(async (id: number) => {
    try {
      await notificationApi.markRead(id);
      setLatest(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setLatest(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refetch();
    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch, fetchUnreadCount]);

  return { unreadCount, latest, loading, refetch, markRead, markAllRead };
}
