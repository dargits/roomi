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
  IoCalendarOutline,
  IoTimeOutline,
  IoCloseOutline,
  IoCashOutline,
  IoBedOutline
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

  // KPI calculations
  const stats = useMemo(() => {
    const pendingCount = pendingRequests.length;
    
    // Remaining debts waiting to be collected
    const realDebts = activeDebts.filter(d => (d.debtAmount || 0) > 0);
    const totalRemainingDebt = realDebts.reduce((sum, d) => sum + (d.debtAmount || 0), 0);
    
    // Overdue debts (only count if remaining debt > 0 and daysOverdue > 0)
    const overdueDebts = realDebts.filter(d => (d.daysOverdue || 0) > 0);
    
    // Total recovered / paid amount across approved requests
    const totalRecovered = allRequests
      .filter(d => d.status === 'APPROVED')
      .reduce((sum, d) => sum + (d.paidAmount || 0), 0);

    return {
      pendingCount,
      totalRemainingDebt,
      activeDebtCount: realDebts.length,
      overdueCount: overdueDebts.length,
      totalRecovered
    };
  }, [pendingRequests, activeDebts, allRequests]);

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
            className="flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin text-primary' : ''} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chờ duyệt */}
        <div 
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeTab === 'pending'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-border-grey hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Chờ phê duyệt</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.pendingCount > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}>
              <IoAlertCircleOutline size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.pendingCount}</span>
            <span className="text-xs text-slate-500">yêu cầu</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cần Chủ cơ sở xem xét</p>
        </div>

        {/* Card 2: Công nợ chờ thu */}
        <div 
          onClick={() => setActiveTab('active')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeTab === 'active'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/30'
              : 'bg-white border-border-grey hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Công nợ chờ thu</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <IoWalletOutline size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-blue-700 block truncate">
              {fmtCurrency(stats.totalRemainingDebt)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats.activeDebtCount} hồ sơ chưa tất toán</p>
        </div>

        {/* Card 3: Nợ quá hạn */}
        <div className="p-4 rounded-2xl bg-white border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Công nợ quá hạn</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <IoTimeOutline size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.overdueCount}
            </span>
            <span className="text-xs text-slate-500">hồ sơ quá hạn</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.overdueCount > 0 ? 'Cần liên hệ nhắc hạn thanh toán' : 'Không có khoản nợ quá hạn'}
          </p>
        </div>

        {/* Card 4: Đã thu hồi */}
        <div className="p-4 rounded-2xl bg-white border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã thu hồi được</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <IoCashOutline size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-700 block truncate">
              {fmtCurrency(stats.totalRecovered)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tiền công nợ đã quyết toán xong</p>
        </div>
      </div>

      {/* Warning banner nếu có yêu cầu pending */}
      {pendingRequests.length > 0 && activeTab !== 'pending' && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl shadow-xs flex items-center justify-center shrink-0 animate-bounce">
              <IoAlertCircleOutline size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                Có {pendingRequests.length} yêu cầu trả phòng còn nợ đang chờ Chủ cơ sở phê duyệt!
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Khách làm thủ tục check-out nhưng chưa thanh toán đủ tiền, lễ tân đã tạo giấy cam kết công nợ.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <span>Xử lý ngay ({pendingRequests.length})</span>
          </button>
        </div>
      )}

      {/* Tabs & Search Filter */}
      <div className="bg-white border border-border-grey rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons (Segmented Control) */}
        <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-slate-200/80 text-xs self-start md:self-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Yêu cầu chờ duyệt</span>
            {pendingRequests.length > 0 ? (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse">
                {pendingRequests.length}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">0</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Công nợ chờ thu</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
              {stats.activeDebtCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tất cả lịch sử</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
              {allRequests.length}
            </span>
          </button>
        </div>

        {/* Search box */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách, SĐT, số phòng, mã..."
            className="w-full py-1.5 pl-8 pr-7 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
          />
          <IoSearchOutline size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <IoCloseOutline size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <IoRefreshOutline size={32} className="animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm font-semibold text-slate-600">Đang tải danh sách công nợ...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <IoWalletOutline size={28} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {activeTab === 'pending'
                ? 'Không có yêu cầu trả phòng còn nợ nào đang chờ duyệt'
                : 'Không tìm thấy hồ sơ công nợ nào'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'pending'
                ? 'Khi lễ tân gửi yêu cầu bảo lãnh nợ lúc check-out, thông tin sẽ xuất hiện tại đây để Chủ cơ sở phê duyệt.'
                : 'Thử kiểm tra lại từ khóa tìm kiếm hoặc chuyển sang tab khác.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 min-w-[240px]">Mã đơn / Khách hàng</th>
                  <th className="py-3.5 px-4 min-w-[100px] text-center">Phòng</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-right">Tổng hóa đơn</th>
                  <th className="py-3.5 px-4 min-w-[150px] text-right">Công nợ còn lại</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Hạn trả nợ</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Lý do & Cam kết</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center">Trạng thái</th>
                  <th className="py-3.5 px-5 min-w-[120px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {currentList.map((item) => {
                  const isPending = item.status === 'PENDING';
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  // Calculated debt values
                  const remainingDebt = isApproved ? (item.debtAmount ?? 0) : (isRejected ? 0 : (item.debtAmount ?? 0));
                  const isFullyPaid = isApproved && remainingDebt <= 0;
                  const isOverdue = remainingDebt > 0 && (item.daysOverdue ?? 0) > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Guest Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                            isPending 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : isApproved
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {item.guestName?.[0]?.toUpperCase() || 'K'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm group-hover:text-primary transition-colors">
                                {item.guestName || 'Khách vãng lai'}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 font-semibold">
                                #{item.bookingId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {item.guestPhone || 'Chưa có SĐT'} {item.guestEmail ? `• ${item.guestEmail}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Tạo bởi: {item.requestedByName || 'Lễ tân'}</span>
                              <span>•</span>
                              <span>{item.requestedAt ? new Date(item.requestedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-4 px-4 text-center">
                        {item.roomNumber ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold">
                            <IoBedOutline size={13} className="text-slate-500" />
                            <span>P. {item.roomNumber}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">P. #{item.bookingId}</span>
                        )}
                      </td>

                      {/* Invoice Total */}
                      <td className="py-4 px-4 text-right font-medium text-slate-700">
                        {fmtCurrency(item.totalAmount)}
                      </td>

                      {/* Debt Amount */}
                      <td className="py-4 px-4 text-right">
                        {isFullyPaid ? (
                          <div>
                            <span className="font-bold text-slate-500 text-sm block">0 ₫</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                              <IoCheckmarkCircleOutline size={11} />
                              <span>Đã tất toán</span>
                            </span>
                            {item.paidAmount != null && item.paidAmount > 0 && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Đã thu: {fmtCurrency(item.paidAmount)}
                              </span>
                            )}
                          </div>
                        ) : isRejected ? (
                          <div>
                            <span className="font-bold text-slate-400 text-sm block">0 ₫</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Không duyệt nợ</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-black text-rose-600 text-sm block">
                              {fmtCurrency(item.debtAmount)}
                            </span>
                            {item.paidAmount != null && item.paidAmount > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">
                                Đã thu: {fmtCurrency(item.paidAmount)}
                              </span>
                            )}
                          </div>
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
                        {/* Only show overdue warning if remaining debt is greater than 0 */}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            <IoAlertCircleOutline size={12} className="shrink-0 text-rose-500" />
                            <span>Quá hạn {item.daysOverdue} ngày</span>
                          </span>
                        )}
                        {!isOverdue && !isFullyPaid && !isRejected && item.dueDate && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">Trong hạn</span>
                        )}
                      </td>

                      {/* Reason & Notes */}
                      <td className="py-4 px-4">
                        <div className="max-w-xs">
                          <p className="text-slate-700 font-medium text-xs line-clamp-2" title={item.reason}>
                            {item.reason || 'Khách cam kết thanh toán sau'}
                          </p>
                          {item.rejectReason && (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200/80 text-[11px] text-rose-800">
                              <span className="font-bold">Lý do từ chối:</span> {item.rejectReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Badges - Always whitespace-nowrap */}
                      <td className="py-4 px-4 text-center">
                        {isPending && (
                          <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Chờ duyệt</span>
                          </span>
                        )}
                        {isApproved && (
                          isFullyPaid ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                              <IoCheckmarkCircleOutline size={14} className="text-emerald-600 shrink-0" />
                              <span>Đã tất toán</span>
                            </span>
                          ) : (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs">
                              <IoWalletOutline size={14} className="text-blue-600 shrink-0" />
                              <span>Đã duyệt nợ</span>
                            </span>
                          )
                        )}
                        {isRejected && (
                          <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs">
                            <IoCloseCircleOutline size={14} className="text-rose-600 shrink-0" />
                            <span>Đã từ chối</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="Phê duyệt cho khách trả phòng còn nợ"
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
                                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Từ chối yêu cầu bảo lãnh nợ"
                              >
                                <IoCloseCircleOutline size={14} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePrint(item)}
                                className="p-2 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/10 border border-border-grey hover:border-primary/40 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                title="In giấy cam kết / biên nhận công nợ"
                              >
                                <IoPrintOutline size={15} />
                              </button>
                              <button
                                onClick={() => handleSendEmail(item)}
                                className="p-2 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/10 border border-border-grey hover:border-primary/40 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                title="Gửi email biên nhận nợ cho khách hàng"
                              >
                                <IoMailOutline size={15} />
                              </button>
                            </div>
                          )}

                          {isRejected && (
                            <span className="text-[11px] text-slate-400 italic">Đã đóng</span>
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
              <strong className="text-rose-600">{fmtCurrency(rejectingItem.debtAmount)}</strong>. Vui lòng ghi rõ lý do để lễ tân xử lý lại với khách.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Yêu cầu khách đặt cọc tài sản hoặc thanh toán tối thiểu 50% trước khi rời đi..."
                rows={3}
                required
                className="w-full text-xs p-3 border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
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
