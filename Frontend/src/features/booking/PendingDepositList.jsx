import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoCashOutline, 
  IoSearchOutline, 
  IoRefreshOutline, 
  IoEyeOutline, 
  IoAlertCircleOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';
import depositApi from '../../services/depositApi';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';

const fmtCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtDateTime = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleString('vi-VN');
};

const PendingDepositList = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const data = await depositApi.getUnsettledDeposits();
      setDeposits(data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách cọc chưa quyết toán:', err);
      toastError('Không thể tải danh sách cọc chưa quyết toán');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    const matchesSearch = 
      (d.bookingId && String(d.bookingId).includes(searchTerm)) ||
      (d.collectedByName && d.collectedByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.note && d.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = filteredDeposits.reduce((sum, d) => sum + Number(d.collectedAmount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header filter & summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-border-grey shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Tìm mã booking, người thu, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-border-grey rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <IoSearchOutline size={16} className="absolute left-3 top-2.5 text-on-surface-variant" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container border border-border-grey rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="COLLECTED">Đã thu đủ</option>
            <option value="SHORT_PAID">Thu thiếu (Có lý do)</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchDeposits} icon={IoRefreshOutline}>
            Làm mới
          </Button>
        </div>

        {/* Tổng tiền cọc đang giữ */}
        <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-3">
          <IoCashOutline size={22} className="text-primary" />
          <div>
            <div className="text-[11px] text-on-surface-variant font-medium">Tổng tiền cọc chưa quyết toán</div>
            <div className="text-base font-bold text-primary">{fmtCurrency(totalCollected)}</div>
          </div>
        </div>
      </div>

      {/* Table list */}
      <div className="bg-surface-container-lowest rounded-xl border border-border-grey shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-on-surface-variant">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            Đang tải danh sách khoản cọc chưa quyết toán...
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant space-y-2">
            <IoCheckmarkCircleOutline size={40} className="mx-auto text-green-500" />
            <div className="font-semibold text-on-surface">Không có khoản cọc nào chưa quyết toán</div>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Tất cả các khoản đặt cọc đã được khấu trừ vào hóa đơn khi thanh toán hoặc đã được xử lý hoàn/phạt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low border-b border-border-grey text-xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Mã cọc</th>
                  <th className="py-3.5 px-4 font-semibold">Mã Booking</th>
                  <th className="py-3.5 px-4 font-semibold">Yêu cầu</th>
                  <th className="py-3.5 px-4 font-semibold">Thực thu</th>
                  <th className="py-3.5 px-4 font-semibold">PT Thanh toán</th>
                  <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold">Người thu & Thời gian</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey/60">
                {filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-on-surface">#{d.id}</td>
                    <td className="py-3 px-4">
                      {d.bookingId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/manage/bookings/${d.bookingId}?tab=deposit`)}
                          className="font-semibold text-primary hover:underline"
                        >
                          Booking #{d.bookingId}
                        </button>
                      ) : (
                        <span className="text-on-surface-variant italic">Đoàn</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant font-mono">
                      {fmtCurrency(d.requiredAmount)}
                    </td>
                    <td className="py-3 px-4 font-bold text-green-700 font-mono">
                      {fmtCurrency(d.collectedAmount)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface">
                        {d.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' :
                         d.paymentMethod === 'CASH' ? 'Tiền mặt' :
                         d.paymentMethod === 'CREDIT_CARD' ? 'Thẻ' : d.paymentMethod || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {d.status === 'COLLECTED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Đã thu đủ
                        </span>
                      ) : d.status === 'SHORT_PAID' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" title={d.shortPaidReason}>
                          <IoWarningOutline size={12} /> Thu thiếu
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant">{d.status}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant">
                      <div className="font-medium text-on-surface">{d.collectedByName || '—'}</div>
                      <div className="text-[11px]">{fmtDateTime(d.collectedAt || d.createdAt)}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.bookingId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={IoEyeOutline}
                          onClick={() => navigate(`/manage/bookings/${d.bookingId}?tab=deposit`)}
                        >
                          Xem chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingDepositList;
