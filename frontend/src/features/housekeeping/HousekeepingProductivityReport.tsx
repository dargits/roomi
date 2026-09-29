import React, { useState, useEffect } from 'react';
import {
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoWarningOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoBedOutline,
  IoSparklesOutline,
  IoRefreshOutline,
  IoInformationCircleOutline,
  IoFlameOutline,
  IoRibbonOutline,
  IoBarChartOutline
} from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import housekeepingReportApi, { HousekeepingProductivityResponse } from '../../services/housekeepingReportApi';
import userApi from '../../services/userApi';
import LoadingScreen from '../../components/common/LoadingScreen';
import Button from '../../components/ui/Button';

const formatDuration = (mins: number | null | undefined) => {
  if (mins == null) return '—';
  const rounded = Math.round(mins * 10) / 10;
  return `${rounded} phút`;
};

const HousekeepingProductivityReport: React.FC = () => {
  const { user } = useAuth();
  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(user?.role || '');
  const isHousekeeper = user?.role === 'HOUSEKEEPER';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<HousekeepingProductivityResponse | null>(null);
  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('WEEK');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [housekeepers, setHousekeepers] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'roomType' | 'records'>('staff');

  // Load danh sách nhân viên nếu là Chủ cơ sở / Admin
  useEffect(() => {
    if (isOwnerOrAdmin) {
      loadHousekeepers();
    }
  }, [isOwnerOrAdmin]);

  const loadHousekeepers = async () => {
    try {
      const data = await userApi.getHousekeepers();
      setHousekeepers(Array.isArray(data) ? data : []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedStaffId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'CUSTOM') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (isOwnerOrAdmin && selectedStaffId) {
        params.housekeeperId = selectedStaffId;
      }
      const data = await housekeepingReportApi.getProductivityReport(params);
      setReport(data);
    } catch (err) {
      console.error('Lỗi tải báo cáo năng suất buồng phòng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setPeriod('CUSTOM');
      fetchReport();
    }
  };

  const summary = report?.summary;

  return (
    <div className="space-y-5">
      {/* 1. Header & Bộ lọc thời gian / nhân viên */}
      <div className="bg-white rounded-2xl border border-border-grey p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <IoBarChartOutline size={20} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">
                {isHousekeeper ? 'Năng Suất & Tiến Độ Dọn Phòng Của Bạn' : 'Định Mức Thời Gian & Năng Suất Buồng Phòng'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Khoảng thời gian: <strong className="text-on-surface">{report?.startDate}</strong> đến <strong className="text-on-surface">{report?.endDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chọn khoảng thời gian nhanh */}
            <div className="inline-flex p-1 rounded-xl bg-surface-container border border-border-grey text-xs">
              <button
                type="button"
                onClick={() => setPeriod('TODAY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'TODAY' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setPeriod('WEEK')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'WEEK' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => setPeriod('MONTH')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'MONTH' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tháng này
              </button>
            </div>

            {/* Lọc nhân viên buồng phòng (Chỉ Owner/Admin) */}
            {isOwnerOrAdmin && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="text-xs border border-border-grey rounded-xl px-3 py-2 bg-white text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="">Tất cả nhân viên buồng phòng</option>
                {housekeepers.map((hk) => (
                  <option key={hk.id} value={hk.id}>
                    {hk.name} ({hk.account})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={fetchReport}
              className="p-2 rounded-xl border border-border-grey bg-white hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title="Làm mới số liệu"
            >
              <IoRefreshOutline size={16} />
            </button>
          </div>
        </div>

        {/* Custom date range if needed */}
        <form onSubmit={handleApplyCustomDate} className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-grey/60 text-xs">
          <span className="font-semibold text-on-surface-variant flex items-center gap-1">
            <IoCalendarOutline size={14} />
            Tùy chọn ngày:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-border-grey rounded-lg px-2.5 py-1 text-xs bg-white text-on-surface"
          />
          <span className="text-on-surface-variant">đến</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-border-grey rounded-lg px-2.5 py-1 text-xs bg-white text-on-surface"
          />
          <Button type="submit" variant="secondary" className="text-xs py-1 px-3">
            Áp dụng
          </Button>
        </form>
      </div>

      {/* 2. Banner nguyên tắc vận hành khách quan */}
      <div className="bg-surface-container-low/70 border border-primary/20 rounded-2xl p-4 text-xs text-on-surface-variant flex items-start gap-3">
        <IoInformationCircleOutline size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-on-surface">Nguyên tắc theo dõi năng suất & định mức công việc:</p>
          <p>
            • Báo cáo dùng để <strong>bố trí công việc, cân bằng khối lượng và điều chỉnh định mức</strong> dựa trên dữ liệu thực tế, hệ thống không tự động xếp hạng hay đánh giá con người.
          </p>
          <p>
            • Các phòng có <strong>báo sự cố kỹ thuật</strong> hoặc <strong>bị gián đoạn khách quan</strong> (thiếu đồ vải, bảo trì, khách quay lại) được gắn cờ riêng và <strong>loại trừ khỏi việc tính thời gian trung bình</strong> để đảm bảo sự công bằng và số liệu chuẩn xác.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingScreen message="Đang phân tích số liệu năng suất buồng phòng..." />
      ) : (
        <>
          {/* 3. KPI Cards Tổng hợp */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Card 1: Tổng số phòng đã dọn */}
            <div className="bg-white p-4 rounded-2xl border border-border-grey shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Tổng phòng đã dọn</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <IoCheckmarkCircleOutline size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-on-surface">
                {summary?.totalCleanedRooms || 0}
              </div>
              <div className="text-[11px] text-on-surface-variant flex items-center gap-2 pt-1 border-t border-border-grey/50">
                <span>Khách trả: <strong className="text-emerald-700">{summary?.checkoutCleanedRooms || 0}</strong></span>
                <span>•</span>
                <span>Định kỳ: <strong className="text-blue-700">{summary?.periodicCleanedRooms || 0}</strong></span>
              </div>
            </div>

            {/* Card 2: Thời gian dọn thực tế trung bình */}
            <div className="bg-white p-4 rounded-2xl border border-border-grey shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Thời gian dọn thực tế TB</span>
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <IoTimeOutline size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {formatDuration(summary?.avgDurationMinutes)}
              </div>
              <div className="text-[11px] text-on-surface-variant pt-1 border-t border-border-grey/50">
                Định mức chuẩn: <strong className="text-on-surface">{formatDuration(summary?.standardAvgDurationMinutes)}</strong>
              </div>
            </div>

            {/* Card 3: Số lần kiểm tra bị trả lại */}
            <div className="bg-white p-4 rounded-2xl border border-border-grey shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Kiểm tra bị trả lại</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-error">
                  <IoAlertCircleOutline size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-error">
                {summary?.totalRejections || 0}
              </div>
              <div className="text-[11px] text-on-surface-variant pt-1 border-t border-border-grey/50">
                {summary?.totalRejections === 0 ? 'Chất lượng đạt chuẩn 100%' : 'Cần lưu ý kiểm tra các góc khuất'}
              </div>
            </div>

            {/* Card 4: Sự cố & Phòng bị gián đoạn */}
            <div className="bg-white p-4 rounded-2xl border border-border-grey shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Sự cố & Gián đoạn</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <IoWarningOutline size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-amber-800">
                {(summary?.totalIncidents || 0) + (summary?.totalInterruptedRooms || 0)}
              </div>
              <div className="text-[11px] text-on-surface-variant flex items-center gap-2 pt-1 border-t border-border-grey/50">
                <span>Sự cố: <strong className="text-rose-700">{summary?.totalIncidents || 0}</strong></span>
                <span>•</span>
                <span>Gián đoạn: <strong className="text-amber-700">{summary?.totalInterruptedRooms || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* 4. Sub-tabs trong báo cáo */}
          <div className="bg-white rounded-2xl border border-border-grey shadow-sm overflow-hidden">
            <div className="border-b border-border-grey px-4 pt-3 flex items-center gap-4 text-xs font-bold">
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('staff')}
                  className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSubTab === 'staff'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <IoPersonOutline size={15} />
                  <span>Năng suất theo Nhân viên ({report?.staffStats?.length || 0})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSubTab('roomType')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'roomType'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoBedOutline size={15} />
                <span>Định mức theo Loại phòng ({report?.roomTypeStats?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('records')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'records'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoSparklesOutline size={15} />
                <span>Nhật ký dọn dẹp gần đây ({report?.recentRecords?.length || 0})</span>
              </button>
            </div>

            {/* TAB 1: THỐNG KÊ THEO NHÂN VIÊN */}
            {activeSubTab === 'staff' && isOwnerOrAdmin && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nhân viên buồng phòng</th>
                      <th className="py-3 px-4 text-center">Phòng đã dọn</th>
                      <th className="py-3 px-4 text-center">Khách trả / Định kỳ</th>
                      <th className="py-3 px-4 text-right">Thời gian TB thực tế</th>
                      <th className="py-3 px-4 text-right">Định mức chuẩn</th>
                      <th className="py-3 px-4 text-center">Bị trả lại</th>
                      <th className="py-3 px-4 text-center">Sự cố đã báo</th>
                      <th className="py-3 px-4 text-center">Gián đoạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {(!report?.staffStats || report.staffStats.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                          Chưa có dữ liệu dọn phòng trong khoảng thời gian này.
                        </td>
                      </tr>
                    ) : (
                      report.staffStats.map((st) => {
                        const diff = (st.avgDurationMinutes && st.standardAvgMinutes)
                          ? Math.round((st.avgDurationMinutes - st.standardAvgMinutes) * 10) / 10
                          : null;
                        return (
                          <tr key={st.housekeeperId} className="hover:bg-surface-container-low transition-colors">
                            <td className="py-3 px-4 font-bold text-on-surface">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                  {st.housekeeperName.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm">{st.housekeeperName}</div>
                                  <div className="text-[10px] text-on-surface-variant font-mono">@{st.housekeeperAccount}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-extrabold text-on-surface text-sm">
                              {st.totalCleanedRooms}
                            </td>
                            <td className="py-3 px-4 text-center text-on-surface-variant">
                              <span className="text-emerald-700 font-semibold">{st.checkoutRooms}</span>
                              <span className="mx-1">/</span>
                              <span className="text-blue-700 font-semibold">{st.periodicRooms}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-primary text-sm">
                              {formatDuration(st.avgDurationMinutes)}
                            </td>
                            <td className="py-3 px-4 text-right text-on-surface-variant">
                              {formatDuration(st.standardAvgMinutes)}
                              {diff !== null && (
                                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  diff < 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : diff === 0
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {diff > 0 ? `+${diff}p` : `${diff}p`}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {st.rejectionCount > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-rose-50 text-error border border-rose-200 text-xs">
                                  {st.rejectionCount}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {st.incidentCount > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                                  {st.incidentCount}
                                </span>
                              ) : (
                                <span className="text-on-surface-variant">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-on-surface-variant">
                              {st.interruptedCount > 0 ? (
                                <span className="text-amber-700 font-semibold" title="Được đánh dấu để không làm sai lệch thời gian TB">
                                  {st.interruptedCount}
                                </span>
                              ) : '0'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: ĐỊNH MỨC THEO LOẠI PHÒNG */}
            {activeSubTab === 'roomType' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Loại phòng</th>
                      <th className="py-3 px-4 text-center">Định mức sau khách trả</th>
                      <th className="py-3 px-4 text-center">Định mức dọn định kỳ</th>
                      <th className="py-3 px-4 text-center">Phòng đã dọn</th>
                      <th className="py-3 px-4 text-right">TB thực tế (Khách trả)</th>
                      <th className="py-3 px-4 text-right">TB thực tế (Định kỳ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {(!report?.roomTypeStats || report.roomTypeStats.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                          Chưa có dữ liệu loại phòng.
                        </td>
                      </tr>
                    ) : (
                      report.roomTypeStats.map((rt) => (
                        <tr key={rt.roomTypeId} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface text-sm">
                            {rt.roomTypeName}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-emerald-800 font-bold">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              {rt.standardCheckoutMinutes} phút
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-blue-800 font-bold">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {rt.standardPeriodicMinutes} phút
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-on-surface">
                            {rt.totalCleanedRooms} phòng
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-primary">
                            {formatDuration(rt.avgCheckoutMinutes)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-700">
                            {formatDuration(rt.avgPeriodicMinutes)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: NHẬT KÝ TỪNG LƯỢT DỌN */}
            {activeSubTab === 'records' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Phòng</th>
                      <th className="py-3 px-4">Người dọn</th>
                      <th className="py-3 px-4">Loại dọn</th>
                      <th className="py-3 px-4 text-center">Bắt đầu ➔ Báo xong</th>
                      <th className="py-3 px-4 text-right">Thực tế / Định mức</th>
                      <th className="py-3 px-4 text-center">Nghiệm thu</th>
                      <th className="py-3 px-4">Ghi chú & Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {(!report?.recentRecords || report.recentRecords.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                          Chưa có bản ghi nhật ký dọn buồng phòng nào.
                        </td>
                      </tr>
                    ) : (
                      report.recentRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface text-sm">
                            Phòng {rec.roomNumber}
                            <span className="block text-[10px] font-normal text-on-surface-variant">
                              {rec.roomTypeName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-on-surface">
                            {rec.housekeeperName}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.cleaningType === 'PERIODIC'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {rec.cleaningType === 'PERIODIC' ? 'Định kỳ' : 'Khách trả'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-on-surface-variant">
                            {rec.startedAt ? new Date(rec.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            <span className="mx-1">➔</span>
                            {rec.completedAt ? new Date(rec.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-on-surface">
                            <span className="text-primary">{formatDuration(rec.actualDurationMinutes)}</span>
                            <span className="text-[10px] text-on-surface-variant font-normal ml-1">
                              / {rec.standardDurationMinutes || 45}p
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              rec.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.status === 'SUBMITTED'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : rec.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {rec.status === 'APPROVED' ? 'Đã duyệt đạt' : rec.status === 'SUBMITTED' ? 'Chờ duyệt' : rec.status === 'REJECTED' ? 'Dọn lại' : 'Đang dọn'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {rec.isInterrupted && (
                                <span
                                  className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold"
                                  title={rec.interruptionReason || 'Bị gián đoạn'}
                                >
                                  ⚠️ Gián đoạn (Không tính vào TB)
                                </span>
                              )}
                              {rec.hasIncident && (
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                  🛠️ Có sự cố ({rec.incidentCount || 1})
                                </span>
                              )}
                              {rec.rejectionCount && rec.rejectionCount > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                                  Lần trả lại: {rec.rejectionCount}
                                </span>
                              ) : null}
                              {!rec.isInterrupted && !rec.hasIncident && (!rec.rejectionCount || rec.rejectionCount === 0) && (
                                <span className="text-on-surface-variant text-[11px]">—</span>
                              )}
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
        </>
      )}
    </div>
  );
};

export default HousekeepingProductivityReport;
