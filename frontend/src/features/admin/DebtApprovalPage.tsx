import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import { 
  IoWalletOutline, 
  IoRefreshOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoAlertCircleOutline,
  IoSearchOutline,
  IoPrintOutline,
  IoMailOutline,
  IoCalendarOutline
} from 'react-icons/io5';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DebtAcknowledgementPrintTemplate from '../booking/DebtAcknowledgementPrintTemplate';
import { DebtApprovalResponseDto } from '../../types';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const DebtApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [pendingRequests, setPendingRequests] = useState<DebtApprovalResponseDto[]>([]);
  const [activeDebts, setActiveDebts] = useState<DebtApprovalResponseDto[]>([]);
  const [allRequests, setAllRequests] = useState<DebtApprovalResponseDto[]>([]);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<DebtApprovalResponseDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [printData, setPrintData] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingData, debtsData, allData] = await Promise.all([
        debtApprovalApi.getPendingRequests().catch(() => []),
        debtApprovalApi.getActiveDebts().catch(() => []),
        debtApprovalApi.getAllRequests().catch(() => [])
      ]);
      setPendingRequests(pendingData || []);
      setActiveDebts(debtsData || []);
      setAllRequests(allData || []);
    } catch (err) {
      console.error('Fetch debt approvals error', err);
      toastError('Không thể tải danh sách phê duyệt công nợ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (item: DebtApprovalResponseDto) => {
    const isConfirmed = await confirm({
      title: 'Phê duyệt trả phòng còn nợ',
      message: `Xác nhận phê duyệt cho đặt phòng #${item.bookingId} (${item.guestName || 'Khách'}) trả phòng còn nợ ${fmtCurrency(item.debtAmount)}?`,
      confirmText: 'Phê duyệt ngay',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      await debtApprovalApi.approveDebtCheckout(item.id);
      toastSuccess(`Đã phê duyệt cho Booking #${item.bookingId} trả phòng còn nợ thành công!`);
      fetchData();
    } catch (err: any) {
      console.error('Approve debt error', err);
      toastError(err.response?.data?.message || 'Lỗi khi phê duyệt yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
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
    } catch (err: any) {
      console.error('Reject debt error', err);
      toastError(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async (item: DebtApprovalResponseDto) => {
    try {
      const data = await debtApprovalApi.getAcknowledgement(item.id);
      setPrintData(data);
    } catch (err) {
      console.error('Get acknowledgement error', err);
      toastError('Không thể tải biên nhận công nợ để in.');
    }
  };

  const handleSendEmail = async (item: DebtApprovalResponseDto) => {
    try {
      await debtApprovalApi.sendAcknowledgement(item.id);
      toastSuccess(`Đã gửi email biên nhận công nợ tới khách hàng ${item.guestName || ''}.`);
    } catch (err: any) {
      console.error('Send email error', err);
      toastError(err.response?.data?.message || 'Không thể gửi email biên nhận công nợ.');
    }
  };

  const currentList = useMemo(() => {
    let list: DebtApprovalResponseDto[] = [];
    if (activeTab === 'pending') list = pendingRequests;
    else if (activeTab === 'active') list = activeDebts;
    else list = allRequests;

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(item => 
      (item.guestName || '').toLowerCase().includes(q) ||
      (item.guestPhone || '').toLowerCase().includes(q) ||
      (item.bookingId?.toString() || '').includes(q) ||
      (item.roomNumber || '').toLowerCase().includes(q)
    );
  }, [activeTab, pendingRequests, activeDebts, allRequests, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={IoWalletOutline}
        title="Phê Duyệt & Quản Lý Công Nợ"
        subtitle="Duyệt các ngoại lệ trả phòng còn nợ do lễ tân đề xuất và theo dõi công nợ khách hàng"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* Warning banner nếu có yêu cầu pending */}
      {pendingRequests.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs shrink-0 animate-pulse">
              <IoAlertCircleOutline size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-red-900">
                Có {pendingRequests.length} yêu cầu trả phòng còn nợ đang chờ Chủ cơ sở phê duyệt!
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                Khách làm thủ tục check-out nhưng chưa thanh toán đủ tiền, lễ tân đã tạo giấy cam kết công nợ.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Xem yêu cầu chờ ({pendingRequests.length})</span>
          </button>
        </div>
      )}

      {/* Tabs & Search Filter */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-border-grey text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-[#002146] shadow-2xs'
                : 'text-slate-600 hover:text-[#002146]'
            }`}
          >
            <span>Yêu cầu chờ duyệt</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-red-600 text-white animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-white text-[#002146] shadow-2xs'
                : 'text-slate-600 hover:text-[#002146]'
            }`}
          >
            <span>Công nợ chờ thu</span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
              {activeDebts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-[#002146] shadow-2xs'
                : 'text-slate-600 hover:text-[#002146]'
            }`}
          >
            Tất cả lịch sử ({allRequests.length})
          </button>
        </div>

        {/* Search box */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo khách, SĐT, mã đặt phòng..."
            className="py-1.5 pl-8 pr-3 text-xs bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary w-full md:w-64"
          />
          <IoSearchOutline size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <IoRefreshOutline size={32} className="animate-spin mx-auto mb-2 text-[#0070F4]" />
            <p className="text-sm font-semibold">Đang tải danh sách công nợ...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <IoWalletOutline size={40} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#002146]">
              {activeTab === 'pending'
                ? 'Không có yêu cầu trả phòng còn nợ nào đang chờ duyệt'
                : 'Không tìm thấy dữ liệu công nợ nào'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'pending'
                ? 'Khi lễ tân gửi yêu cầu bảo lãnh nợ, yêu cầu sẽ hiển thị tại đây.'
                : 'Thử kiểm tra lại từ khóa tìm kiếm.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Mã đơn / Khách hàng</th>
                  <th className="py-3.5 px-4">Số phòng</th>
                  <th className="py-3.5 px-4 text-right">Tổng hóa đơn</th>
                  <th className="py-3.5 px-4 text-right">Số tiền nợ</th>
                  <th className="py-3.5 px-4">Hạn trả nợ</th>
                  <th className="py-3.5 px-4">Lý do & Cam kết</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {currentList.map((item) => {
                  const isPending = item.status === 'PENDING';
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Guest Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EBF3FF] text-[#0070F4] font-bold text-xs flex items-center justify-center shrink-0">
                            {item.guestName?.[0]?.toUpperCase() || 'K'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[#002146] text-sm group-hover:text-primary transition-colors">
                                {item.guestName || 'Khách vãng lai'}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{item.bookingId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {item.guestPhone || 'Chưa có SĐT'} {item.guestEmail ? `• ${item.guestEmail}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Tạo bởi: {item.requestedByName || 'Lễ tân'} lúc {item.requestedAt ? new Date(item.requestedAt).toLocaleString('vi-VN') : '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-4 px-4 font-bold text-[#002146]">
                        {item.roomNumber ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#EBF3FF] text-[#0070F4] border border-[#BFDBFE] text-xs font-bold">
                            P. {item.roomNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">P. #{item.bookingId}</span>
                        )}
                      </td>

                      {/* Invoice Total */}
                      <td className="py-4 px-4 text-right font-medium text-slate-600">
                        {fmtCurrency(item.totalAmount)}
                      </td>

                      {/* Debt Amount */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-extrabold text-red-600 text-sm block">
                          {fmtCurrency(item.debtAmount)}
                        </span>
                        {item.paidAmount != null && item.paidAmount > 0 && (
                          <span className="text-[11px] text-emerald-600 block">
                            Đã thu: {fmtCurrency(item.paidAmount)}
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <IoCalendarOutline size={14} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">
                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString('vi-VN') : 'Chưa đặt hạn'}
                          </span>
                        </div>
                        {item.daysOverdue != null && item.daysOverdue > 0 && (
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Quá hạn {item.daysOverdue} ngày
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-700 font-medium truncate" title={item.reason}>
                          {item.reason || 'Khách cam kết thanh toán sau'}
                        </p>
                        {item.rejectReason && (
                          <p className="text-[11px] text-red-600 mt-0.5 truncate" title={`Lý do từ chối: ${item.rejectReason}`}>
                            Từ chối: {item.rejectReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            Chờ duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                            Đã duyệt nợ
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                            Đã từ chối
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Phê duyệt trả phòng còn nợ"
                              >
                                <IoCheckmarkCircleOutline size={14} />
                                <span>Duyệt</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingItem(item);
                                  setRejectReason('');
                                }}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Từ chối yêu cầu"
                              >
                                <IoCloseCircleOutline size={14} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <>
                              <button
                                onClick={() => handlePrint(item)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-[#0070F4] hover:bg-blue-50 border border-border-grey transition-colors cursor-pointer"
                                title="In biên nhận công nợ"
                              >
                                <IoPrintOutline size={15} />
                              </button>
                              <button
                                onClick={() => handleSendEmail(item)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-[#0070F4] hover:bg-blue-50 border border-border-grey transition-colors cursor-pointer"
                                title="Gửi email biên nhận nợ"
                              >
                                <IoMailOutline size={15} />
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
        )}
      </div>

      {/* Modal Từ Chối Phê Duyệt */}
      {rejectingItem && (
        <Modal
          isOpen={!!rejectingItem}
          onClose={() => setRejectingItem(null)}
          title={`Từ chối yêu cầu nợ #${rejectingItem.bookingId}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-xs text-slate-600">
              Bạn đang từ chối yêu cầu cho khách <strong>{rejectingItem.guestName}</strong> trả phòng còn nợ số tiền{' '}
              <strong className="text-red-600">{fmtCurrency(rejectingItem.debtAmount)}</strong>. Vui lòng ghi rõ lý do để lễ tân xử lý lại với khách.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Yêu cầu khách đặt cọc tài sản hoặc thanh toán tối thiểu 50% trước khi rời đi..."
                rows={3}
                required
                className="w-full text-xs p-3 border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setRejectingItem(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* In biên nhận công nợ */}
      {printData && (
        <DebtAcknowledgementPrintTemplate
          data={printData}
          onClose={() => setPrintData(null)}
          onPrint={() => setPrintData(null)}
        />
      )}
    </div>
  );
};

export default DebtApprovalPage;
