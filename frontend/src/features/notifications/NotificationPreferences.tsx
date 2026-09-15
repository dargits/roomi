import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoArrowBackOutline, 
  IoSettingsOutline, 
  IoShieldCheckmarkOutline,
  IoCheckmarkOutline
} from 'react-icons/io5';
import { notificationApi } from '../../services/notificationApi';
import type { NotificationPref, NotificationType } from '../../types/notification';
import { NOTIFICATION_LABELS } from '../../types/notification';
import { useToast } from '../../context/ToastContext';

const NotificationPreferences: React.FC = () => {
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useToast();
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getPreferences();
      setPrefs(data);
    } catch {
      toastError('Không thể tải tùy chọn nhận thông báo');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleToggle = async (type: NotificationType, currentEnabled: boolean, mandatory: boolean) => {
    if (mandatory) return;
    const newEnabled = !currentEnabled;
    try {
      setUpdating(type);
      await notificationApi.updatePreference(type, newEnabled);
      setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled: newEnabled } : p));
      toastSuccess(`Đã ${newEnabled ? 'bật' : 'tắt'} nhận thông báo ${NOTIFICATION_LABELS[type] || type}`);
    } catch {
      toastError('Cập nhật thất bại');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/manage/notifications')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
          >
            <IoArrowBackOutline size={16} />
            <span>Quay lại Trung tâm thông báo</span>
          </button>
        </div>

        {/* ── Header Card ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
              <IoSettingsOutline size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Cài Đặt Nhận Thông Báo
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Tự chọn loại thông báo cần hiển thị để không bỏ sót việc quan trọng mà không bị làm phiền bởi những thông báo không cần thiết.
              </p>
            </div>
          </div>
        </div>

        {/* ── Preferences List ── */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách loại thông báo theo vai trò
            </span>
            <span className="text-xs text-slate-400">
              {prefs.length} loại khả dụng
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-6 space-y-4">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải tùy chọn...</div>
            ) : prefs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Không có thông báo nào có thể cấu hình.</div>
            ) : (
              prefs.map(pref => {
                const isBusy = updating === pref.type;
                return (
                  <div key={pref.type} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">
                          {NOTIFICATION_LABELS[pref.type] || pref.type}
                        </span>
                        {pref.mandatory ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <IoShieldCheckmarkOutline size={12} />
                            Bắt buộc
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
                            Tùy chọn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 max-w-xl">
                        {pref.mandatory 
                          ? 'Thông báo an toàn / phê duyệt bắt buộc của hệ thống. Bạn không thể tắt thông báo này.' 
                          : pref.enabled 
                          ? 'Đang bật: Bạn sẽ nhận được thông báo khi sự kiện này phát sinh.' 
                          : 'Đã tắt: Hệ thống sẽ không hiển thị thông báo loại này cho bạn.'}
                      </p>
                    </div>

                    {/* Switch */}
                    <div className="shrink-0">
                      <label className={`relative inline-flex items-center ${pref.mandatory ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={pref.enabled}
                          disabled={pref.mandatory || isBusy}
                          onChange={() => handleToggle(pref.type, pref.enabled, pref.mandatory)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationPreferences;
