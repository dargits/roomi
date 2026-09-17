import React, { useEffect, useState } from 'react';
import {
  IoTimeOutline,
  IoDownloadOutline,
  IoRefreshOutline,
  IoPersonOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCalendarOutline,
  IoCallOutline,
  IoFilterOutline,
  IoBusinessOutline,
  IoListOutline,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingScreen from '../../components/common/LoadingScreen';
import debtApprovalApi from '../../services/debtApprovalApi';
import DebtCollectionModal from './DebtCollectionModal';
import DebtCollectionHistoryModal from './DebtCollectionHistoryModal';
import CustomerDebtInvoicesModal from './CustomerDebtInvoicesModal';
import {
  DebtAgingReportResponse,
  DebtAgingItemResponse,
  DebtAgingBucketDto,
  CustomerDebtSummaryDto
} from '../../types/report';

const BUCKET_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả nhóm tuổi nợ' },
  { value: 'CURRENT', label: 'Trong hạn' },
  { value: 'OVERDUE_UNDER_15', label: 'Quá hạn < 15 ngày' },
  { value: 'OVERDUE_15_TO_30', label: 'Từ 15 - 30 ngày' },
  { value: 'OVERDUE_OVER_30', label: 'Trên 30 ngày' }
];

const REMINDER_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái nhắc' },
  { value: 'DUE_TODAY', label: '🔔 Cần nhắc hôm nay' },
  { value: 'OVERDUE_REMINDER', label: '⚠️ Quá hạn nhắc' },
  { value: 'UPCOMING', label: '📅 Đã lên lịch nhắc' },
  { value: 'NONE', label: 'Chưa đặt lịch nhắc' }
];

const BUCKET_COLORS: Record<string, { bg: string; text: string; border: string; bar: string; badge: string }> = {
  CURRENT: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  OVERDUE_UNDER_15: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800'
  },
  OVERDUE_15_TO_30: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800'
  },
  OVERDUE_OVER_30: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-800'
  }
};

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtDate = (str?: string) => {
  if (!str) return '—';
  const parts = str.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
};

