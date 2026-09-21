import React, { useState, useEffect, useMemo } from 'react';
import {
  IoKeyOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoDesktopOutline,
  IoPhonePortraitOutline,
  IoGlobeOutline,
  IoLogOutOutline,
  IoShieldOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoPeopleOutline,
  IoAlertCircleOutline,
  IoSettingsOutline
} from 'react-icons/io5';
import userApi from '../../services/userApi';
import hotelSettingApi from '../../services/hotelSettingApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import LoadingScreen from '../../components/common/LoadingScreen';
import { UserSessionResponse, Role, HotelSettingResponse } from '../../types';
import { ROLE_LABEL, ROLE_BADGE_STYLE } from '../../layouts/DashboardLayout';

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const formatFullDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const QUICK_REASONS = [
  'Quên đăng xuất trên máy chung ở quầy',
  'Nhân viên thay ca làm việc',
  'Nghi ngờ lộ mật khẩu / truy cập bất thường',
  'Nhân viên đã nghỉ việc',
  'Yêu cầu bảo mật định kỳ'
];

const SessionManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [sessions, setSessions] = useState<UserSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State
  const [targetSession, setTargetSession] = useState<UserSessionResponse | null>(null);
  const [isBulkUserMode, setIsBulkUserMode] = useState<boolean>(false);
  const [logoutReason, setLogoutReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Session Settings Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [currentHotelSetting, setCurrentHotelSetting] = useState<HotelSettingResponse | null>(null);
  const [configTimeoutMinutes, setConfigTimeoutMinutes] = useState<number>(120);
  const [configMaxConcurrent, setConfigMaxConcurrent] = useState<number>(0);
  const [configMaxLifetimeHours, setConfigMaxLifetimeHours] = useState<number>(24);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  const hasAccess = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (hasAccess) {
      fetchSessions();
    }
  }, [hasAccess]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getActiveSessions();
      setSessions(data || []);
    } catch (error: any) {
      console.error('Failed to load active sessions', error);
      toastError('Không thể tải danh sách phiên đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSingleLogoutModal = (session: UserSessionResponse) => {
    if (session.isCurrentSession) {
      toastError('Không thể tự buộc đăng xuất chính phiên đang hoạt động của bạn (TC-04).');
      return;
    }
    setTargetSession(session);
    setIsBulkUserMode(false);
    setLogoutReason('Quên đăng xuất trên máy chung ở quầy');
  };

  const handleOpenBulkLogoutModal = (session: UserSessionResponse) => {
    if (session.userId === currentUser?.id) {
      toastError('Không thể tự buộc đăng xuất toàn bộ phiên của chính mình (TC-04).');
      return;
    }
    setTargetSession(session);
    setIsBulkUserMode(true);
    setLogoutReason('Buộc kết thúc toàn bộ phiên làm việc của tài khoản này');
  };

  const handleCloseModal = () => {
    setTargetSession(null);
    setIsBulkUserMode(false);
    setLogoutReason('');
  };

  const handleConfirmLogout = async () => {
    if (!targetSession) return;
    if (!logoutReason.trim()) {
      toastError('Vui lòng nhập lý do buộc đăng xuất.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isBulkUserMode) {
        await userApi.forceLogoutAllSessions(targetSession.userId, logoutReason.trim());
        toastSuccess(`Đã buộc đăng xuất toàn bộ phiên của tài khoản ${targetSession.account}.`);
      } else {
        await userApi.forceLogoutSession(targetSession.id, logoutReason.trim());
        toastSuccess(`Đã buộc đăng xuất phiên của tài khoản ${targetSession.account}.`);
      }
      handleCloseModal();
      fetchSessions();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi buộc đăng xuất phiên.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfigModal = async () => {
    try {
      const setting = await hotelSettingApi.getAdminSetting();
      setCurrentHotelSetting(setting);
      setConfigTimeoutMinutes(setting.sessionTimeoutMinutes ?? 120);
      setConfigMaxConcurrent(setting.maxConcurrentSessions ?? 0);
      setConfigMaxLifetimeHours(setting.maxSessionLifetimeHours ?? 24);
      setIsConfigModalOpen(true);
    } catch (err: any) {
      toastError('Không thể tải cấu hình phiên làm việc.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotelSetting) return;
    try {
      setIsSavingConfig(true);
      await hotelSettingApi.updateSetting({
        ...currentHotelSetting,
        sessionTimeoutMinutes: Number(configTimeoutMinutes) || 120,
        maxConcurrentSessions: Number(configMaxConcurrent) >= 0 ? Number(configMaxConcurrent) : 0,
        maxSessionLifetimeHours: Number(configMaxLifetimeHours) || 24,
      });
      toastSuccess('Đã cập nhật chính sách phiên đăng nhập thành công!');
      setIsConfigModalOpen(false);
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        !searchTerm.trim() ||
        s.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.deviceInfo && s.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'ALL' || s.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [sessions, searchTerm, roleFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = sessions.length;
    const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;
    const mobileCount = sessions.filter(
      (s) =>
        s.deviceInfo.toLowerCase().includes('iphone') ||
        s.deviceInfo.toLowerCase().includes('android') ||
        s.deviceInfo.toLowerCase().includes('ipad')
    ).length;
    const desktopCount = total - mobileCount;

    return { total, uniqueUsers, mobileCount, desktopCount };
  }, [sessions]);

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-lg font-body-md">
        Bạn không có quyền truy cập chức năng theo dõi phiên đăng nhập.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={IoKeyOutline}
        title="Theo dõi phiên đăng nhập"
        subtitle="Giám sát các phiên đang kết nối vào hệ thống, phát hiện phiên bị bỏ quên ở máy quầy và buộc đăng xuất từ xa (NCL-10-CN-007)"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={IoSettingsOutline}
              onClick={handleOpenConfigModal}
            >
              Cấu hình phiên
            </Button>
            <Button
              variant="outline"
              icon={IoRefreshOutline}
              onClick={fetchSessions}
              disabled={isLoading}
            >
              Làm mới
            </Button>
          </div>
        }
      />

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl">
            <IoKeyOutline size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">{stats.total}</div>
            <div className="text-sm text-on-surface-variant font-medium">Phiên đang mở</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            <IoPeopleOutline size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">{stats.uniqueUsers}</div>
            <div className="text-sm text-on-surface-variant font-medium">Nhân sự online</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
            <IoDesktopOutline size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">{stats.desktopCount}</div>
            <div className="text-sm text-on-surface-variant font-medium">Máy tính / Quầy</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl">
            <IoPhonePortraitOutline size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">{stats.mobileCount}</div>
            <div className="text-sm text-on-surface-variant font-medium">Thiết bị di động</div>
          </div>
        </div>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="flex-1 w-full md:w-auto relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tài khoản, tên nhân viên, IP hoặc thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/50 rounded-lg text-sm bg-surface focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center">
          <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-outline-variant/50 rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="OWNER">Chủ cơ sở</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="RECEPTIONIST">Lễ tân</option>
            <option value="HOUSEKEEPER">Buồng phòng</option>
            <option value="ACCOUNTANT">Kế toán</option>
          </select>
        </div>
      </div>

      {/* Danh sách phiên */}
      {isLoading ? (
        <LoadingScreen />
      ) : filteredSessions.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline-variant/30 text-center space-y-3">
          <IoKeyOutline size={48} className="mx-auto text-on-surface-variant/40" />
          <div className="text-lg font-semibold text-on-surface">Không tìm thấy phiên đăng nhập nào</div>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            {searchTerm || roleFilter !== 'ALL'
              ? 'Không có phiên nào khớp với điều kiện tìm kiếm hiện tại.'
              : 'Hiện tại không có phiên làm việc nào đang mở.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-semibold">
                  <th className="py-3.5 px-4">Tài khoản & Nhân sự</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Thiết bị & IP</th>
                  <th className="py-3.5 px-4">Đăng nhập lúc</th>
                  <th className="py-3.5 px-4">Thao tác gần nhất</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác từ xa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredSessions.map((session) => {
                  const roleBadgeClass = ROLE_BADGE_STYLE[session.role] || 'bg-gray-100 text-gray-700';
                  const isMobile =
                    session.deviceInfo.toLowerCase().includes('iphone') ||
                    session.deviceInfo.toLowerCase().includes('android') ||
                    session.deviceInfo.toLowerCase().includes('ipad');

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-surface-container-high/30 transition-colors ${
                        session.isCurrentSession ? 'bg-primary-container/10' : ''
                      }`}
                    >
                      {/* Nhân sự */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                            {session.name.charAt(0) || session.account.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-1.5">
                              {session.name}
                              {session.isCurrentSession && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-on-primary">
                                  Phiên của bạn
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-on-surface-variant">@{session.account}</div>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${roleBadgeClass}`}>
                          {ROLE_LABEL[session.role] || session.role}
                        </span>
                      </td>

                      {/* Thiết bị & IP */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isMobile ? (
                            <IoPhonePortraitOutline size={18} className="text-purple-600 flex-shrink-0" />
                          ) : (
                            <IoDesktopOutline size={18} className="text-blue-600 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-on-surface text-xs">{session.deviceInfo}</div>
                            <div className="text-[11px] text-on-surface-variant flex items-center gap-1">
                              <IoGlobeOutline size={12} />
                              {session.ipAddress}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Đăng nhập lúc */}
                      <td className="py-3 px-4 text-xs text-on-surface-variant" title={formatFullDateTime(session.loginAt)}>
                        {formatFullDateTime(session.loginAt)}
                      </td>

                      {/* Thao tác gần nhất */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <IoTimeOutline size={14} className="text-on-surface-variant" />
                          <span className="font-medium text-on-surface" title={formatFullDateTime(session.lastActiveAt)}>
                            {formatTimeAgo(session.lastActiveAt)}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Đang hoạt động
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút buộc đăng xuất đơn lẻ */}
                          {session.isCurrentSession ? (
                            <span
                              className="text-xs text-on-surface-variant/50 italic px-2 py-1"
                              title="Phiên hiện tại của bạn. Sử dụng nút Đăng xuất cá nhân trên thanh điều hướng để thoát an toàn (TC-04)."
                            >
                              Không thể tự ngắt
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenSingleLogoutModal(session)}
                                className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md border border-red-200 transition-colors flex items-center gap-1"
                                title="Buộc đăng xuất phiên này"
                              >
                                <IoLogOutOutline size={15} />
                                Đăng xuất phiên
                              </button>

                              <button
                                onClick={() => handleOpenBulkLogoutModal(session)}
                                className="px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-md border border-orange-200 transition-colors flex items-center gap-1"
                                title="Buộc đăng xuất tất cả phiên của tài khoản này"
                              >
                                <IoShieldOutline size={14} />
                                Đăng xuất hết
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Buộc Đăng Xuất */}
      {targetSession && (
        <Modal
          isOpen={true}
          onClose={handleCloseModal}
          title={isBulkUserMode ? 'Buộc đăng xuất toàn bộ phiên' : 'Buộc đăng xuất phiên làm việc'}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
              <IoWarningOutline size={22} className="flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Xác nhận thao tác quản trị từ xa</div>
                {isBulkUserMode ? (
                  <span>
                    Toàn bộ phiên đang hoạt động của tài khoản <strong>@{targetSession.account}</strong> ({targetSession.name})
                    sẽ bị kết thúc ngay lập tức. Người dùng sẽ bị đưa về màn hình đăng nhập ở thao tác kế tiếp kèm thông báo lý do.
                  </span>
                ) : (
                  <span>
                    Phiên đăng nhập trên thiết bị <strong>{targetSession.deviceInfo}</strong> (IP: {targetSession.ipAddress})
                    của <strong>@{targetSession.account}</strong> sẽ bị kết thúc ngay lập tức.
                  </span>
                )}
              </div>
            </div>

            {/* Gợi ý lý do nhanh */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Chọn lý do nhanh:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLogoutReason(r)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      logoutReason === r
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface hover:bg-surface-container-high border-outline-variant text-on-surface'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập lý do */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Lý do buộc đăng xuất <span className="text-red-500">*</span> (sẽ hiển thị cho người dùng):
              </label>
              <textarea
                rows={3}
                value={logoutReason}
                onChange={(e) => setLogoutReason(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                className="w-full p-2.5 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmLogout}
                disabled={isSubmitting || !logoutReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                {isSubmitting ? 'Đang xử lý...' : isBulkUserMode ? 'Buộc đăng xuất tất cả' : 'Buộc đăng xuất'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Cấu hình Chính sách Phiên Đăng nhập */}
      {isConfigModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConfigModalOpen(false)}
          title="Cấu hình Chính sách Phiên Đăng nhập & Bảo mật"
        >
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <IoKeyOutline size={15} /> Thay đổi thời gian hiệu lực và quy tắc đăng nhập của cơ sở:
              </div>
              <div>Cấu hình này được áp dụng tự động cho toàn bộ nhân sự và quản trị viên của hệ thống.</div>
            </div>

            <div className="space-y-3.5">
              <Input
                label="Thời gian chờ không thao tác (phút) *"
                type="number"
                min={5}
                max={1440}
                value={String(configTimeoutMinutes)}
                onChange={(e) => setConfigTimeoutMinutes(Number(e.target.value))}
                icon={IoTimeOutline}
                helperText="Mặc định 120 phút. Tự động kết thúc phiên khi nhân viên rời quầy quá số phút này."
                required
              />

              <Input
                label="Số phiên đăng nhập đồng thời tối đa trên 1 tài khoản *"
                type="number"
                min={0}
                max={50}
                value={String(configMaxConcurrent)}
                onChange={(e) => setConfigMaxConcurrent(Number(e.target.value))}
                icon={IoKeyOutline}
                helperText="0 = Không giới hạn thiết bị. 1 = Chế độ phiên duy nhất (đăng nhập máy mới tự hủy phiên cũ)."
                required
              />

              <Input
                label="Thời hạn tối đa của một phiên (giờ) *"
                type="number"
                min={1}
                max={720}
                value={String(configMaxLifetimeHours)}
                onChange={(e) => setConfigMaxLifetimeHours(Number(e.target.value))}
                icon={IoTimeOutline}
                helperText="Mặc định 24 giờ. Phiên làm việc sẽ hết hạn tuyệt đối sau khoảng thời gian này."
                required
              />
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
              <div>💡 <strong>Mẹo bảo mật quầy lễ tân:</strong> Nếu muốn 1 tài khoản chỉ được mở trên đúng 1 máy tính tại một thời điểm, hãy đặt <strong>Số phiên đồng thời = 1</strong>.</div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigModalOpen(false)}
                disabled={isSavingConfig}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingConfig}
              >
                Lưu cấu hình
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SessionManagementPage;
