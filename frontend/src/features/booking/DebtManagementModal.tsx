import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs/Tabs';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoCashOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoAlertCircleOutline,
  IoRefreshOutline,
  IoMailOutline,
  IoPrintOutline
} from 'react-icons/io5';
import DebtAcknowledgementPrintTemplate from './DebtAcknowledgementPrintTemplate';
import { DebtApprovalResponseDto } from '../../types';

interface DebtManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

const DebtManagementModal: React.FC<DebtManagementModalProps> = ({ isOpen, onClose, onRefreshData }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'debts' | 'pending'>('debts');
  const [debts, setDebts] = useState<DebtApprovalResponseDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DebtApprovalResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [printingAcknowledgement, setPrintingAcknowledgement] = useState<any>(null);

  // Reject state
  const [rejectingItem, setRejectingItem] = useState<DebtApprovalResponseDto | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

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

  const handleApprove = async (item: DebtApprovalResponseDto) => {
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
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi phê duyệt yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem || !rejectReason.trim()) {
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
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendAcknowledgement = async (item: DebtApprovalResponseDto) => {
    if (!item.guestEmail) {
      toastError('Khách chưa có email. Vui lòng cập nhật hồ sơ khách trước khi gửi giấy xác nhận công nợ.');
      return;
    }
    setActionLoading(true);
    try {
      const response = await debtApprovalApi.sendAcknowledgement(item.id);
      toastSuccess(response.message || `Đã gửi giấy xác nhận tới ${item.guestEmail}.`);
      fetchData();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Không thể gửi giấy xác nhận công nợ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintAcknowledgement = async (item: DebtApprovalResponseDto) => {
    setActionLoading(true);
    try {
      setPrintingAcknowledgement(await debtApprovalApi.getAcknowledgement(item.id));
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Không thể tải giấy xác nhận công nợ.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (val?: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Quản lý Công nợ & Phê duyệt trả phòng còn nợ" maxWidth="max-w-5xl">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border-grey pb-3">
            <Tabs
              tabs={[
                { id: 'debts', label: `Danh sách công nợ đang theo dõi (${debts.length})` },
                ...(isOwnerOrAdmin ? [{ id: 'pending', label: `Chờ phê duyệt${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` }] : [])
              ]}
              value={activeTab}
              onChange={(tabId) => setActiveTab(tabId as 'debts' | 'pending')}
              variant="pill"
              className="mb-0"
            />

            <Button size="sm" variant="ghost" onClick={fetchData} icon={IoRefreshOutline} disabled={loading}>
              Làm mới
            </Button>
          </div>

          {activeTab === 'debts' ? (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-border-grey rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-container-low border-b border-border-grey uppercase font-semibold text-on-surface-variant">
                    <tr>
                      <th className="p-2.5">Mã / Đặt phòng</th>
                      <th className="p-2.5">Khách hàng</th>
                      <th className="p-2.5 text-right">Số tiền nợ</th>
                      <th className="p-2.5">Hạn thanh toán</th>
                      <th className="p-2.5">Trạng thái</th>
                      <th className="p-2.5">Lý do</th>
                      <th className="p-2.5 text-center w-36">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {loading ? (
                      <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Đang tải danh sách công nợ...</td></tr>
                    ) : debts.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có hồ sơ công nợ nào đang tồn tại.</td></tr>
                    ) : (
                      debts.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-low/40">
                          <td className="p-2.5 font-semibold text-primary">#{item.bookingId}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-on-surface">{item.guestName || 'Khách lưu trú'}</div>
                            <div className="text-[11px] text-on-surface-variant font-mono">{item.guestPhone || '---'}</div>
                          </td>
                          <td className="p-2.5 text-right font-bold text-red-600 font-mono">
                            {formatPrice(item.debtAmount)}
                          </td>
                          <td className="p-2.5 font-mono">{item.dueDate || '---'}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                              {item.status || 'APPROVED'}
                            </span>
                          </td>
                          <td className="p-2.5 text-on-surface-variant italic truncate max-w-xs" title={item.reason}>
                            {item.reason || '---'}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrintAcknowledgement(item)}
                                className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors cursor-pointer"
                                title="In giấy xác nhận công nợ"
                                disabled={actionLoading}
                              >
                                <IoPrintOutline size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendAcknowledgement(item)}
                                className="p-1 text-on-surface-variant hover:text-blue-600 rounded hover:bg-surface-container transition-colors cursor-pointer"
                                title="Gửi email giấy xác nhận công nợ"
                                disabled={actionLoading}
                              >
                                <IoMailOutline size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-border-grey rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-container-low border-b border-border-grey uppercase font-semibold text-on-surface-variant">
                    <tr>
                      <th className="p-2.5">Mã đặt phòng</th>
                      <th className="p-2.5">Khách hàng</th>
                      <th className="p-2.5 text-right">Số tiền xin nợ</th>
                      <th className="p-2.5">Hạn thanh toán</th>
                      <th className="p-2.5">Người đề xuất</th>
                      <th className="p-2.5">Lý do</th>
                      <th className="p-2.5 text-center w-36">Phê duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {loading ? (
                      <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Đang tải yêu cầu chờ duyệt...</td></tr>
                    ) : pendingRequests.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có yêu cầu nào đang chờ phê duyệt.</td></tr>
                    ) : (
                      pendingRequests.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-low/40">
                          <td className="p-2.5 font-semibold text-primary">#{item.bookingId}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-on-surface">{item.guestName || 'Khách lưu trú'}</div>
                            <div className="text-[11px] text-on-surface-variant font-mono">{item.guestPhone || '---'}</div>
                          </td>
                          <td className="p-2.5 text-right font-bold text-amber-700 font-mono">
                            {formatPrice(item.debtAmount)}
                          </td>
                          <td className="p-2.5 font-mono">{item.dueDate || '---'}</td>
                          <td className="p-2.5 text-on-surface-variant">{item.requestedByName || 'Lễ tân'}</td>
                          <td className="p-2.5 text-on-surface-variant italic truncate max-w-xs" title={item.reason}>
                            {item.reason || '---'}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(item)}
                                className="px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded font-medium transition-colors cursor-pointer"
                                disabled={actionLoading}
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingItem(item)}
                                className="px-2 py-1 text-xs text-red-600 border border-red-300 hover:bg-red-50 rounded font-medium transition-colors cursor-pointer"
                                disabled={actionLoading}
                              >
                                Từ chối
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal từ chối yêu cầu nợ */}
      {rejectingItem && (
        <Modal isOpen={!!rejectingItem} onClose={() => setRejectingItem(null)} title="Từ chối yêu cầu trả phòng còn nợ" maxWidth="max-w-md">
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-xs text-on-surface">
              Từ chối cho đặt phòng <strong>#{rejectingItem.bookingId}</strong> ({rejectingItem.guestName || ''}) trả phòng còn nợ {formatPrice(rejectingItem.debtAmount)}.
            </p>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Lý do từ chối *</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Không áp dụng nợ với khách chưa có hợp đồng doanh nghiệp..."
                className="w-full px-3 py-2 border border-border-grey rounded text-xs focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setRejectingItem(null)}>Hủy</Button>
              <Button variant="danger" size="sm" type="submit" isLoading={actionLoading}>Xác nhận từ chối</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Template in giấy xác nhận công nợ */}
      {printingAcknowledgement && (
        <DebtAcknowledgementPrintTemplate
          data={printingAcknowledgement}
          onClose={() => setPrintingAcknowledgement(null)}
        />
      )}
    </>
  );
};

export default DebtManagementModal;
