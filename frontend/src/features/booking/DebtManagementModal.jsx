import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoCashOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoAlertCircleOutline,
  IoRefreshOutline,
  IoTimeOutline,
  IoMailOutline,
  IoPrintOutline
} from 'react-icons/io5';
import DebtAcknowledgementPrintTemplate from './DebtAcknowledgementPrintTemplate';

const DebtManagementModal = ({ isOpen, onClose, onRefreshData }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('debts'); // 'debts' | 'pending'
  const [debts, setDebts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [printingAcknowledgement, setPrintingAcknowledgement] = useState(null);

  // Reject state
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [debtsData, pendingData] = await Promise.all([
        debtApprovalApi.getActiveDebts(),
        isOwnerOrAdmin ? debtApprovalApi.getPendingRequests() : Promise.resolve([])
      ]);
      setDebts(debtsData || []);
      setPendingRequests(pendingData || []);
    } catch (err) {
      console.error('Fetch debts error', err);
      toastError('Không thể tải danh sách công nợ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleApprove = async (item) => {
    const isConfirmed = await confirm({
      title: 'Phê duyệt trả phòng còn nợ',
      message: `Xác nhận phê duyệt cho đặt phòng #${item.bookingId} (${item.guestName || ''}) trả phòng còn nợ ${formatPrice(item.debtAmount)}?`,
      confirmText: 'Phê duyệt',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      await debtApprovalApi.approveDebtCheckout(item.id);
      toastSuccess(`Đã duyệt trả phòng còn nợ cho Booking #${item.bookingId}. Phòng đã chuyển sang cần dọn!`);
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi phê duyệt yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toastError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionLoading(true);
    try {
      await debtApprovalApi.rejectDebtCheckout(rejectingItem.id, rejectReason.trim());
      toastSuccess(`Đã từ chối yêu cầu của Booking #${rejectingItem.bookingId}.`);
      setRejectingItem(null);
      setRejectReason('');
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendAcknowledgement = async (item) => {
    if (!item.guestEmail) {
      toastError('Khách chưa có email. Vui lòng cập nhật hồ sơ khách trước khi gửi giấy xác nhận công nợ.');
      return;
    }
    setActionLoading(true);
    try {
      const response = await debtApprovalApi.sendAcknowledgement(item.id);
      toastSuccess(response.message || `Đã gửi giấy xác nhận tới ${item.guestEmail}.`);
      fetchData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể gửi giấy xác nhận công nợ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintAcknowledgement = async (item) => {
    setActionLoading(true);
    try {
      setPrintingAcknowledgement(await debtApprovalApi.getAcknowledgement(item.id));
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể tải giấy xác nhận công nợ.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Quản lý Công nợ & Phê duyệt trả phòng còn nợ" maxWidth="max-w-5xl">
        <div className="space-y-4">
          {/* Header tabs & refresh */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border-grey pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('debts')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'debts'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <IoCashOutline size={16} />
                <span>Danh sách công nợ chờ thu ({debts.length})</span>
              </button>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
                    activeTab === 'pending'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <IoTimeOutline size={16} />
                  <span>Yêu cầu chờ duyệt ({pendingRequests.length})</span>
                  {pendingRequests.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  )}
                </button>
              )}
            </div>

            <Button size="sm" variant="ghost" onClick={fetchData} icon={IoRefreshOutline} disabled={loading}>
              Làm mới
            </Button>
          </div>

          {/* TAB 1: DANH SÁCH CÔNG NỢ */}
          {activeTab === 'debts' && (
            <div className="overflow-x-auto">
              <div className="mb-2 p-2.5 bg-surface-container-low rounded text-xs text-on-surface-variant flex items-center gap-2 border border-border-grey">
                <IoAlertCircleOutline size={16} className="text-primary shrink-0" />
                <span>Danh sách được sắp xếp tự động theo <strong>số ngày quá hạn giảm dần</strong>. Khoản nợ sẽ tự động rời khỏi danh sách khi khách thanh toán đủ hóa đơn.</span>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-grey font-label-md text-on-surface-variant uppercase text-xs">
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3">Phòng / Đặt phòng</th>
                    <th className="p-3 text-right">Số tiền nợ</th>
                    <th className="p-3 text-center">Hạn thu</th>
                    <th className="p-3 text-center">Tình trạng quá hạn</th>
                    <th className="p-3">Lý do & Người duyệt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-on-surface-variant">Đang tải dữ liệu công nợ...</td>
                    </tr>
                  ) : debts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-on-surface-variant">Hiện không có khoản công nợ nào cần thu.</td>
                    </tr>
                  ) : (
                    debts.map((item) => (
                      <tr key={item.id} className="border-b border-border-grey hover:bg-surface-container-low/50">
                        <td className="p-3 font-medium text-on-surface">
                          <div>{item.guestName}</div>
                          <div className="text-xs text-on-surface-variant">{item.guestPhone || 'Không có SĐT'}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-primary">{item.roomNumber ? `Phòng ${item.roomNumber}` : 'Chưa gán'}</span>
                          <div className="text-xs text-on-surface-variant">Booking #{item.bookingId}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">
                          {formatPrice(item.debtAmount)}
                        </td>
                        <td className="p-3 text-center">
                          {item.dueDate}
                        </td>
                        <td className="p-3 text-center">
                          {item.daysOverdue > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              Quá hạn {item.daysOverdue} ngày
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              Trong hạn
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          <div className="italic">"{item.reason}"</div>
                          <div className="text-outline mt-0.5">Duyệt bởi: {item.approvedByName || 'Chủ cơ sở'}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePrintAcknowledgement(item)}
                              disabled={actionLoading}
                              title="In hoặc lưu PDF giấy xác nhận công nợ"
                              className="inline-flex items-center gap-1 border border-border-grey bg-white px-2 py-1 text-xs font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
                            >
                              <IoPrintOutline size={14} /> In / PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendAcknowledgement(item)}
                              disabled={actionLoading || !item.guestEmail}
                              title={item.guestEmail ? 'Gửi lại giấy xác nhận qua email' : 'Khách chưa có email'}
                              className="inline-flex items-center gap-1 border border-border-grey bg-white px-2 py-1 text-xs font-medium text-on-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <IoMailOutline size={14} /> {item.documentSentAt ? 'Gửi lại' : 'Gửi email'}
                            </button>
                          </div>
                          <div className="mt-1 text-[11px] text-outline">
                            {item.documentSentAt
                              ? `Đã gửi tới ${item.documentSentTo || item.guestEmail} lúc ${new Date(item.documentSentAt).toLocaleString('vi-VN')}`
                              : item.guestEmail ? `Chưa gửi tới ${item.guestEmail}` : 'Khách chưa có email'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: YÊU CẦU CHỜ DUYỆT (CHỦ CƠ SỞ) */}
          {activeTab === 'pending' && isOwnerOrAdmin && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-grey font-label-md text-on-surface-variant uppercase text-xs">
                    <th className="p-3">Đặt phòng / Khách</th>
                    <th className="p-3 text-right">Số tiền nợ</th>
                    <th className="p-3 text-center">Hạn thu dự kiến</th>
                    <th className="p-3">Lý do & Người gửi</th>
                    <th className="p-3 text-center w-48">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-on-surface-variant">Đang tải yêu cầu...</td>
                    </tr>
                  ) : pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-on-surface-variant">Không có yêu cầu trả phòng còn nợ nào đang chờ duyệt.</td>
                    </tr>
                  ) : (
                    pendingRequests.map((item) => (
                      <tr key={item.id} className="border-b border-border-grey hover:bg-surface-container-low/50">
                        <td className="p-3">
                          <div className="font-semibold text-primary">Phòng {item.roomNumber || '---'} (Booking #{item.bookingId})</div>
                          <div className="text-on-surface font-medium">{item.guestName} - {item.guestPhone}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-red-600 text-base">
                          {formatPrice(item.debtAmount)}
                        </td>
                        <td className="p-3 text-center font-medium">
                          {item.dueDate}
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          <div className="font-medium text-on-surface">{item.reason}</div>
                          <div className="text-outline mt-0.5">Đề nghị bởi: {item.requestedByName}</div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              icon={IoCheckmarkCircleOutline}
                              disabled={actionLoading}
                              onClick={() => handleApprove(item)}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={IoCloseCircleOutline}
                              disabled={actionLoading}
                              onClick={() => {
                                setRejectingItem(item);
                                setRejectReason('');
                              }}
                            >
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
      {printingAcknowledgement && (
        <DebtAcknowledgementPrintTemplate
          data={printingAcknowledgement}
          onClose={() => setPrintingAcknowledgement(null)}
          onPrint={() => debtApprovalApi.logDocument(printingAcknowledgement.debtRequestId, 'PRINT')}
        />
      )}

      {/* Modal Từ chối */}
      {rejectingItem && (
        <Modal isOpen={!!rejectingItem} onClose={() => setRejectingItem(null)} title="Từ chối yêu cầu trả phòng còn nợ" maxWidth="max-w-md">
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-sm text-on-surface">
              Từ chối yêu cầu nợ của đặt phòng <strong>#{rejectingItem.bookingId}</strong> ({rejectingItem.guestName}):
            </p>
            <div>
              <label className="block font-label-md text-on-surface-variant mb-1.5">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do không chấp thuận cho nợ..."
                className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={() => setRejectingItem(null)} disabled={actionLoading}>
                Hủy
              </Button>
              <Button type="submit" variant="danger" disabled={actionLoading}>
                {actionLoading ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default DebtManagementModal;
