import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { userPermissionApi } from '../../services/userPermissionApi';
import { useToast } from '../../context/ToastContext';
import { 
  IoShieldOutline, 
  IoShieldCheckmarkOutline, 
  IoLockClosedOutline, 
  IoCalendarOutline, 
  IoTimeOutline, 
  IoTrashOutline, 
  IoAlertCircleOutline, 
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoAddCircleOutline
} from 'react-icons/io5';

const UserPermissionModal = ({ isOpen, onClose, user }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form cấp quyền mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');

  // Form thu hồi quyền
  const [revokingPerm, setRevokingPerm] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchPermissions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await userPermissionApi.getUserPermissions(user.id);
      setOverview(data);
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Không thể tải thông tin phân quyền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPermissions();
      setShowAddForm(false);
      setSelectedPermission('');
      setExpiresAt('');
      setReason('');
      setRevokingPerm(null);
      setRevokeReason('');
    }
  }, [isOpen, user]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!selectedPermission) {
      toastError('Vui lòng chọn quyền xem muốn cấp.');
      return;
    }
    if (!reason.trim()) {
      toastError('Vui lòng nhập lý do cấp quyền bổ sung.');
      return;
    }

    setActionLoading(true);
    try {
      await userPermissionApi.grantPermission(user.id, {
        permission: selectedPermission,
        expiresAt: expiresAt || null,
        reason: reason.trim()
      });
      toastSuccess('Đã cấp quyền xem bổ sung thành công!');
      setShowAddForm(false);
      setSelectedPermission('');
      setExpiresAt('');
      setReason('');
      fetchPermissions();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Không thể cấp quyền bổ sung.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokingPerm) return;

    setActionLoading(true);
    try {
      await userPermissionApi.revokePermission(user.id, revokingPerm.id, revokeReason.trim() || 'Thu hồi thủ công');
      toastSuccess(`Đã thu hồi quyền ${revokingPerm.permissionLabel || revokingPerm.permission}!`);
      setRevokingPerm(null);
      setRevokeReason('');
      fetchPermissions();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Không thể thu hồi quyền bổ sung.');
    } finally {
      setActionLoading(false);
    }
  };

  const roleLabelMap = {
    ADMIN: 'Quản trị viên',
    OWNER: 'Chủ sở hữu',
    RECEPTIONIST: 'Lễ tân',
    HOUSEKEEPER: 'Buồng phòng',
    ACCOUNTANT: 'Kế toán'
  };

  // Ánh xạ mã quyền sang tên tiếng Việt
  const permLabelMap = {
    VIEW_REVENUE_REPORT: 'Xem báo cáo doanh thu tổng hợp',
    VIEW_OCCUPANCY_REPORT: 'Xem báo cáo công suất & hiệu suất phòng',
    VIEW_DEPOSITS: 'Xem danh sách và lịch sử đặt cọc',
    VIEW_DEBTS: 'Xem sổ sách theo dõi công nợ',
    VIEW_STAY_DECLARATION: 'Xem và xuất danh sách khai báo lưu trú'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phân quyền tài khoản: ${user?.name || user?.account || ''}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Thông tin tài khoản & vai trò */}
        <div className="p-4 bg-surface-container-low rounded-lg border border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-sm font-semibold text-on-surface">
              {user?.name} <span className="font-normal text-on-surface-variant">(@{user?.account})</span>
            </div>
            <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-2">
              <span>Vai trò hiện tại:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {roleLabelMap[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-md max-w-sm">
            <div className="font-semibold flex items-center gap-1 mb-0.5">
              <IoLockClosedOutline size={14} /> Điểm kiểm soát tài chính
            </div>
            Chỉ cấp các quyền XEM. Các quyền phê duyệt tiền (duyệt giảm giá, duyệt nợ) tuyệt đối không ủy quyền.
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            Đang tải dữ liệu phân quyền...
          </div>
        ) : (
          <>
            {/* NHÓM 1: Quyền mặc định từ Vai trò */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <IoShieldOutline size={18} className="text-primary" />
                <span>Quyền mặc định theo vai trò ({roleLabelMap[user?.role] || user?.role})</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Các quyền này do vai trò quyết định, tự động áp dụng và không thể gỡ riêng lẻ.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {overview?.roleDefaultPermissions && overview.roleDefaultPermissions.length > 0 ? (
                  overview.roleDefaultPermissions.map((perm, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 bg-surface rounded-md border border-border-grey text-xs flex items-center gap-2 text-on-surface"
                    >
                      <IoCheckmarkCircleOutline size={16} className="text-green-600 shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-on-surface-variant italic p-2">Không có quyền mặc định đặc thù.</div>
                )}
              </div>
            </div>

            {/* NHÓM 2: Quyền xem bổ sung riêng */}
            <div className="space-y-3 pt-4 border-t border-border-grey">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <IoShieldCheckmarkOutline size={18} className="text-indigo-600" />
                    <span>Quyền xem bổ sung riêng của tài khoản</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Cấp thêm quyền xem đặc biệt cho cá nhân này (ví dụ: Lễ tân trưởng cần xem báo cáo).
                  </p>
                </div>
                {!showAddForm && (
                  <Button
                    size="sm"
                    icon={IoAddCircleOutline}
                    onClick={() => setShowAddForm(true)}
                  >
                    Cấp quyền bổ sung
                  </Button>
                )}
              </div>

              {/* Form thêm quyền bổ sung */}
              {showAddForm && (
                <form onSubmit={handleGrant} className="p-4 bg-surface-container-lowest border-2 border-indigo-200 rounded-lg space-y-4 animate-fade-in">
                  <div className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                    <IoShieldCheckmarkOutline size={18} />
                    <span>Cấp quyền xem mới có thời hạn & kiểm soát</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Chọn quyền xem được phép cấp <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full text-xs p-2.5 border border-border-grey rounded focus:outline-none focus:border-primary"
                        value={selectedPermission}
                        onChange={(e) => setSelectedPermission(e.target.value)}
                        required
                      >
                        <option value="">-- Chọn quyền xem --</option>
                        {overview?.availableExtraPermissions?.map((perm) => (
                          <option key={perm} value={perm}>
                            {permLabelMap[perm] || perm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Ngày hết hiệu lực (Tùy chọn)
                      </label>
                      <input
                        type="date"
                        className="w-full text-xs p-2.5 border border-border-grey rounded focus:outline-none focus:border-primary"
                        value={expiresAt}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <span className="text-[11px] text-on-surface-variant">Để trống nếu không giới hạn ngày</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Lý do cấp quyền bổ sung <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs p-2.5 border border-border-grey rounded focus:outline-none focus:border-primary"
                      placeholder="Ví dụ: Phụ trách ca trưởng lễ tân theo dõi doanh thu..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      disabled={actionLoading}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Đang lưu...' : 'Xác nhận cấp quyền'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Danh sách quyền bổ sung hiện có */}
              <div className="space-y-2">
                {overview?.extraPermissions && overview.extraPermissions.length > 0 ? (
                  overview.extraPermissions.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border text-xs transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        item.revoked
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : item.expired
                          ? 'bg-red-50 border-red-200'
                          : 'bg-indigo-50/50 border-indigo-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-on-surface flex items-center gap-2">
                          <span>{item.permissionLabel || permLabelMap[item.permission] || item.permission}</span>
                          {item.revoked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 font-medium">
                              Đã thu hồi
                            </span>
                          ) : item.expired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-200 text-red-800 font-medium">
                              Hết hạn
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-medium">
                              Đang hiệu lực
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Lý do: <em>{item.reason}</em></span>
                          {item.expiresAt ? (
                            <span className="flex items-center gap-1">
                              <IoCalendarOutline size={12} /> Hạn: {item.expiresAt}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <IoTimeOutline size={12} /> Vô thời hạn
                            </span>
                          )}
                          <span>Cấp bởi: {item.grantedByName || 'Quản trị viên'}</span>
                        </div>

                        {item.revoked && item.revokeReason && (
                          <div className="text-[11px] text-red-600 italic">
                            Lý do thu hồi: {item.revokeReason}
                          </div>
                        )}
                      </div>

                      {!item.revoked && !item.expired && (
                        <button
                          type="button"
                          onClick={() => setRevokingPerm(item)}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center gap-1 shrink-0"
                          title="Thu hồi quyền này"
                        >
                          <IoTrashOutline size={14} /> Thu hồi
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-lg border border-dashed border-border-grey">
                    Chưa có quyền xem bổ sung nào được cấp cho tài khoản này.
                  </div>
                )}
              </div>
            </div>

            {/* Form modal xác nhận thu hồi */}
            {revokingPerm && (
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg space-y-3 animate-fade-in">
                <div className="text-xs font-semibold text-red-900 flex items-center gap-1.5">
                  <IoAlertCircleOutline size={16} />
                  <span>Xác nhận thu hồi quyền: {revokingPerm.permissionLabel || revokingPerm.permission}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-red-800 mb-1">
                    Lý do thu hồi quyền
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs p-2 border border-red-200 rounded focus:outline-none focus:border-red-500 bg-white"
                    placeholder="Nhập lý do thu hồi quyền bổ sung..."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRevokingPerm(null)}
                    disabled={actionLoading}
                  >
                    Bỏ qua
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleRevoke}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Đang thu hồi...' : 'Đồng ý thu hồi'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserPermissionModal;
