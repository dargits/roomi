import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoNotificationsOutline, IoCheckmarkDoneOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationItem, NotificationType } from '../../types/notification';
import { NOTIFICATION_LABELS } from '../../types/notification';

// ─── Icon tương ứng từng loại ────────────────────────────────────────────────
const TYPE_ICON: Record<NotificationType, { emoji: string; bg: string; text: string }> = {
  CHECKIN_TODAY:              { emoji: '🏨', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CHECKOUT_TODAY:             { emoji: '🚪', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  ROOM_DIRTY:                 { emoji: '🧹', bg: 'bg-amber-100',   text: 'text-amber-700'   },
  ROOM_INCIDENT_LIGHT:        { emoji: '⚠️', bg: 'bg-orange-100',  text: 'text-orange-700'  },
  ROOM_INCIDENT_HEAVY:        { emoji: '🚨', bg: 'bg-red-100',     text: 'text-red-700'     },
  STAY_MILESTONE:             { emoji: '📅', bg: 'bg-purple-100',  text: 'text-purple-700'  },
  INVOICE_DISCOUNT_APPROVAL:  { emoji: '💰', bg: 'bg-rose-100',    text: 'text-rose-700'    },
  CHANNEL_OVERBOOKING_CONFLICT: { emoji: '🚨', bg: 'bg-red-100',     text: 'text-red-700'     },
};

// ─── Hiển thị thời gian tương đối ──────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

// ─── Deep-link routing ───────────────────────────────────────────────────────
function buildLink(item: NotificationItem): string | null {
  if (item.type === 'CHANNEL_OVERBOOKING_CONFLICT' || item.refType === 'BOOKING_CALENDAR' || item.refType === 'CHANNEL') {
    return `/manage/bookings/calendar`;
  }
  if (!item.refId) return null;
  switch (item.refType) {
    case 'BOOKING': return `/manage/bookings`;
    case 'ROOM': return `/manage/rooms`;
    case 'INVOICE': return `/manage/bookings`;
    case 'ROOM_INCIDENT': return `/manage/rooms`;
    default: return null;
  }
}

// ─── Single notification row ─────────────────────────────────────────────────
const NotifRow: React.FC<{
  item: NotificationItem;
  onRead: (id: number) => void;
}> = ({ item, onRead }) => {
  const navigate = useNavigate();
  const meta = TYPE_ICON[item.type] ?? { emoji: '🔔', bg: 'bg-slate-100', text: 'text-slate-700' };
  const link = buildLink(item);

  const handleClick = () => {
    if (!item.isRead) onRead(item.id);
    if (link) navigate(link);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${!item.isRead ? 'bg-primary/[0.03]' : ''}`}
    >
      {/* Dot chưa đọc */}
      {!item.isRead && (
        <span className="absolute top-3.5 left-2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
      {/* Icon loại */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${meta.bg} ${meta.text}`}>
        {meta.emoji}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug truncate ${item.isRead ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
          {item.title}
        </p>
        {item.body && (
          <p className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{item.body}</p>
        )}
        <p className="text-[10.5px] text-slate-400 mt-1">{relativeTime(item.createdAt)}</p>
      </div>
    </button>
  );
};

// ─── Main Bell Component ─────────────────────────────────────────────────────
const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { unreadCount, latest, loading, markRead, markAllRead, refetch } = useNotifications();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) refetch();
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
        title="Thông báo"
        id="notification-bell-btn"
      >
        <IoNotificationsOutline size={22} className={unreadCount > 0 ? 'text-primary' : ''} />
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-16px)] bg-white rounded-2xl shadow-xl border border-slate-200/80 z-50 overflow-hidden animate-fade-in"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.13)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <IoNotificationsOutline size={17} className="text-primary" />
              <span className="font-bold text-slate-800 text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <IoCheckmarkDoneOutline size={14} />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {loading && latest.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Đang tải...</div>
            ) : latest.length === 0 ? (
              <div className="py-10 text-center">
                <IoNotificationsOutline size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              latest.map(item => (
                <NotifRow
                  key={item.id}
                  item={item}
                  onRead={(id) => {
                    markRead(id);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>

          {/* Footer – xem tất cả */}
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => { navigate('/manage/notifications'); setOpen(false); }}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              Xem tất cả thông báo
              <IoChevronForwardOutline size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
