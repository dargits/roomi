import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoNotificationsOutline, 
  IoCheckmarkDoneOutline, 
  IoFilterOutline, 
  IoSettingsOutline, 
  IoChevronForwardOutline, 
  IoChevronDownOutline, 
  IoRefreshOutline,
  IoCalendarOutline,
  IoBedOutline,
  IoWarningOutline,
  IoAlertCircleOutline,
  IoCashOutline,
  IoTimeOutline,
  IoCheckmarkOutline,
  IoCloseOutline
} from 'react-icons/io5';
import { notificationApi } from '../../services/notificationApi';
import type { NotificationItem, NotificationPref, NotificationType } from '../../types/notification';
import { NOTIFICATION_LABELS } from '../../types/notification';
import { useToast } from '../../context/ToastContext';

// ─── Visual metadata for notification types ──────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { 
  label: string; 
  icon: React.ComponentType<{ size?: number; className?: string }>; 
  bgColor: string; 
  textColor: string; 
  badgeColor: string; 
  borderColor: string;
}> = {
  CHECKIN_TODAY: {
    label: 'Check-in hôm nay',
    icon: IoBedOutline,
    bgColor: 'bg-emerald-50 text-emerald-600',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-l-emerald-500'
  },
  CHECKOUT_TODAY: {
    label: 'Check-out hôm nay',
    icon: IoBedOutline,
    bgColor: 'bg-sky-50 text-sky-600',
    textColor: 'text-sky-700',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    borderColor: 'border-l-sky-500'
  },
  ROOM_DIRTY: {
    label: 'Phòng cần dọn',
    icon: IoBedOutline,
    bgColor: 'bg-amber-50 text-amber-600',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-l-amber-500'
  },
  ROOM_INCIDENT_LIGHT: {
    label: 'Sự cố phòng (nhẹ)',
    icon: IoWarningOutline,
    bgColor: 'bg-orange-50 text-orange-600',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    borderColor: 'border-l-orange-500'
  },
  ROOM_INCIDENT_HEAVY: {
    label: 'Sự cố phòng (nặng)',
    icon: IoAlertCircleOutline,
    bgColor: 'bg-rose-50 text-rose-600',
    textColor: 'text-rose-700',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    borderColor: 'border-l-rose-500'
  },
  STAY_MILESTONE: {
    label: 'Nhắc lưu trú',
    icon: IoCalendarOutline,
    bgColor: 'bg-purple-50 text-purple-600',
    textColor: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-l-purple-500'
  },
  INVOICE_DISCOUNT_APPROVAL: {
    label: 'Duyệt giảm giá',
    icon: IoCashOutline,
    bgColor: 'bg-red-50 text-red-600',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    borderColor: 'border-l-red-500'
  },
};

// ─── Relative & formatted time helpers ───────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatExactTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function isOlderThan30Days(dateStr: string): boolean {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(dateStr).getTime() > thirtyDaysMs;
}

// ─── Deep-link resolver ──────────────────────────────────────────────────────
function getTargetRoute(item: NotificationItem): string | null {
  if (!item.refId) {
    if (item.type === 'ROOM_DIRTY') return '/manage/housekeeping';
    return null;
  }
  switch (item.refType) {
    case 'BOOKING':
      return `/manage/bookings/${item.refId}`;
    case 'ROOM':
      return `/manage/rooms`;
    case 'INVOICE':
      return `/manage/bookings/${item.refId}/invoice`;
    case 'ROOM_INCIDENT':
      return `/manage/rooms`;
    default:
      return null;
  }
}

