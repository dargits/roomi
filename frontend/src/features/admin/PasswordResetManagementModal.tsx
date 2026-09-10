import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { passwordResetApi, notifyPasswordResetUpdated } from '../../services/passwordResetApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { 
  IoKeyOutline, 
  IoCopyOutline, 
  IoRefreshOutline,
  IoAlertCircleOutline,
  IoTimeOutline,
  IoMailOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán'
};

interface PasswordResetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordResetManagementModal: React.FC<PasswordResetManagementModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [issuedResult, setIssuedResult] = useState<any>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await passwordResetApi.getAllRequests();
      setRequests(data || []);
    } catch (err) {
      console.error(err);
      toastError('Không thể tải danh sách yêu cầu cấp lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      setIssuedResult(null);
    }
  }, [isOpen]);

  const handleIssue = async (item: any) => {
    const isSelf = currentUser && (item.userId === currentUser.id || item.account === (currentUser as any).account);
    if (isSelf) {
      toastError('Bạn không thể tự cấp lại mật khẩu cho chính tài khoản của mình.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Cấp mật khẩu tạm thời',
      message: `Cấp mật khẩu tạm thời có hiệu lực 24 giờ cho tài khoản "${item.account}" (${item.userName})?`,
      confirmText: 'Cấp mật khẩu',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      const res: any = await passwordResetApi.issueTempPassword(item.id);
      setIssuedResult(res);
      if (res?.emailSent) {
        toastSuccess(`Đã cấp mật khẩu tạm và gửi email tới ${res.userEmail || item.account}!`);
      } else if (res?.userEmail) {
        toastSuccess(`Đã cấp mật khẩu tạm thành công! (Chưa gửi được email, vui lòng sao chép mật khẩu gửi trực tiếp cho nhân viên)`);
      } else {
        toastSuccess(`Đã cấp mật khẩu tạm cho tài khoản ${item.account}!`);
      }
      notifyPasswordResetUpdated();
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi cấp mật khẩu tạm.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (item: any) => {
    const isSelf = currentUser && (item.userId === currentUser.id || item.account === (currentUser as any).account);
    if (isSelf) {
      toastError('Bạn không thể tự thao tác trên yêu cầu của chính tài khoản mình.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Từ chối yêu cầu cấp lại mật khẩu',
      message: `Bạn có chắc chắn muốn TỪ CHỐI yêu cầu cấp lại mật khẩu cho tài khoản "${item.account}" (${item.userName})?`,
      confirmText: 'Từ chối yêu cầu',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      await passwordResetApi.rejectRequest(item.id);
      toastSuccess(`Đã từ chối yêu cầu của tài khoản ${item.account}!`);
      notifyPasswordResetUpdated();
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toastSuccess('Đã sao chép mật khẩu tạm vào khay nhớ tạm!');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Chờ cấp</span>;
      case 'ISSUED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Đã cấp (Chờ đổi)</span>;
      case 'USED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Đã hoàn tất đổi</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Hết hạn 24h</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Đã từ chối</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quản lý Cấp lại Mật khẩu Nhân sự"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Banner hướng dẫn QTN-05 */}
        <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-grey flex items-start gap-3 text-xs text-on-surface-variant">
          <IoInformationCircleOutline size={18} className="text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-on-surface">Quy trình cấp lại mật khẩu tạm thời an toàn (QTN-05):</p>
            <p>1. Xác minh danh tính người gửi yêu cầu trước khi cấp mật khẩu tạm.</p>
            <p>2. Mật khẩu tạm thời có <strong>hiệu lực trong 24 giờ</strong> và <strong>bắt buộc phải đổi mới</strong> ngay trong lần đăng nhập đầu tiên.</p>
            <p>3. Vì lý do an toàn, Quản trị viên <strong>không thể tự cấp mật khẩu</strong> cho chính tài khoản của mình.</p>
          </div>
        </div>

        {/* Kết quả vừa cấp mật khẩu tạm */}
        {issuedResult && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <IoKeyOutline size={18} className="text-emerald-700" />
                Mật khẩu tạm thời đã tạo thành công:
              </span>
              <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                Hiệu lực 24 giờ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={issuedResult.tempPassword || ''}
                className="flex-1 font-mono text-base font-bold bg-white px-3 py-2 border border-emerald-300 rounded-lg text-emerald-900 select-all"
              />
              <Button
                variant="primary"
                size="sm"
                icon={IoCopyOutline}
                onClick={() => handleCopy(issuedResult.tempPassword)}
              >
                Sao chép
              </Button>
            </div>
            <p className="text-xs text-emerald-800">
              {issuedResult.emailSent ? (
                <span className="inline-flex items-center gap-1 text-emerald-900 font-medium">
                  <IoMailOutline size={14} /> Đã tự động gửi email thông báo tới: <strong>{issuedResult.userEmail}</strong>
                </span>
              ) : (
                <span>Vui lòng sao chép và chuyển mật khẩu tạm này trực tiếp cho nhân viên.</span>
              )}
            </p>
          </div>
        )}

        {/* Bảng danh sách yêu cầu */}
        <div className="border border-border-grey rounded-xl overflow-hidden bg-surface-container-lowest">
          <div className="px-4 py-3 bg-surface-container-low border-b border-border-grey flex items-center justify-between">
            <h3 className="font-title-md text-sm text-on-surface font-semibold">
              Danh sách yêu cầu ({requests.length})
            </h3>
            <button
              onClick={fetchRequests}
              className="text-xs flex items-center gap-1 text-primary hover:underline cursor-pointer"
            >
              <IoRefreshOutline size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-border-grey uppercase tracking-wider">
                <tr>
                  <th className="p-3">Tài khoản / Họ tên</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Thời gian gửi</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-on-surface">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Đang tải danh sách yêu cầu...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Chưa có yêu cầu cấp lại mật khẩu nào.
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => {
                    const isPending = item.status === 'PENDING';
                    const isSelf = currentUser && (item.userId === currentUser.id || item.account === (currentUser as any).account);

                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-on-surface">{item.account}</p>
                          <p className="text-[11px] text-on-surface-variant">{item.userName}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface">
                            {ROLE_LABELS[item.userRole] || item.userRole}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <IoTimeOutline size={12} />
                            <span>{new Date(item.requestedAt).toLocaleString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="p-3 text-on-surface-variant max-w-[180px] truncate" title={item.notes || ''}>
                          {item.notes || '—'}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="p-3 text-right">
                          {isPending ? (
                            isSelf ? (
                              <span className="text-[11px] text-amber-700 italic" title="Không thể tự cấp lại mật khẩu của chính mình">
                                Tài khoản của bạn
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleIssue(item)}
                                  disabled={actionLoading}
                                  className="text-xs py-1 px-2.5"
                                >
                                  Cấp MK
                                </Button>
                                <Button
                                  variant="dangerOutline"
                                  size="sm"
                                  onClick={() => handleReject(item)}
                                  disabled={actionLoading}
                                  className="text-xs py-1 px-2"
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] text-on-surface-variant/70">
                              {item.processedByName ? `Bởi ${item.processedByName}` : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PasswordResetManagementModal;
