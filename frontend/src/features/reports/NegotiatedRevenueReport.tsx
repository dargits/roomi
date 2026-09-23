import React, { useState } from 'react';
import { IoSearchOutline, IoBriefcaseOutline, IoBusinessOutline, IoPeopleOutline, IoCalendarOutline, IoTrendingUpOutline } from 'react-icons/io5';
import { negotiatedPriceApi, NegotiatedRevenueReport as ReportData } from '../../services/negotiatedPriceApi';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtPercent = (val?: number) => (val != null ? val.toFixed(1) + '%' : '0%');

const NegotiatedRevenueReport: React.FC = () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [to, setTo] = useState(today.toISOString().split('T')[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const result = await negotiatedPriceApi.getNegotiatedRevenueReport(from, to);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <Input
            label="Từ ngày"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button onClick={handleSearch} isLoading={loading} className="flex items-center gap-2">
            <IoSearchOutline className="w-4 h-4" />
            Xem báo cáo
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && <LoadingScreen />}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<IoTrendingUpOutline className="w-5 h-5 text-blue-600" />}
              label="Tổng doanh thu"
              value={fmtCurrency(data.totalRevenue)}
              bg="bg-blue-50"
              border="border-blue-200"
            />
            <SummaryCard
              icon={<IoBriefcaseOutline className="w-5 h-5 text-emerald-600" />}
              label="Doanh thu thỏa thuận"
              value={fmtCurrency(data.negotiatedRevenue)}
              bg="bg-emerald-50"
              border="border-emerald-200"
            />
            <SummaryCard
              icon={<IoCalendarOutline className="w-5 h-5 text-purple-600" />}
              label="Số đêm phòng thỏa thuận"
              value={String(data.negotiatedRoomNights || 0)}
              subtitle={`${data.negotiatedBookingCount || 0} đặt phòng`}
              bg="bg-purple-50"
              border="border-purple-200"
            />
            <SummaryCard
              icon={<IoBusinessOutline className="w-5 h-5 text-amber-600" />}
              label="Tỷ trọng giá thỏa thuận"
              value={fmtPercent(data.sharePercent)}
              subtitle="trong tổng doanh thu"
              bg="bg-amber-50"
              border="border-amber-200"
            />
          </div>

          {/* Share Bar Visual */}
          {data.totalRevenue > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Cơ cấu doanh thu</h3>
              <div className="flex h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <div
                  className="bg-emerald-500 transition-all duration-700 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${Math.max(data.sharePercent || 0, 2)}%` }}
                >
                  {(data.sharePercent || 0) >= 8 ? `${fmtPercent(data.sharePercent)} TT` : ''}
                </div>
                <div
                  className="bg-blue-400 transition-all duration-700 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${Math.max(100 - (data.sharePercent || 0), 2)}%` }}
                >
                  {(100 - (data.sharePercent || 0)) >= 8 ? `${fmtPercent(100 - (data.sharePercent || 0))} Thường` : ''}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Giá thỏa thuận ({fmtCurrency(data.negotiatedRevenue)})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                  Giá thường ({fmtCurrency((data.totalRevenue || 0) - (data.negotiatedRevenue || 0))})
                </div>
              </div>
            </div>
          )}

          {/* Agreement Breakdown Table */}
          {data.agreements && data.agreements.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Chi tiết theo thỏa thuận
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-5">Tên thỏa thuận</th>
                      <th className="py-3 px-5 text-right">Số đặt phòng</th>
                      <th className="py-3 px-5 text-right">Số đêm phòng</th>
                      <th className="py-3 px-5 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.agreements.map((a, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-5 font-medium text-gray-900 flex items-center gap-2">
                          <IoPeopleOutline className="w-4 h-4 text-gray-400 shrink-0" />
                          {a.agreementName}
                        </td>
                        <td className="py-3 px-5 text-right">{a.bookingCount}</td>
                        <td className="py-3 px-5 text-right">{a.roomNights}</td>
                        <td className="py-3 px-5 text-right font-semibold text-emerald-700">
                          {fmtCurrency(a.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-sm border-t border-gray-300">
                    <tr>
                      <td className="py-3 px-5 text-gray-800">Tổng cộng</td>
                      <td className="py-3 px-5 text-right">{data.negotiatedBookingCount}</td>
                      <td className="py-3 px-5 text-right">{data.negotiatedRoomNights}</td>
                      <td className="py-3 px-5 text-right text-emerald-800">{fmtCurrency(data.negotiatedRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!data.agreements || data.agreements.length === 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <IoBriefcaseOutline className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Không có đặt phòng nào sử dụng giá thỏa thuận trong khoảng thời gian này.
              </p>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <IoBriefcaseOutline className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Chọn khoảng thời gian và nhấn <strong>"Xem báo cáo"</strong> để phân tích doanh thu giá thỏa thuận.
          </p>
        </div>
      )}
    </div>
  );
};

/* Reusable Summary Card */
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  bg: string;
  border: string;
}> = ({ icon, label, value, subtitle, bg, border }) => (
  <div className={`${bg} ${border} border rounded-xl p-4 space-y-1`}>
    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className="text-xl font-bold text-gray-900">{value}</div>
    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
  </div>
);

export default NegotiatedRevenueReport;
