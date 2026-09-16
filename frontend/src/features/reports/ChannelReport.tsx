import React, { useState, useEffect } from 'react';
import {
  IoBarChartOutline,
  IoCashOutline,
  IoDownloadOutline,
  IoCalendarOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoFlameOutline,
  IoCloseCircleOutline,
  IoHelpCircleOutline,
  IoBedOutline,
  IoTrendingUpOutline,
  IoStorefrontOutline,
  IoCallOutline,
  IoChatbubblesOutline,
  IoGlobeOutline,
  IoSyncOutline
} from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ChannelReportResponse, ChannelReportRow } from '../../types';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount?: number) => {
  if (!amount || amount === 0) return '0 đ';
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' tỷ';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' tr';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k';
  return amount + ' đ';
};

const getChannelIcon = (key: string) => {
  switch (key) {
    case 'WALKIN':
      return <IoStorefrontOutline className="text-emerald-600" size={18} />;
    case 'PHONE':
      return <IoCallOutline className="text-blue-600" size={18} />;
    case 'SOCIAL':
      return <IoChatbubblesOutline className="text-pink-600" size={18} />;
    case 'ONLINE':
      return <IoGlobeOutline className="text-indigo-600" size={18} />;
    case 'SIMULATION':
      return <IoSyncOutline className="text-purple-600" size={18} />;
    default:
      return <IoHelpCircleOutline className="text-amber-600" size={18} />;
  }
};

const getChannelBarColor = (key: string) => {
  switch (key) {
    case 'WALKIN':     return 'bg-emerald-500';
    case 'PHONE':      return 'bg-blue-500';
    case 'SOCIAL':     return 'bg-pink-500';
    case 'ONLINE':     return 'bg-indigo-500';
    case 'SIMULATION': return 'bg-purple-500';
    default:           return 'bg-amber-400';
  }
};

const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}> = ({ label, value, sub, icon, color = 'text-primary' }) => (
  <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow">
    <div className="flex items-center justify-between mb-1.5">
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs font-semibold">{label}</p>
      {icon && <div className="p-2 rounded-lg bg-surface-container-low">{icon}</div>}
    </div>
    <p className={`font-headline-md leading-tight ${color}`}>{value}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1.5 font-medium">{sub}</p>}
  </div>
);

