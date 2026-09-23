import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { housekeepingProductivityApi } from '../../services/housekeepingProductivityApi';
import {
  CleaningStandardResponse,
  HousekeepingProductivityReportResponse,
  HousekeeperProductivityStat,
  CleaningRecordDetailResponse
} from '../../types/housekeeping';
import {
  IoTimeOutline,
  IoBrushOutline,
  IoCalendarOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoPersonOutline,
  IoPencilOutline,
  IoSaveOutline,
  IoWarningOutline,
  IoStatsChartOutline,
  IoRefreshOutline,
  IoCloseOutline
} from 'react-icons/io5';

const HousekeepingProductivityReport: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isHousekeeper = user?.role === 'HOUSEKEEPER';

  // Period filters
  const [periodType, setPeriodType] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HousekeepingProductivityReportResponse | null>(null);

  // Standards management
  const [standards, setStandards] = useState<CleaningStandardResponse[]>([]);
  const [editingStandardId, setEditingStandardId] = useState<number | null>(null);
  const [checkoutMinInput, setCheckoutMinInput] = useState<number>(45);
  const [periodicMinInput, setPeriodicMinInput] = useState<number>(20);
  const [savingStandard, setSavingStandard] = useState(false);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await housekeepingProductivityApi.getProductivityReport({
        period: periodType,
        date: selectedDate
      });
      setReport(data);
    } catch (err: any) {
      console.error('Fetch productivity report error:', err);
      toast.error(err.response?.data?.message || 'Không thể tải báo cáo năng suất buồng phòng');
    } finally {
      setLoading(false);
    }
  };

  // Fetch standards
  const fetchStandards = async () => {
    if (!isOwnerOrAdmin) return;
    try {
      const list = await housekeepingProductivityApi.getCleaningStandards();
      setStandards(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Fetch cleaning standards error:', err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [periodType, selectedDate]);

  useEffect(() => {
    fetchStandards();
  }, [isOwnerOrAdmin]);

  // Quick period switches
  const setQuickToday = () => {
    setPeriodType('DAY');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const setQuickThisWeek = () => {
    setPeriodType('WEEK');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const setQuickThisMonth = () => {
    setPeriodType('MONTH');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Save standard update
  const handleStartEditStandard = (std: CleaningStandardResponse) => {
    setEditingStandardId(std.roomTypeId);
    setCheckoutMinInput(std.standardCheckoutCleaningMinutes);
    setPeriodicMinInput(std.standardPeriodicCleaningMinutes);
  };

  const handleSaveStandard = async (roomTypeId: number) => {
    if (checkoutMinInput <= 0 || periodicMinInput <= 0) {
      toast.error('Thời gian định mức phải lớn hơn 0 phút');
      return;
    }
    setSavingStandard(true);
    try {
      await housekeepingProductivityApi.updateCleaningStandards({
        standards: [
          {
            roomTypeId,
            standardCheckoutCleaningMinutes: Number(checkoutMinInput),
            standardPeriodicCleaningMinutes: Number(periodicMinInput)
          }
        ]
      });
      toast.success('Đã cập nhật định mức thời gian dọn thành công!');
      setEditingStandardId(null);
      await fetchStandards();
      await fetchReport();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật định mức thời gian');
    } finally {
      setSavingStandard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. NGUYÊN TẮC QUẢN TRỊ & ĐẠO ĐỨC NGHỀ NGHIỆP */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-teal-200/80 rounded-2xl p-4.5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <IoInformationCircleOutline size={22} />
          </div>
          <div className="flex-1 text-xs text-teal-950">
            <h3 className="font-bold text-sm text-teal-900 mb-1 flex items-center gap-2">
              <span>Định mức thời gian & Năng suất buồng phòng khách quan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                Minh bạch • Không phán xét
              </span>
            </h3>
            <p className="text-teal-900/90 leading-relaxed">
              Báo cáo này được thiết kế để <strong>bố trí nhân sự hợp lý và cải thiện quy trình dọn dẹp</strong> dựa trên dữ liệu thực tế thay vì cảm tính. 
              Hệ thống <strong>không tự động xếp hạng hay đánh giá con người</strong>. Mọi phòng có báo sự cố hoặc bị gián đoạn khách quan đều được đánh dấu riêng và <strong>loại trừ khỏi thời gian trung bình</strong> để tránh làm sai lệch số liệu.
            </p>
            {isHousekeeper && (
              <p className="mt-1.5 text-blue-900 font-semibold bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                🔒 Bạn đang xem số liệu thống kê năng suất của chính mình nhằm theo dõi nhịp độ và tối ưu thời gian làm việc.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC THỜI GIAN & ĐIỀU KHIỂN */}
      <div className="bg-white rounded-2xl border border-border-grey p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#F4F6F0] p-1 rounded-xl border border-border-grey">
            <button
              onClick={() => setPeriodType('DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                periodType === 'DAY'
                  ? 'bg-white text-on-surface shadow-xs border border-border-grey/80'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Theo Ngày
            </button>
            <button
              onClick={() => setPeriodType('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                periodType === 'WEEK'
                  ? 'bg-white text-on-surface shadow-xs border border-border-grey/80'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Theo Tuần
            </button>
            <button
              onClick={() => setPeriodType('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                periodType === 'MONTH'
                  ? 'bg-white text-on-surface shadow-xs border border-border-grey/80'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Theo Tháng
            </button>
          </div>

          {/* Chọn mốc thời gian */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-border-grey text-xs bg-white text-on-surface focus:outline-none focus:border-primary shadow-xs"
              />
              <IoCalendarOutline size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={setQuickToday}
                className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-grey text-xs font-medium text-on-surface cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={setQuickThisWeek}
                className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-grey text-xs font-medium text-on-surface cursor-pointer"
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={setQuickThisMonth}
                className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border-grey text-xs font-medium text-on-surface cursor-pointer"
              >
                Tháng này
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-on-surface-variant hidden sm:block">
            Khoảng xem: <span className="font-semibold text-on-surface">{report?.startDate}</span> đến <span className="font-semibold text-on-surface">{report?.endDate}</span>
          </div>
          <button
            onClick={() => { fetchReport(); fetchStandards(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-surface-container-low transition-colors text-on-surface-variant text-xs font-semibold shadow-xs cursor-pointer"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 3. CÁC THẺ KPI TỔNG QUAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng phòng đã dọn */}
        <div className="bg-white p-5 rounded-2xl border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Tổng phòng đã dọn</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <IoBrushOutline size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-on-surface">{report?.totalRoomsCleaned || 0}</span>
            <span className="text-xs text-on-surface-variant">phòng hoàn tất</span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-2">
            <span>Định mức chuẩn TB: {report?.facilityStandardDurationAverage || 45} phút</span>
          </div>
        </div>

        {/* Thời gian dọn trung bình thực tế */}
        <div className="bg-white p-5 rounded-2xl border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Thời gian TB thực tế</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IoTimeOutline size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-on-surface">
              {report?.facilityAverageDurationMinutes ? `${report.facilityAverageDurationMinutes}` : '—'}
            </span>
            <span className="text-xs text-on-surface-variant">phút / phòng</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-medium">
            ✓ Chỉ tính lượt dọn hợp lệ không bị gián đoạn/sự cố
          </p>
        </div>

        {/* Phòng gián đoạn / sự cố (loại trừ khỏi TB) */}
        <div className="bg-white p-5 rounded-2xl border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Gián đoạn / Sự cố</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <IoWarningOutline size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-800">{report?.totalInterruptedOrIncidentRooms || 0}</span>
            <span className="text-xs text-amber-700 font-medium">lượt loại trừ TB</span>
          </div>
          <p className="mt-2 text-[11px] text-amber-700">
            Sự cố đã báo: {report?.totalIncidentsReported || 0}
          </p>
        </div>

        {/* Số lần bị trả lại do nghiệm thu chưa đạt */}
        <div className="bg-white p-5 rounded-2xl border border-border-grey shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Lần yêu cầu dọn lại</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
              <IoAlertCircleOutline size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-700">{report?.totalRejectedInspections || 0}</span>
            <span className="text-xs text-red-600 font-medium">lần kiểm tra chưa đạt</span>
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Căn cứ phản hồi để cải tiến chi tiết vệ sinh
          </p>
        </div>
      </div>

      {/* 4. BẢNG KHAI BÁO ĐỊNH MỨC THỜI GIAN (Dành cho Chủ cơ sở / Quản lý) */}
      {isOwnerOrAdmin && (
        <div className="bg-white rounded-2xl border border-border-grey overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBFDF9]">
            <div>
              <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                <IoTimeOutline className="text-teal-700" size={18} />
                <span>Bảng khai báo định mức thời gian dọn theo loại phòng</span>
              </h3>
              <p className="text-on-surface-variant text-xs mt-0.5">
                Chủ cơ sở thiết lập thời gian tiêu chuẩn cho dọn sau trả phòng và dọn định kỳ làm cơ sở bố trí công việc
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F0] text-on-surface-variant font-bold border-b border-border-grey">
                <tr>
                  <th className="px-5 py-3">Loại phòng</th>
                  <th className="px-5 py-3">Định mức sau trả phòng (Khách Check-out)</th>
                  <th className="px-5 py-3">Định mức dọn định kỳ (Phòng trống)</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey/70">
                {standards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-on-surface-variant">
                      Chưa có dữ liệu loại phòng.
                    </td>
                  </tr>
                ) : (
                  standards.map((std) => {
                    const isEditing = editingStandardId === std.roomTypeId;
                    return (
                      <tr key={std.roomTypeId} className="hover:bg-[#FDFEFA] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-on-surface text-sm">{std.roomTypeName}</div>
                          <div className="text-[11px] text-on-surface-variant">Mã loại: #{std.roomTypeId}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-[140px]">
                              <input
                                type="number"
                                min="1"
                                max="300"
                                value={checkoutMinInput}
                                onChange={(e) => setCheckoutMinInput(Number(e.target.value))}
                                className="w-20 px-2.5 py-1.5 border border-primary rounded-lg text-xs font-bold"
                              />
                              <span className="text-on-surface-variant">phút</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold border border-blue-200">
                                {std.standardCheckoutCleaningMinutes} phút
                              </span>
                              <span className="text-on-surface-variant text-[11px]">chuẩn dọn kỹ</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-[140px]">
                              <input
                                type="number"
                                min="1"
                                max="300"
                                value={periodicMinInput}
                                onChange={(e) => setPeriodicMinInput(Number(e.target.value))}
                                className="w-20 px-2.5 py-1.5 border border-primary rounded-lg text-xs font-bold"
                              />
                              <span className="text-on-surface-variant">phút</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 font-bold border border-teal-200">
                                {std.standardPeriodicCleaningMinutes} phút
                              </span>
                              <span className="text-on-surface-variant text-[11px]">chuẩn lau bụi & khử khuẩn</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveStandard(std.roomTypeId)}
                                disabled={savingStandard}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#626F47] hover:bg-[#525E3B] text-white font-semibold cursor-pointer shadow-xs"
                              >
                                <IoSaveOutline size={14} />
                                <span>{savingStandard ? 'Lưu...' : 'Lưu'}</span>
                              </button>
                              <button
                                onClick={() => setEditingStandardId(null)}
                                className="px-2.5 py-1.5 rounded-lg border border-border-grey hover:bg-surface-container text-on-surface-variant cursor-pointer"
                              >
                                <IoCloseOutline size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditStandard(std)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-grey hover:bg-[#F4F6F0] text-on-surface font-medium cursor-pointer ml-auto"
                            >
                              <IoPencilOutline size={13} />
                              <span>Sửa định mức</span>
                            </button>
                          )}
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

      {/* 5. BẢNG THỐNG KÊ THEO NHÂN VIÊN */}
      <div className="bg-white rounded-2xl border border-border-grey overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBFDF9]">
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
              <IoPersonOutline className="text-[#626F47]" size={18} />
              <span>
                {isHousekeeper ? 'Số liệu năng suất cá nhân của bạn' : 'Thống kê năng suất dọn phòng theo từng nhân viên'}
              </span>
            </h3>
            <p className="text-on-surface-variant text-xs mt-0.5">
              Thời gian trung bình được tính trên các phòng dọn thành công, không tính các phòng bị gián đoạn hoặc gặp sự cố
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F0] text-on-surface-variant font-bold border-b border-border-grey">
              <tr>
                <th className="px-5 py-3">Nhân viên buồng phòng</th>
                <th className="px-5 py-3 text-center">Số phòng đã dọn</th>
                <th className="px-5 py-3 text-center">Thời gian dọn TB (phút)</th>
                <th className="px-5 py-3 text-center">Gián đoạn / Sự cố</th>
                <th className="px-5 py-3 text-center">Số lần bị trả lại</th>
                <th className="px-5 py-3 text-center">Sự cố đã báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-grey/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">
                    <span className="inline-block animate-spin mr-2">⏳</span> Đang tải số liệu năng suất...
                  </td>
                </tr>
              ) : !report?.housekeeperStats || report.housekeeperStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">
                    Chưa có lượt dọn phòng nào hoàn tất trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                report.housekeeperStats.map((st: HousekeeperProductivityStat) => (
                  <tr key={st.housekeeperId} className="hover:bg-[#FDFEFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A2411]/10 text-on-surface font-bold flex items-center justify-center text-xs">
                          {st.housekeeperName?.slice(0, 1) || 'N'}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface text-sm">
                            {st.housekeeperName}
                            {user?.id && String(user.id) === String(st.housekeeperId) && (
                              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-on-surface-variant">
                            Mã NV: #{st.housekeeperId} {st.housekeeperPhone ? `• ${st.housekeeperPhone}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="font-extrabold text-base text-on-surface">
                        {st.totalRoomsCleaned}
                      </span>
                      <div className="text-[10px] text-on-surface-variant">phòng</div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {st.averageDurationMinutes > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold text-sm">
                            {st.averageDurationMinutes} phút
                          </span>
                          <span className="text-[10px] text-on-surface-variant mt-0.5">
                            ({st.completedNormalRoomsCount} phòng hợp lệ)
                          </span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/70 italic text-[11px]">
                          Chưa có lượt dọn hợp lệ
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {st.interruptedOrIncidentRoomsCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs">
                          {st.interruptedOrIncidentRoomsCount} phòng (đã loại trừ)
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">0</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {st.rejectedInspectionCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-300 text-red-800 font-bold text-xs">
                          {st.rejectedInspectionCount} lần
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">0</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="font-semibold text-on-surface">
                        {st.incidentReportedCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CHI TIẾT CÁC LƯỢT DỌN TRONG KỲ */}
      <div className="bg-white rounded-2xl border border-border-grey overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBFDF9]">
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
              <IoStatsChartOutline className="text-blue-700" size={18} />
              <span>Nhật ký dọn dẹp chi tiết ({report?.records?.length || 0} lượt hoàn tất)</span>
            </h3>
            <p className="text-on-surface-variant text-xs mt-0.5">
              Theo dõi chi tiết từng phòng, mốc thời gian thực tế, lý do gián đoạn và đánh dấu loại trừ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F0] text-on-surface-variant font-bold border-b border-border-grey">
              <tr>
                <th className="px-5 py-3">Phòng</th>
                <th className="px-5 py-3">Nhân viên</th>
                <th className="px-5 py-3">Loại dọn</th>
                <th className="px-5 py-3">Thời gian thực tế vs Định mức</th>
                <th className="px-5 py-3">Thời điểm dọn</th>
                <th className="px-5 py-3">Trạng thái tính toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-grey/70">
              {!report?.records || report.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">
                    Không có lượt dọn nào trong danh sách.
                  </td>
                </tr>
              ) : (
                report.records.map((rec: CleaningRecordDetailResponse) => {
                  return (
                    <tr key={rec.id} className="hover:bg-[#FDFEFA] transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-extrabold text-sm text-on-surface">
                          Phòng {rec.roomNumber}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {rec.roomTypeName}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-semibold text-on-surface">
                          {rec.housekeeperName}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        {rec.cleaningType === 'PERIODIC' ? (
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                            Định kỳ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                            Sau khách trả
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${
                            rec.actualDurationMinutes && rec.standardDurationMinutes && rec.actualDurationMinutes > rec.standardDurationMinutes
                              ? 'text-amber-800'
                              : 'text-emerald-800'
                          }`}>
                            {rec.actualDurationMinutes || 0} phút
                          </span>
                          <span className="text-on-surface-variant text-[11px]">
                            / Chuẩn {rec.standardDurationMinutes || 45}p
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-on-surface-variant text-[11px]">
                        <div>{rec.startedAt ? new Date(rec.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'} → {rec.completedAt ? new Date(rec.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        <div className="text-[10px] text-on-surface-variant/70">{rec.completedAt ? new Date(rec.completedAt).toLocaleDateString('vi-VN') : ''}</div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {rec.isExcludedFromAverage ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1">
                              <IoWarningOutline size={12} />
                              Loại trừ khỏi TB
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                              <IoCheckmarkCircleOutline size={12} />
                              Hợp lệ tính TB
                            </span>
                          )}

                          {rec.isInterrupted && (
                            <span className="text-[10px] text-amber-800 italic" title={rec.interruptionReason || ''}>
                              ⚠️ Gián đoạn: {rec.interruptionReason || 'Có lý do khách quan'}
                            </span>
                          )}

                          {rec.hasIncident && (
                            <span className="text-[10px] text-orange-800 italic">
                              ⚡ Có báo sự cố phòng ({rec.incidentCount} sự cố)
                            </span>
                          )}

                          {rec.rejectionCount > 0 && (
                            <span className="text-[10px] text-red-700 font-medium">
                              ❌ Bị trả lại {rec.rejectionCount} lần {rec.rejectionNote ? `(${rec.rejectionNote})` : ''}
                            </span>
                          )}
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
    </div>
  );
};

export default HousekeepingProductivityReport;