// ─── Modal Cấu Hình Nhận Thông Báo ──────────────────────────────────────────
const PreferencesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getPreferences();
      setPrefs(data);
    } catch {
      showToast('error', 'Không thể tải cài đặt thông báo');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchPrefs();
    }
  }, [isOpen, fetchPrefs]);

  const handleToggle = async (type: NotificationType, currentEnabled: boolean, mandatory: boolean) => {
    if (mandatory) return;
    const newEnabled = !currentEnabled;
    try {
      setUpdating(type);
      await notificationApi.updatePreference(type, newEnabled);
      setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled: newEnabled } : p));
      showToast('success', `Đã ${newEnabled ? 'bật' : 'tắt'} nhận thông báo ${NOTIFICATION_LABELS[type] || type}`);
    } catch {
      showToast('error', 'Cập nhật tùy chọn thất bại');
    } finally {
      setUpdating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IoSettingsOutline size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Cấu hình nhận thông báo</h2>
              <p className="text-xs text-slate-500">Tùy chỉnh các loại thông báo gửi tới tài khoản của bạn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <IoCloseOutline size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Đang tải cài đặt...</div>
          ) : prefs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Không có thông báo nào có thể tùy chỉnh cho vai trò của bạn.</div>
          ) : (
            prefs.map(pref => {
              const meta = TYPE_CONFIG[pref.type];
              const Icon = meta?.icon || IoNotificationsOutline;
              const isBusy = updating === pref.type;

              return (
                <div key={pref.type} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta?.bgColor || 'bg-slate-100 text-slate-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">
                          {NOTIFICATION_LABELS[pref.type] || pref.type}
                        </span>
                        {pref.mandatory && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Bắt buộc
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pref.mandatory 
                          ? 'Thông báo quan trọng theo vai trò, không thể tắt.' 
                          : pref.enabled ? 'Đang nhận thông báo này.' : 'Đã tắt nhận thông báo này.'}
                      </p>
                    </div>
                  </div>

                  {/* Switch toggle */}
                  <div className="shrink-0 flex items-center">
                    <label className={`relative inline-flex items-center ${pref.mandatory ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={pref.enabled}
                        disabled={pref.mandatory || isBusy}
                        onChange={() => handleToggle(pref.type, pref.enabled, pref.mandatory)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            * Thay đổi có hiệu lực ngay lập tức.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Notification Center Component ──────────────────────────────────────
const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<NotificationType | ''>('');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Accordion state for notifications older than 30 days
  const [isOldExpanded, setIsOldExpanded] = useState<boolean>(false);

  // Preferences Modal state
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);

  // Fetch notifications list
  const loadNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await notificationApi.getList({
        type: selectedType,
        unreadOnly: unreadOnly ? true : undefined,
        page,
        size: 30
      });

      setNotifications(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch {
      showToast('error', 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, unreadOnly, page, showToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark single as read
  const handleMarkRead = async (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.isRead) return;
    try {
      await notificationApi.markRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    } catch {
      showToast('error', 'Không thể đánh dấu đã đọc');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('success', 'Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      showToast('error', 'Thao tác thất bại');
    }
  };

  // Click row to navigate
  const handleRowClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkRead(item);
    }
    const route = getTargetRoute(item);
    if (route) {
      navigate(route);
    }
  };

  // Split into recent vs older than 30 days
  const recentNotifications = notifications.filter(n => !isOlderThan30Days(n.createdAt));
  const oldNotifications = notifications.filter(n => isOlderThan30Days(n.createdAt));
  const unreadCountOnPage = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <IoNotificationsOutline size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Trung Tâm Thông Báo
                </h1>
                {totalElements > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {totalElements} thông báo
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Theo dõi toàn bộ cập nhật, sự cố và biến động hoạt động lưu trú theo vai trò
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <IoRefreshOutline size={16} className={refreshing ? 'animate-spin text-primary' : ''} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {unreadCountOnPage > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <IoCheckmarkDoneOutline size={16} />
                <span>Đọc tất cả</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPrefModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <IoSettingsOutline size={15} />
              <span>Cài đặt nhận tin</span>
            </button>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => { setUnreadOnly(false); setPage(0); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                !unreadOnly 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => { setUnreadOnly(true); setPage(0); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                unreadOnly 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Chưa đọc</span>
              {unreadCountOnPage > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${unreadOnly ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                  {unreadCountOnPage}
                </span>
              )}
            </button>
          </div>

          {/* Type Dropdown Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <IoFilterOutline size={15} />
              <span>Loại thông báo:</span>
            </div>
            <select
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value as NotificationType | ''); setPage(0); }}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">-- Tất cả phân loại --</option>
              {Object.entries(NOTIFICATION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Notification List ── */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/70 shadow-xs">
              <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Đang tải danh sách thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/70 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-4">
                <IoNotificationsOutline size={32} />
              </div>
              <h2 className="text-base font-bold text-slate-700">Không có thông báo nào</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {unreadOnly 
                  ? 'Tuyệt vời! Bạn đã xem hết tất cả thông báo.' 
                  : selectedType 
                  ? 'Chưa có thông báo nào thuộc phân loại này.' 
                  : 'Hiện tại chưa có thông báo mới nào được ghi nhận cho tài khoản của bạn.'}
              </p>
              {(unreadOnly || selectedType) && (
                <button
                  type="button"
                  onClick={() => { setUnreadOnly(false); setSelectedType(''); setPage(0); }}
                  className="mt-4 px-4 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recent Notifications (Last 30 days) */}
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {recentNotifications.length > 0 ? (
                  recentNotifications.map(item => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onRead={handleMarkRead}
                      onClick={() => handleRowClick(item)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Không có thông báo nào trong 30 ngày gần đây.
                  </div>
                )}
              </div>

              {/* Collapsed Section for Older Than 30 Days (Spec Requirement Q1) */}
              {oldNotifications.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsOldExpanded(!isOldExpanded)}
                    className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <IoTimeOutline size={17} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">
                        Thông báo cũ hơn 30 ngày ({oldNotifications.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span>{isOldExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                      <IoChevronDownOutline
                        size={14}
                        className={`transition-transform duration-200 ${isOldExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {isOldExpanded && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {oldNotifications.map(item => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          onRead={handleMarkRead}
                          onClick={() => handleRowClick(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-2">
                  <span className="text-xs text-slate-500">
                    Trang {page + 1} / {totalPages} ({totalElements} thông báo)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      Trang trước
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </div>
  );
};

// ─── Single Notification Row Component ───────────────────────────────────────
const NotificationRow: React.FC<{
  item: NotificationItem;
  onRead: (item: NotificationItem, e: React.MouseEvent) => void;
  onClick: () => void;
}> = ({ item, onRead, onClick }) => {
  const meta = TYPE_CONFIG[item.type] || {
    label: item.type,
    icon: IoNotificationsOutline,
    bgColor: 'bg-slate-100 text-slate-600',
    textColor: 'text-slate-700',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    borderColor: 'border-l-slate-400'
  };
  const Icon = meta.icon;
  const targetRoute = getTargetRoute(item);

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 md:p-5 flex items-start justify-between gap-3 md:gap-4 transition-colors cursor-pointer hover:bg-slate-50/80 border-l-4
        ${item.isRead ? 'border-l-transparent bg-white' : `${meta.borderColor} bg-primary/[0.02]` }
      `}
    >
      {/* Left: Icon & Content */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Category Icon */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bgColor}`}>
          <Icon size={20} />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
              {meta.label}
            </span>
            <span className="text-[11px] text-slate-400 font-medium" title={formatExactTime(item.createdAt)}>
              {formatRelativeTime(item.createdAt)}
            </span>
            {!item.isRead && (
              <span className="w-2 h-2 rounded-full bg-primary" title="Chưa đọc" />
            )}
          </div>

          <h3 className={`text-sm md:text-[15px] mt-1.5 leading-snug ${item.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
            {item.title}
          </h3>

          {item.body && (
            <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">
              {item.body}
            </p>
          )}

          {/* Deep link preview */}
          {targetRoute && (
            <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              <span>Mở chi tiết liên quan</span>
              <IoChevronForwardOutline size={12} />
            </div>
          )}
        </div>
      </div>

      {/* Right: Mark Read Action */}
      <div className="shrink-0 flex items-center gap-1.5 self-center">
        {!item.isRead ? (
          <button
            type="button"
            onClick={(e) => onRead(item, e)}
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            title="Đánh dấu đã đọc"
          >
            <IoCheckmarkOutline size={18} />
          </button>
        ) : (
          <span className="text-slate-300 p-2" title="Đã đọc">
            <IoCheckmarkDoneOutline size={18} />
          </span>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
