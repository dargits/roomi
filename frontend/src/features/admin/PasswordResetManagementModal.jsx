import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { passwordResetApi, notifyPasswordResetUpdated } from '../../services/passwordResetApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { 
  IoKeyOutline, 
  IoCopyOutline, 
  IoCheckmarkCircleOutline, 
  IoRefreshOutline,
  IoAlertCircleOutline,
  IoTimeOutline,
  IoMailOutline,
  IoInformationCircleOutline,
  IoCloseCircleOutline
} from 'react-icons/io5';

const ROLE_LABELS = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán'
};

const PasswordResetManagementModal = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [issuedResult, setIssuedResult] = useState(null);

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

  const handleIssue = async (item) => {
    const isSelf = currentUser && (item.userId === currentUser.id || item.account === currentUser.account);
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
      const res = await passwordResetApi.issueTempPassword(item.id);
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
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi cấp mật khẩu tạm.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (item) => {
    const isSelf = currentUser && (item.userId === currentUser.id || item.account === currentUser.account);
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
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toastSuccess('Đã sao chép mật khẩu tạm vào khay nhớ tạm!');
  };

  const getStatusBadge = (status) => {
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
        return status;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Quản lý Yêu cầu Cấp lại Mật khẩu" maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border-grey pb-3">
            <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
              <IoAlertCircleOutline size={16} className="text-primary" />
              <span>Quản trị viên trực tiếp xác minh với nhân viên rồi cấp mật khẩu tạm có hiệu lực <strong>24 giờ</strong>. Người dùng bị buộc đổi mật khẩu mới ngay khi đăng nhập.</span>
            </div>

            <Button size="sm" variant="ghost" onClick={fetchRequests} icon={IoRefreshOutline} disabled={loading}>
              Làm mới
            </Button>
          </div>

          <div className="overflow-x-auto border border-border-grey rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-grey font-label-md text-on-surface-variant uppercase text-xs">
                  <th className="p-3">Tài khoản</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Thời gian yêu cầu</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center w-52">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-6 text-center text-on-surface-variant">Đang tải danh sách yêu cầu...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6" className="p-6 text-center text-on-surface-variant">Không có yêu cầu cấp lại mật khẩu nào.</td></tr>
                ) : (
                  requests.map((item) => {
                    const isSelf = currentUser && (item.userId === currentUser.id || item.account === currentUser.account);
                    return (
                      <tr key={item.id} className={`border-b border-border-grey hover:bg-surface-container-low/40 ${isSelf ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-3 font-semibold text-on-surface font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.account}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                Bạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-on-surface">
                            {item.userName || <span className="text-outline italic">Không tồn tại</span>}
                          </div>
                          {item.userEmail && (
                            <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5 font-mono">
                              <IoMailOutline size={12} className="text-primary shrink-0" /> {item.userEmail}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-surface-container border border-border-grey font-semibold">
                            {ROLE_LABELS[item.userRole] || item.userRole || '---'}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          {item.requestedAt?.replace('T', ' ').substring(0, 16)}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'PENDING' ? (
                            isSelf ? (
                              <span className="inline-block text-xs italic text-on-surface-variant px-2.5 py-1 bg-surface-container-low rounded border border-border-grey" title="Bạn không thể tự cấp mật khẩu cho chính tài khoản của mình">
                                Không thể tự cấp
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  icon={IoKeyOutline}
                                  disabled={actionLoading}
                                  onClick={() => handleIssue(item)}
                                >
                                  Cấp mật khẩu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="!text-red-600 hover:!bg-red-50 !border-red-200"
                                  icon={IoCloseCircleOutline}
                                  disabled={actionLoading}
                                  onClick={() => handleReject(item)}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )
                          ) : item.status === 'ISSUED' && item.plainTempPassword ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.plainTempPassword)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                              title="Sao chép mật khẩu"
                            >
                              <IoCopyOutline size={14} /> Sao chép
                            </button>
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Thông báo Mật khẩu tạm sau khi cấp */}
      {issuedResult && (
        <Modal isOpen={!!issuedResult} onClose={() => setIssuedResult(null)} title="Đã cấp mật khẩu tạm thời thành công" maxWidth="max-w-md">
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
              <IoCheckmarkCircleOutline size={28} />
            </div>

            <p className="text-sm text-on-surface">
              Mật khẩu tạm thời cho tài khoản <strong>{issuedResult.account}</strong>:
            </p>

            <div className="p-3.5 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-between gap-3">
              <span className="text-xl font-bold font-mono tracking-wider text-amber-900 select-all">
                {issuedResult.plainTempPassword}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(issuedResult.plainTempPassword)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <IoCopyOutline size={15} /> Sao chép
              </button>
            </div>

            {issuedResult.emailSent ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-left text-xs text-blue-900 flex items-start gap-2.5">
                <IoMailOutline size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-950">Đã gửi email thành công:</span> Mật khẩu tạm thời đã được tự động gửi về hòm thư <strong className="font-mono text-blue-800">{issuedResult.userEmail}</strong>.
                </div>
              </div>
            ) : issuedResult.userEmail ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-left text-xs text-amber-900 flex items-start gap-2.5">
                <IoAlertCircleOutline size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950">Chưa gửi được email tới {issuedResult.userEmail}:</span>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    {issuedResult.emailMessage || 'Hệ thống tạm thời chưa gửi được email tự động. Vui lòng sao chép mật khẩu tạm thời ở trên để gửi trực tiếp cho nhân viên.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-surface-container-low border border-border-grey rounded text-left text-xs text-on-surface-variant flex items-start gap-2.5">
                <IoInformationCircleOutline size={18} className="text-outline shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-on-surface">Tài khoản chưa có email:</span> Vui lòng sao chép mật khẩu tạm bên trên để cung cấp trực tiếp cho nhân viên.
                </div>
              </div>
            )}

            <p className="text-xs text-on-surface-variant text-left leading-relaxed bg-surface-container-low p-3 rounded border border-border-grey">
              ⚠️ <strong>Lưu ý quan trọng:</strong> Mật khẩu này có hiệu lực trong <strong>24 giờ</strong> và chỉ được dùng 1 lần. Khi đăng nhập, nhân viên bắt buộc phải đổi mật khẩu mới ngay trước khi vào được bất kỳ màn hình nào.
            </p>

            <Button onClick={() => setIssuedResult(null)} className="w-full">
              Hoàn tất
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PasswordResetManagementModal;