const ChannelReport: React.FC = () => {
  const { user } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay  = today.toISOString().split('T')[0];

  const [from, setFrom] = useState(firstDay);
  const [to,   setTo]   = useState(lastDay);
  const [data, setData] = useState<ChannelReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role || '');

  const handleSearch = async (fromDate = from, toDate = to) => {
    if (!fromDate || !toDate) {
      setError('Vui lòng chọn đủ khoảng thời gian.');
      return;
    }
    if (fromDate > toDate) {
      setError('Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await reportApi.getChannelReport(fromDate, toDate);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo cơ cấu kênh.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      handleSearch(firstDay, lastDay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bộ lọc nhanh
  const setQuickRange = (type: 'last7' | 'last30' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    let f = '';
    let t = now.toISOString().split('T')[0];

    if (type === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      f = d.toISOString().split('T')[0];
    } else if (type === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      f = d.toISOString().split('T')[0];
    } else if (type === 'thisMonth') {
      f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (type === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0);
      f = start.toISOString().split('T')[0];
      t = end.toISOString().split('T')[0];
    }

    setFrom(f);
    setTo(t);
    handleSearch(f, t);
  };

  // Xuất file CSV hỗ trợ Excel (UTF-8 BOM)
  const handleExportCSV = async () => {
    if (!from || !to) return;
    setExporting(true);
    try {
      const blob = await reportApi.exportChannelReport(from, to);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-co-cau-kenh_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất tệp báo cáo:', err);
      alert('Không thể xuất tệp báo cáo. Vui lòng thử lại!');
    } finally {
      setExporting(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền xem báo cáo này.
      </div>
    );
  }

  const summary = data?.summary;
  const channels: ChannelReportRow[] = data?.rows || [];
  const maxRevenueChannel = channels.length > 0 ? Math.max(...channels.map(c => c.revenue || 0), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Input
                label="Từ ngày"
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Input
                label="Đến ngày"
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <Button
                variant="primary"
                onClick={() => handleSearch()}
                isLoading={loading}
                icon={IoBarChartOutline}
              >
                Xem báo cáo
              </Button>
            </div>
          </div>

          {/* Quick Filters & Export */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <span className="text-xs font-medium text-on-surface-variant mr-1">Lọc nhanh:</span>
            <button
              onClick={() => setQuickRange('last7')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border-grey hover:bg-surface-container-low transition-colors"
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setQuickRange('last30')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border-grey hover:bg-surface-container-low transition-colors"
            >
              30 ngày qua
            </button>
            <button
              onClick={() => setQuickRange('thisMonth')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border-grey hover:bg-surface-container-low transition-colors text-primary border-primary/40 bg-primary/5"
            >
              Tháng này
            </button>
            <button
              onClick={() => setQuickRange('lastMonth')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border-grey hover:bg-surface-container-low transition-colors"
            >
              Tháng trước
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              isLoading={exporting}
              disabled={!data || channels.length === 0}
              icon={IoDownloadOutline}
              className="ml-auto lg:ml-2"
            >
              Xuất CSV (Excel)
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-error rounded-xl text-sm flex items-center gap-2">
            <IoAlertCircleOutline size={18} />
            {error}
          </div>
        )}
      </div>

      {loading && <LoadingScreen message="Đang phân tích cơ cấu đặt phòng theo kênh..." />}

      {!loading && summary && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Tổng Doanh thu Hóa đơn"
              value={fmtCompactCurrency(summary.totalRevenue)}
              sub={`Thực thu: ${fmtCurrency(summary.totalRevenue)}`}
              icon={<IoCashOutline className="text-emerald-600" size={20} />}
              color="text-emerald-700"
            />
            <SummaryCard
              label="Tổng Lượt đặt phòng"
              value={summary.totalBookings}
              sub={`${summary.totalSoldNights} đêm phòng bán được`}
              icon={<IoCalendarOutline className="text-blue-600" size={20} />}
              color="text-blue-700"
            />
            <SummaryCard
              label="Tỷ lệ Hủy & Vắng mặt"
              value={`${summary.overallCancellationRate}%`}
              sub={`Không đến (No-show): ${summary.overallNoShowRate}%`}
              icon={<IoCloseCircleOutline className="text-red-500" size={20} />}
              color={summary.overallCancellationRate > 20 ? 'text-red-600' : 'text-on-surface'}
            />
            <SummaryCard
              label="Chất lượng dữ liệu kênh"
              value={`${summary.dataQualityScore}%`}
              sub={summary.unknownBookings > 0 ? `${summary.unknownBookings} đơn chưa rõ kênh (${summary.unknownRate}%)` : 'Dữ liệu đầy đủ 100%'}
              icon={<IoCheckmarkCircleOutline className={summary.dataQualityScore >= 90 ? 'text-emerald-600' : 'text-amber-600'} size={20} />}
              color={summary.dataQualityScore >= 90 ? 'text-emerald-700' : 'text-amber-700'}
            />
          </div>

          {/* Banner Cảnh báo Chất lượng Dữ liệu */}
          {summary.unknownBookings > 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4.5 flex items-start gap-3 shadow-xs">
              <IoAlertCircleOutline className="text-amber-600 shrink-0 mt-0.5" size={22} />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">
                  Cảnh báo chất lượng dữ liệu: Có {summary.unknownBookings} lượt đặt phòng ({summary.unknownRate}%) thuộc nhóm Chưa xác định.
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Một số đặt phòng cũ hoặc đơn được tạo trước đó chưa được gán kênh cụ thể. Để báo cáo phản ánh chính xác nhất hiệu quả kinh doanh, hãy nhắc nhở lễ tân chọn Kênh đặt phòng khi nhận khách tại quầy hoặc qua điện thoại.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <IoCheckmarkCircleOutline className="text-emerald-600 shrink-0" size={20} />
              <p className="text-xs sm:text-sm font-medium">
                Tuyệt vời! Toàn bộ {summary.totalBookings} đặt phòng trong khoảng thời gian này đều được ghi nhận kênh nguồn rõ ràng. Điểm dữ liệu đạt 100%.
              </p>
            </div>
          )}

          {/* Biểu đồ Thanh so sánh Doanh thu và Tỷ trọng */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2 mb-2">
              <IoBarChartOutline size={20} className="text-primary" />
              So sánh Doanh thu & Tỷ trọng giữa các Kênh
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Doanh thu được tính trực tiếp từ hóa đơn thanh toán đã lập, giúp đánh giá chính xác kênh nào mang lại dòng tiền thực tế cao nhất.
            </p>

            <div className="space-y-4">
              {channels.map((ch) => {
                const pct = maxRevenueChannel > 0 ? Math.round(((ch.revenue || 0) / maxRevenueChannel) * 100) : 0;
                return (
                  <div key={ch.channelKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(ch.channelKey)}
                        <span className="text-on-surface font-semibold">{ch.channelName}</span>
                        <span className="text-xs text-on-surface-variant">({ch.totalBookings} đơn • {ch.soldNights} đêm)</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="font-semibold text-on-surface">{fmtCurrency(ch.revenue)}</span>
                        <span className="w-12 text-right font-bold text-primary">{ch.revenueShare}%</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${getChannelBarColor(ch.channelKey)} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                        title={`${ch.channelName}: ${fmtCurrency(ch.revenue)} (${ch.revenueShare}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bảng Chi tiết 6 Kênh */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border-grey flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-on-surface">Bảng Chi tiết Cơ cấu Đặt phòng theo Kênh</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Đánh giá toàn diện lượt đặt, doanh thu thực tế từ hóa đơn, tỷ lệ hủy phòng và tỷ lệ khách không đến (No-show).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md uppercase tracking-wider text-xs border-b border-border-grey">
                    <th className="py-3 px-4">Kênh Đặt phòng</th>
                    <th className="py-3 px-4 text-center">Số Lượt đặt</th>
                    <th className="py-3 px-4 text-center">Tỷ trọng đơn</th>
                    <th className="py-3 px-4 text-center">Số Đêm bán</th>
                    <th className="py-3 px-4 text-right">Doanh thu Hóa đơn</th>
                    <th className="py-3 px-4 text-center">Tỷ trọng DT</th>
                    <th className="py-3 px-4 text-right">Giá TB / Đêm (ADR)</th>
                    <th className="py-3 px-4 text-center">Tỷ lệ Hủy</th>
                    <th className="py-3 px-4 text-center">Tỷ lệ No-show</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {channels.map((ch) => {
                    const isHighCancel = ch.cancellationRate >= 20;
                    const isHighNoShow = ch.noShowRate >= 10;
                    const isUnknown = ch.channelKey === 'UNKNOWN';

                    return (
                      <tr key={ch.channelKey} className="hover:bg-surface-container-low/50 transition-colors">
                        {/* Kênh */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-surface-container-low">
                              {getChannelIcon(ch.channelKey)}
                            </div>
                            <div>
                              <div className="font-semibold text-on-surface flex items-center gap-1.5">
                                {ch.channelName}
                                {ch.channelKey === 'UNKNOWN' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                    Cần bổ sung
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-on-surface-variant font-mono">
                                Mã: {ch.channelKey}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Số lượt đặt */}
                        <td className="py-3.5 px-4 text-center font-medium">
                          {ch.totalBookings}
                        </td>

                        {/* Tỷ trọng đơn */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            {ch.bookingShare}%
                          </span>
                        </td>

                        {/* Đêm bán */}
                        <td className="py-3.5 px-4 text-center font-medium">
                          {ch.soldNights}
                        </td>

                        {/* Doanh thu hóa đơn */}
                        <td className="py-3.5 px-4 text-right font-bold text-on-surface">
                          {fmtCurrency(ch.revenue)}
                        </td>

                        {/* Tỷ trọng doanh thu */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {ch.revenueShare}%
                          </span>
                        </td>

                        {/* ADR */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {fmtCurrency(ch.adr)}
                        </td>

                        {/* Tỷ lệ hủy */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isHighCancel
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ch.cancellationRate}%
                            </span>
                            <span className="text-[10px] text-on-surface-variant mt-0.5">
                              ({ch.cancelledBookings} lượt)
                            </span>
                          </div>
                        </td>

                        {/* Tỷ lệ no-show */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isHighNoShow
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ch.noShowRate}%
                            </span>
                            <span className="text-[10px] text-on-surface-variant mt-0.5">
                              ({ch.noShowBookings} lượt)
                            </span>
                          </div>
                        </td>

                        {/* Đánh giá */}
                        <td className="py-3.5 px-4 text-center">
                          {isUnknown ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
                              Chưa gán nguồn
                            </span>
                          ) : isHighCancel ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                              ⚠️ Hủy cao ({ch.cancellationRate}%)
                            </span>
                          ) : isHighNoShow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
                              ⚠️ Vắng mặt ({ch.noShowRate}%)
                            </span>
                          ) : ch.revenueShare >= 25 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                              🌟 Chủ lực ({ch.revenueShare}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
                              Ổn định
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Dòng Tổng cộng */}
                <tfoot>
                  <tr className="bg-surface-container-low font-bold text-on-surface border-t-2 border-border-grey">
                    <td className="py-3.5 px-4 uppercase text-xs tracking-wider">
                      TỔNG CỘNG ({channels.length} KÊNH)
                    </td>
                    <td className="py-3.5 px-4 text-center">{summary.totalBookings}</td>
                    <td className="py-3.5 px-4 text-center">100%</td>
                    <td className="py-3.5 px-4 text-center">{summary.totalSoldNights}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-700 text-base">
                      {fmtCurrency(summary.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-center">100%</td>
                    <td className="py-3.5 px-4 text-right">
                      {summary.totalSoldNights > 0
                        ? fmtCurrency(Math.round(summary.totalRevenue / summary.totalSoldNights))
                        : '0 đ'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-red-600">
                      TB {summary.overallCancellationRate}%
                    </td>
                    <td className="py-3.5 px-4 text-center text-amber-700">
                      TB {summary.overallNoShowRate}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs text-on-surface-variant font-normal">
                        Điểm DL: {summary.dataQualityScore}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Chú thích chân bảng */}
            <div className="p-4 bg-surface-container-lowest border-t border-border-grey text-xs text-on-surface-variant flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span>• <strong>Doanh thu hóa đơn</strong>: Khớp chuẩn với báo cáo doanh thu tổng (chỉ tính từ hóa đơn đã thanh toán).</span>
                <span>• <strong>ADR</strong> = Doanh thu / Số đêm phòng bán được.</span>
              </div>
              <div>
                <span>Khoảng thời gian: {from} đến {to}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && !summary && !error && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-12 text-center text-on-surface-variant">
          <IoBarChartOutline size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Chưa có dữ liệu báo cáo cho khoảng thời gian đã chọn.</p>
          <p className="text-xs mt-1">Vui lòng thay đổi mốc ngày hoặc bấm "Xem báo cáo".</p>
        </div>
      )}
    </div>
  );
};

export default ChannelReport;