const DebtAgingReport: React.FC = () => {
  const [data, setData] = useState<DebtAgingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [fromCheckout, setFromCheckout] = useState<string>('');
  const [toCheckout, setToCheckout] = useState<string>('');
  const [bucketFilter, setBucketFilter] = useState<string>('');
  const [reminderFilter, setReminderFilter] = useState<string>('');
  const [selectedGuestId, setSelectedGuestId] = useState<number | undefined>(undefined);

  // View mode
  const [viewMode, setViewMode] = useState<'detail' | 'customer'>('detail');

  // Modals state
  const [collectionModalItem, setCollectionModalItem] = useState<DebtAgingItemResponse | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<DebtAgingItemResponse | null>(null);
  const [customerInvoicesModalItem, setCustomerInvoicesModalItem] = useState<CustomerDebtSummaryDto | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await debtApprovalApi.getDebtAgingReport({
        asOfDate: asOfDate || undefined,
        fromCheckout: fromCheckout || undefined,
        toCheckout: toCheckout || undefined,
        guestId: selectedGuestId,
        bucketFilter: bucketFilter || undefined,
        reminderFilter: reminderFilter || undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo tuổi nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [asOfDate, fromCheckout, toCheckout, bucketFilter, reminderFilter, selectedGuestId]);

  const handleExportCsv = async () => {
    try {
      const blob = await debtApprovalApi.exportDebtAgingCsv({
        asOfDate: asOfDate || undefined,
        fromCheckout: fromCheckout || undefined,
        toCheckout: toCheckout || undefined,
        guestId: selectedGuestId,
        bucketFilter: bucketFilter || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-tuoi-no-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Không thể xuất file CSV: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  const handleClearFilters = () => {
    setAsOfDate('');
    setFromCheckout('');
    setToCheckout('');
    setBucketFilter('');
    setReminderFilter('');
    setSelectedGuestId(undefined);
  };

  const selectedGuestName = data?.customerSummaries?.find(c => c.guestId === selectedGuestId)?.guestName;

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Card */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
              <IoTimeOutline className="text-primary text-xl" />
              Báo cáo Tuổi nợ & Nhắc thu công nợ
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Theo dõi quá hạn theo hạn cam kết, tổng hợp nợ theo khách công ty và ghi nhật ký nhắc nợ
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-surface-container rounded-xl border border-border-grey text-xs">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'detail' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => setViewMode('detail')}
              >
                <IoListOutline size={15} />
                Từng hóa đơn
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'customer' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => setViewMode('customer')}
              >
                <IoBusinessOutline size={15} />
                Theo khách hàng
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5"
            >
              <IoDownloadOutline size={16} />
              Xuất Excel (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <IoRefreshOutline size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-border-grey text-xs">
          <div>
            <label className="block font-medium text-on-surface-variant mb-1">
              Ngày chốt (As of)
            </label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              placeholder="Hôm nay"
            />
          </div>

          <div>
            <label className="block font-medium text-on-surface-variant mb-1">
              Kỳ trả phòng từ
            </label>
            <Input
              type="date"
              value={fromCheckout}
              onChange={(e) => setFromCheckout(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-on-surface-variant mb-1">
              Kỳ trả phòng đến
            </label>
            <Input
              type="date"
              value={toCheckout}
              onChange={(e) => setToCheckout(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-on-surface-variant mb-1">
              Nhóm tuổi nợ
            </label>
            <Select
              options={BUCKET_FILTER_OPTIONS}
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-on-surface-variant mb-1">
              Trạng thái nhắc
            </label>
            <Select
              options={REMINDER_FILTER_OPTIONS}
              value={reminderFilter}
              onChange={(e) => setReminderFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Active Guest Filter Badge */}
        {selectedGuestId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs w-fit">
            <span>Đang lọc theo khách: <strong>{selectedGuestName || `#${selectedGuestId}`}</strong></span>
            <button
              type="button"
              className="text-primary hover:text-error ml-1 font-bold cursor-pointer"
              onClick={() => setSelectedGuestId(undefined)}
            >
              ✕ Bỏ lọc
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-error rounded-xl text-sm flex items-center gap-2">
          <IoAlertCircleOutline size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Reconciliation Alert Banner (when filtered by checkout period) */}
      {data?.reconciliation && (
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm ${
            data.reconciliation.matched
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {data.reconciliation.matched ? (
              <IoShieldCheckmarkOutline className="text-emerald-600 text-2xl shrink-0 mt-0.5" />
            ) : (
              <IoAlertCircleOutline className="text-amber-600 text-2xl shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold flex items-center gap-2">
                <span>Đối soát Doanh thu & Tuổi nợ (Kỳ trả phòng: {fmtDate((data.reconciliation as any).fromCheckout || data.reconciliation.periodFrom)} → {fmtDate((data.reconciliation as any).toCheckout || data.reconciliation.periodTo)})</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${data.reconciliation.matched ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                  {data.reconciliation.matched ? 'Khớp 100%' : 'Chênh lệch'}
                </span>
              </div>
              <p className="text-xs mt-1 text-on-surface-variant">
                Công nợ theo kỳ checkout: <strong>{fmtCurrency((data.reconciliation as any).agingCheckoutDebt || data.reconciliation.debtAgingTotal)}</strong> | Doanh thu công nợ ghi nhận: <strong>{fmtCurrency((data.reconciliation as any).revenueReportDebt || data.reconciliation.revenueReportDebt)}</strong>
                {!data.reconciliation.matched && (
                  <span className="text-error font-semibold ml-2">
                    (Chênh lệch: {fmtCurrency(data.reconciliation.discrepancy)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant md:text-right shrink-0">
            {data.reconciliation.matched
              ? 'Toàn bộ doanh thu công nợ trong kỳ đều được theo dõi chặt chẽ trong hệ thống nợ.'
              : 'Vui lòng kiểm tra lại các khoản đã thanh toán sau checkout hoặc hóa đơn hủy.'}
          </div>
        </div>
      )}

      {/* KPI & Aging Buckets Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.buckets?.map((bucket) => {
          const colors = BUCKET_COLORS[bucket.bucketKey] || BUCKET_COLORS.CURRENT;
          const isSelected = bucketFilter === bucket.bucketKey;
          return (
            <div
              key={bucket.bucketKey}
              onClick={() => setBucketFilter(isSelected ? '' : bucket.bucketKey)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                colors.bg
              } ${isSelected ? 'ring-2 ring-primary border-transparent' : colors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {(bucket as any).bucketName || bucket.bucketLabel}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {bucket.invoiceCount} hóa đơn
                </span>
              </div>

              <div className={`text-2xl font-extrabold ${colors.text} mb-3`}>
                {fmtCurrency(bucket.totalAmount)}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bar}`}
                    style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Tỷ trọng</span>
                  <span className="font-semibold text-on-surface">{bucket.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant">Tổng dư nợ toàn hệ thống</div>
            <div className="text-xl font-bold text-on-surface mt-1">
              {fmtCurrency((data as any)?.grandTotalDebt || data?.totalDebtAmount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            💰
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant">Tổng số hóa đơn còn nợ</div>
            <div className="text-xl font-bold text-on-surface mt-1">
              {(data as any)?.totalInvoices || data?.totalDebtCount || 0} hóa đơn
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            📄
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant">Đến hẹn cần nhắc đòi hôm nay</div>
            <div className="text-xl font-bold text-rose-600 mt-1">
              {(data as any)?.remindersDueTodayCount || 0} khoản
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            🔔
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="py-20 text-center">
          <LoadingScreen />
        </div>
      ) : viewMode === 'customer' ? (
        /* CUSTOMER GROUPING VIEW */
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border-grey bg-surface-container-low flex items-center justify-between">
            <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
              <IoBusinessOutline className="text-primary" />
              Tổng hợp công nợ theo Khách hàng / Doanh nghiệp ({data?.customerSummaries?.length || 0})
            </h3>
            <span className="text-xs text-on-surface-variant">
              Click vào tên khách để xem chi tiết các hóa đơn lưu trú của khách đó
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-xs border-b border-border-grey">
                  <th className="p-3 font-semibold">Khách hàng / Doanh nghiệp</th>
                  <th className="p-3 font-semibold">Số điện thoại</th>
                  <th className="p-3 font-semibold text-center">Số lần lưu trú nợ</th>
                  <th className="p-3 font-semibold text-right">Tổng dư nợ</th>
                  <th className="p-3 font-semibold text-center">Hạn cam kết sớm nhất</th>
                  <th className="p-3 font-semibold text-center">Quá hạn cao nhất</th>
                  <th className="p-3 font-semibold text-center">Mức rủi ro</th>
                  <th className="p-3 font-semibold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey">
                {data?.customerSummaries?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-on-surface-variant text-sm">
                      Không có khách hàng nào còn công nợ phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  data?.customerSummaries?.map((cust) => {
                    const isOverdue = (cust as any).maxDaysOverdue > 0 || cust.hasOverdue;
                    return (
                      <tr
                        key={cust.guestId || cust.guestName}
                        className="hover:bg-surface-container-lowest transition-colors"
                      >
                        <td className="p-3 font-semibold text-on-surface">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerInvoicesModalItem(cust);
                            }}
                            className="text-primary hover:underline text-left cursor-pointer"
                          >
                            {cust.guestName}
                          </button>
                        </td>
                        <td className="p-3 text-on-surface-variant">{cust.guestPhone || '—'}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-surface-container font-semibold text-xs">
                            {(cust as any).invoiceCount || cust.stayCount}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-error">
                          {fmtCurrency(cust.totalDebt)}
                        </td>
                        <td className="p-3 text-center text-on-surface-variant">
                          {fmtDate(cust.earliestDueDate)}
                        </td>
                        <td className="p-3 text-center">
                          {(cust as any).maxDaysOverdue > 0 ? (
                            <span className="text-rose-600 font-bold text-xs">
                              {(cust as any).maxDaysOverdue} ngày
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs">Trong hạn</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              (cust as any).highestRiskBucket === 'OVERDUE_OVER_30'
                                ? 'bg-rose-100 text-rose-800'
                                : (cust as any).highestRiskBucket === 'OVERDUE_15_TO_30'
                                ? 'bg-orange-100 text-orange-800'
                                : (cust as any).highestRiskBucket === 'OVERDUE_UNDER_15'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {(cust as any).highestRiskBucket === 'OVERDUE_OVER_30'
                              ? 'Rất cao (>30d)'
                              : (cust as any).highestRiskBucket === 'OVERDUE_15_TO_30'
                              ? 'Cao (15-30d)'
                              : (cust as any).highestRiskBucket === 'OVERDUE_UNDER_15'
                              ? 'Vừa (<15d)'
                              : 'Trong hạn'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCustomerInvoicesModalItem(cust);
                            }}
                          >
                            Xem hóa đơn
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DETAIL INVOICE LIST VIEW */
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border-grey bg-surface-container-low flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
              <IoListOutline className="text-primary" />
              Danh sách chi tiết hóa đơn còn nợ ({data?.items?.length || 0})
            </h3>
            {bucketFilter && (
              <span className="text-xs text-on-surface-variant">
                Đang lọc: <strong>{BUCKET_FILTER_OPTIONS.find(b => b.value === bucketFilter)?.label}</strong>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-xs border-b border-border-grey">
                  <th className="p-3 font-semibold">Mã HĐ</th>
                  <th className="p-3 font-semibold">Khách hàng</th>
                  <th className="p-3 font-semibold">Phòng</th>
                  <th className="p-3 font-semibold">Ngày trả phòng</th>
                  <th className="p-3 font-semibold">Hạn cam kết</th>
                  <th className="p-3 font-semibold text-center">Số ngày quá hạn</th>
                  <th className="p-3 font-semibold text-right">Số tiền còn nợ</th>
                  <th className="p-3 font-semibold">Người duyệt cho nợ</th>
                  <th className="p-3 font-semibold">Trạng thái nhắc thu</th>
                  <th className="p-3 font-semibold">Liên hệ gần nhất</th>
                  <th className="p-3 font-semibold text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey">
                {data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-on-surface-variant text-sm">
                      Không có khoản nợ nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((item) => {
                    const bucket = BUCKET_COLORS[item.agingBucket] || BUCKET_COLORS.CURRENT;
                    const isDueToday = item.reminderStatus === 'DUE_TODAY';
                    const isOverdueReminder = item.reminderStatus === 'OVERDUE_REMINDER';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-container-lowest transition-colors"
                      >
                        <td className="p-3 font-mono font-semibold text-primary">
                          {item.invoiceNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-on-surface">{item.guestName}</div>
                          <div className="text-xs text-on-surface-variant flex flex-col">
                            <span>{item.guestPhone || '—'}</span>
                            {item.guestEmail && (
                              <span className="text-[11px] text-primary/80 truncate max-w-[160px]" title={item.guestEmail}>
                                {item.guestEmail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-on-surface">
                          {item.roomNumber || '—'}
                        </td>
                        <td className="p-3 text-on-surface-variant text-xs">
                          {fmtDate(item.checkOutDate)}
                        </td>
                        <td className="p-3 text-on-surface text-xs font-medium">
                          {fmtDate(item.dueDate)}
                        </td>
                        <td className="p-3 text-center">
                          {item.daysOverdue > 0 ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${bucket.badge}`}>
                              +{item.daysOverdue} ngày
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-medium">
                              Trong hạn
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-extrabold text-error">
                          {fmtCurrency(item.debtAmount)}
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          {item.approvedByName || 'Chủ cơ sở'}
                        </td>
                        <td className="p-3">
                          {isDueToday ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800 animate-pulse">
                              🔔 Cần nhắc hôm nay
                            </span>
                          ) : isOverdueReminder ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-800">
                              ⚠️ Quá hẹn nhắc
                            </span>
                          ) : item.nextReminderDate ? (
                            <span className="text-xs text-on-surface-variant">
                              Hẹn: {fmtDate(item.nextReminderDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant/60">
                              Chưa đặt lịch
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {item.lastContactedAt ? (
                            <div className="max-w-[180px]">
                              <div className="text-on-surface-variant font-medium">
                                {fmtDate(item.lastContactedAt.slice(0, 10))}
                              </div>
                              <div className="text-on-surface truncate" title={item.lastContactNote}>
                                {item.lastContactNote || '—'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant/60 italic">Chưa liên hệ</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCollectionModalItem(item)}
                              title="Ghi nhận liên hệ đòi nợ"
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <IoCallOutline size={13} />
                              Nhắc thu
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryModalItem(item)}
                              title="Xem lịch sử các lần đòi nợ"
                              className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-medium transition-colors cursor-pointer"
                            >
                              Lịch sử ({item.contactCount || (item as any).collectionCount || 0})
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DebtCollectionModal
        isOpen={!!collectionModalItem}
        debtItem={collectionModalItem}
        onClose={() => setCollectionModalItem(null)}
        onSuccess={() => {
          fetchReport();
        }}
      />

      <DebtCollectionHistoryModal
        isOpen={!!historyModalItem}
        debtItem={historyModalItem}
        onClose={() => setHistoryModalItem(null)}
      />

      <CustomerDebtInvoicesModal
        isOpen={!!customerInvoicesModalItem}
        customer={customerInvoicesModalItem}
        items={data?.items || []}
        onClose={() => setCustomerInvoicesModalItem(null)}
        onOpenCollectionModal={(item) => setCollectionModalItem(item)}
        onOpenHistoryModal={(item) => setHistoryModalItem(item)}
      />
    </div>
  );
};

export default DebtAgingReport;
