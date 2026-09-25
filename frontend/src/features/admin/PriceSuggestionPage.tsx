import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoTrendingUpOutline, 
  IoTrendingDownOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline, 
  IoRefreshOutline, 
  IoSettingsOutline, 
  IoEyeOffOutline, 
  IoArrowForwardOutline,
  IoCalendarOutline,
  IoBedOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoInformationCircleOutline,
  IoHelpCircleOutline,
  IoArrowUndoOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoSparkles,
  IoSparklesOutline,
  IoSend,
  IoChatbubbleEllipsesOutline,
  IoBulbOutline
} from 'react-icons/io5';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import priceSuggestionApi from '../../services/priceSuggestionApi';
import aiApi from '../../services/aiApi';
import { 
  PriceSuggestionDto, 
  PriceSuggestionResponse, 
  PriceSuggestionConfigRequest 
} from '../../types';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const renderAiMarkdown = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-xs sm:text-sm font-bold text-primary mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-sm sm:text-base font-bold text-on-surface border-b border-border-grey pb-1 mt-3">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-base font-extrabold text-on-surface mt-3">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const text = trimmed.substring(2);
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <div className="text-on-surface">
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={pIdx} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </div>
            </div>
          );
        }
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-on-surface">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

const PriceSuggestionPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<PriceSuggestionResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'increase' | 'decrease' | 'dismissed'>('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Modal Cấu hình ngưỡng
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<PriceSuggestionConfigRequest>({
    highOccupancyThreshold: 80,
    lowOccupancyThreshold: 30,
    imminentDaysThreshold: 7
  });
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Modal Xác nhận bỏ qua
  const [dismissTargetDate, setDismissTargetDate] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);

  // === AI Price Analysis State ===
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiOverallAnalysis, setAiOverallAnalysis] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [isAiAsking, setIsAiAsking] = useState<boolean>(false);
  const [aiQnAList, setAiQnAList] = useState<Array<{ question: string; answer: string; timestamp: string }>>([]);
  const [activeDayAi, setActiveDayAi] = useState<{ date: string; analysis: string } | null>(null);
  const [loadingDayAiDate, setLoadingDayAiDate] = useState<string | null>(null);
  const [isDayAiModalOpen, setIsDayAiModalOpen] = useState<boolean>(false);

  // Tính toán dữ liệu kinh doanh 30 ngày cần thiết cho việc phân tích
  const metrics = React.useMemo(() => {
    if (!data?.suggestions || data.suggestions.length === 0) {
      return {
        avgOccupancy: 0,
        totalBookedNights: 0,
        totalCapacityNights: 0,
        weekendAvgOcc: 0,
        weekdayAvgOcc: 0,
        estimatedRevenue: 0,
        potentialBoostRevenue: 0,
        roomTypeSummary: [] as Array<{
          name: string;
          basePrice: number;
          totalRooms: number;
          bookedRooms30d: number;
          occRate: number;
        }>
      };
    }

    const suggestions = data.suggestions;
    let totalBooked = 0;
    let totalCapacity = 0;
    let weekendBooked = 0;
    let weekendCap = 0;
    let weekdayBooked = 0;
    let weekdayCap = 0;
    let totalRev = 0;

    const roomTypeMap = new Map<string, { name: string; basePrice: number; totalRooms: number; booked: number; daysCount: number }>();

    for (const s of suggestions) {
      const occ = s.occupiedRooms || 0;
      const tot = s.totalRooms || 0;
      totalBooked += occ;
      totalCapacity += tot;

      const dow = s.dayOfWeek || '';
      const isWeekend = ['Thứ 6', 'Thứ 7', 'Chủ Nhật', 'Friday', 'Saturday', 'Sunday'].includes(dow);
      if (isWeekend) {
        weekendBooked += occ;
        weekendCap += tot;
      } else {
        weekdayBooked += occ;
        weekdayCap += tot;
      }

      if (s.roomTypeBreakdown) {
        for (const rt of s.roomTypeBreakdown) {
          const key = rt.roomTypeName;
          const prev = roomTypeMap.get(key) || {
            name: rt.roomTypeName,
            basePrice: rt.basePrice || 0,
            totalRooms: rt.totalRooms || 0,
            booked: 0,
            daysCount: 0
          };
          prev.booked += (rt.occupiedRooms || 0);
          prev.daysCount += 1;
          roomTypeMap.set(key, prev);

          totalRev += (rt.occupiedRooms || 0) * (rt.basePrice || 0);
        }
      }
    }

    const avgOcc = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
    const weekendAvgOcc = weekendCap > 0 ? (weekendBooked / weekendCap) * 100 : 0;
    const weekdayAvgOcc = weekdayCap > 0 ? (weekdayBooked / weekdayCap) * 100 : 0;
    const potentialBoostRevenue = Math.round(totalRev * 0.14);

    const roomTypeSummary = Array.from(roomTypeMap.values()).map(r => {
      const maxPossible = r.totalRooms * (r.daysCount || 30);
      const occRate = maxPossible > 0 ? (r.booked / maxPossible) * 100 : 0;
      return {
        name: r.name,
        basePrice: r.basePrice,
        totalRooms: r.totalRooms,
        bookedRooms30d: r.booked,
        occRate: Math.round(occRate * 10) / 10
      };
    });

    return {
      avgOccupancy: Math.round(avgOcc * 10) / 10,
      totalBookedNights: totalBooked,
      totalCapacityNights: totalCapacity,
      weekendAvgOcc: Math.round(weekendAvgOcc * 10) / 10,
      weekdayAvgOcc: Math.round(weekdayAvgOcc * 10) / 10,
      estimatedRevenue: totalRev,
      potentialBoostRevenue,
      roomTypeSummary
    };
  }, [data]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      // Lấy toàn bộ gợi ý bao gồm cả đã bỏ qua để phân loại tab
      const res = await priceSuggestionApi.getSuggestions(30, true);
      setData(res);
      if (res) {
        setConfigForm({
          highOccupancyThreshold: res.highOccupancyThreshold || 80,
          lowOccupancyThreshold: res.lowOccupancyThreshold || 30,
          imminentDaysThreshold: res.imminentDaysThreshold || 7
        });
      }
    } catch (err: any) {
      console.error('Failed to load suggestions:', err);
      toastError(err?.response?.data?.message || 'Không thể tải danh sách gợi ý điều chỉnh giá.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.highOccupancyThreshold <= configForm.lowOccupancyThreshold) {
      toastError('Ngưỡng trên phải lớn hơn ngưỡng dưới.');
      return;
    }

    try {
      setIsSavingConfig(true);
      await priceSuggestionApi.updateConfig(configForm);
      toastSuccess('Đã cập nhật cấu hình ngưỡng lấp đầy thành công.');
      setIsConfigModalOpen(false);
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to save config:', err);
      toastError(err?.response?.data?.message || 'Cập nhật cấu hình thất bại.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDismiss = async () => {
    if (!dismissTargetDate) return;
    try {
      setIsDismissing(true);
      await priceSuggestionApi.dismissSuggestion(dismissTargetDate);
      toastSuccess(`Đã bỏ qua gợi ý cho ngày ${dismissTargetDate}. Gợi ý sẽ không hiện lại.`);
      setDismissTargetDate(null);
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to dismiss suggestion:', err);
      toastError(err?.response?.data?.message || 'Bỏ qua gợi ý thất bại.');
    } finally {
      setIsDismissing(false);
    }
  };

  const handleRestore = async (targetDate: string) => {
    try {
      await priceSuggestionApi.restoreSuggestion(targetDate);
      toastSuccess(`Đã khôi phục gợi ý cho ngày ${targetDate}.`);
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to restore suggestion:', err);
      toastError(err?.response?.data?.message || 'Khôi phục gợi ý thất bại.');
    }
  };

  // === AI Handlers ===
  const handleRunOverallAiAnalysis = async () => {
    try {
      setIsAiAnalyzing(true);
      setIsAiPanelOpen(true);
      const res = await aiApi.analyzeOverall(30);
      if (res.error) {
        toastError(res.errorMessage || 'Không thể thực hiện phân tích AI lúc này.');
      } else {
        setAiOverallAnalysis(res.reply);
        toastSuccess('Hoàn tất phân tích chiến lược giá bằng AI!');
      }
    } catch (err: any) {
      console.error('AI overall analysis failed:', err);
      toastError(err?.response?.data?.message || err?.message || 'Lỗi khi gọi phân tích AI.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = aiQuestion.trim();
    if (!q || isAiAsking) return;

    try {
      setIsAiAsking(true);
      const res = await aiApi.askAboutPricing({ question: q, days: 30 });
      if (res.error) {
        toastError(res.errorMessage || 'Lỗi khi đặt câu hỏi cho AI.');
      } else {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setAiQnAList((prev) => [...prev, { question: q, answer: res.reply, timestamp: timeStr }]);
        setAiQuestion('');
      }
    } catch (err: any) {
      console.error('AI ask failed:', err);
      toastError(err?.response?.data?.message || 'Lỗi kết nối tới AI.');
    } finally {
      setIsAiAsking(false);
    }
  };

  const handleAnalyzeDay = async (targetDate: string) => {
    try {
      setLoadingDayAiDate(targetDate);
      const res = await aiApi.analyzeDay(targetDate);
      if (res.error) {
        toastError(res.errorMessage || 'Không thể phân tích ngày này bằng AI.');
      } else {
        setActiveDayAi({ date: targetDate, analysis: res.reply });
        setIsDayAiModalOpen(true);
      }
    } catch (err: any) {
      console.error('AI day analysis failed:', err);
      toastError(err?.response?.data?.message || 'Lỗi phân tích ngày bằng AI.');
    } finally {
      setLoadingDayAiDate(null);
    }
  };

  // Lọc danh sách theo Tab
  const filteredSuggestions = (data?.suggestions || []).filter((s) => {
    if (activeTab === 'dismissed') {
      return s.dismissed;
    }
    // Các tab hoạt động không chứa gợi ý đã bỏ qua và không lấy OPTIMAL
    if (s.dismissed || s.suggestionType === 'OPTIMAL') {
      return false;
    }
    if (activeTab === 'increase') {
      return s.suggestionType === 'INCREASE_PRICE';
    }
    if (activeTab === 'decrease') {
      return s.suggestionType === 'DECREASE_PRICE_OR_CHANNELS';
    }
    return true;
  });

  const toggleExpand = (dateStr: string) => {
    setExpandedDate(prev => prev === dateStr ? null : dateStr);
  };

  return (
    <div className="space-y-4">
      {/* Header trang */}
      <PageHeader
        icon={IoTrendingUpOutline}
        title="Gợi ý điều chỉnh giá theo công suất dự báo"
        subtitle="Phân tích chiến lược & Gợi ý điều chỉnh giá thông minh bằng AI Gemini Flash nạp toàn bộ công suất 30 ngày, dữ liệu quá khứ và giá các loại phòng"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunOverallAiAnalysis}
              isLoading={isAiAnalyzing}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white shadow-xs cursor-pointer"
            >
              <IoSparkles size={16} className="text-lodgify-lime" />
              <span>AI Phân tích chiến lược 30 ngày</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <IoSettingsOutline size={16} />
              <span>Cấu hình ngưỡng</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <IoRefreshOutline size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/manage/room-types')}
              className="flex items-center gap-1.5 bg-agoda-blue"
            >
              <IoBedOutline size={16} />
              <span>Cấu hình giá phòng</span>
            </Button>
          </div>
        }
      />

      {/* Cam kết kiểm soát & An toàn: Tuyệt đối không tự ý đổi giá */}
      <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-DEFAULT flex items-start gap-3">
        <IoShieldCheckmarkOutline size={20} className="text-[#2563EB] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1E40AF]">
          <p className="font-bold">Hệ thống hỗ trợ gợi ý có kiểm soát — Tuyệt đối không tự động đổi giá</p>
          <p className="mt-0.5 text-on-surface-variant">
            Mọi gợi ý chỉ mang tính chất tham khảo dựa trên công suất phòng và dữ liệu tham chiếu. 
            Mọi thao tác thay đổi giá phải do Chủ cơ sở trực tiếp thực hiện qua tính năng cấu hình giá đã có.
          </p>
        </div>
      </div>

      {/* Dữ liệu Kinh Doanh & Dự Báo 30 Ngày (Dành cho AI và Chủ cơ sở) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Công suất trung bình */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Công suất dự báo 30 ngày</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-extrabold ${metrics.avgOccupancy >= (data?.highOccupancyThreshold || 80) ? 'text-alert-red' : metrics.avgOccupancy <= (data?.lowOccupancyThreshold || 30) ? 'text-primary' : 'text-on-surface'}`}>
              {metrics.avgOccupancy}%
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              ({metrics.totalBookedNights}/{metrics.totalCapacityNights} đêm)
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${metrics.avgOccupancy >= 70 ? 'bg-emerald-600' : metrics.avgOccupancy >= 40 ? 'bg-agoda-blue' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, metrics.avgOccupancy)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Doanh thu phòng cơ sở dự kiến */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Doanh thu phòng đã đặt</span>
          <div className="mt-1">
            <span className="text-2xl font-extrabold text-on-surface">
              {fmtCurrency(metrics.estimatedRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1.5">
            Tính trên các lượt đặt hiện có trong 30 ngày tới
          </p>
        </div>

        {/* Card 3: Tiềm năng tối ưu thêm */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Tiềm năng tăng thêm (AI)</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              +14%
            </span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-extrabold text-emerald-700">
              +{fmtCurrency(metrics.potentialBoostRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1.5">
            Ước tính khi tăng giá ngày cao điểm &amp; kích cầu
          </p>
        </div>

        {/* Card 4: Phân bổ Cuối tuần vs Ngày thường */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Cuối tuần vs Ngày thường</span>
          <div className="flex items-center justify-between mt-1 text-xs">
            <div>
              <span className="text-on-surface-variant">Cuối tuần (T6-CN):</span>
              <p className="text-base font-bold text-alert-red">{metrics.weekendAvgOcc}%</p>
            </div>
            <div className="text-right">
              <span className="text-on-surface-variant">Ngày thường (T2-T5):</span>
              <p className="text-base font-bold text-primary">{metrics.weekdayAvgOcc}%</p>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1">
            Chênh lệch: <strong>{Math.round((metrics.weekendAvgOcc - metrics.weekdayAvgOcc) * 10) / 10}%</strong>
          </p>
        </div>
      </div>

      {/* Thẻ Bảng Tóm Tắt Công Suất Theo Từng Loại Phòng */}
      {metrics.roomTypeSummary.length > 0 && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-DEFAULT p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <IoBedOutline className="text-primary" size={15} />
              <span>Phân rã nhu cầu &amp; Công suất theo từng hạng phòng (30 ngày tới)</span>
            </h4>
            <span className="text-[11px] text-on-surface-variant">
              Tổng số phòng cơ sở: <strong>{data?.totalRooms || 0} phòng</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {metrics.roomTypeSummary.map((rt) => {
              const isHigh = rt.occRate >= 70;
              const isLow = rt.occRate <= 35;
              return (
                <div key={rt.name} className="p-3 bg-surface-container-low border border-border-grey rounded-DEFAULT text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-on-surface font-bold truncate">{rt.name}</strong>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isHigh
                        ? 'bg-red-50 text-alert-red border border-red-200'
                        : isLow
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isHigh ? 'Nhu cầu cao' : isLow ? 'Nhu cầu thấp' : 'Ổn định'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-on-surface-variant">
                    <span>Giá cơ sở:</span>
                    <strong className="text-on-surface">{fmtCurrency(rt.basePrice)}/đêm</strong>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-on-surface-variant">
                    <span>Đã bán 30 ngày:</span>
                    <strong className="text-on-surface">{rt.bookedRooms30d} đêm ({rt.occRate}%)</strong>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHigh ? 'bg-alert-red' : isLow ? 'bg-amber-500' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(100, rt.occRate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trợ Lý AI Phân Tích & Chiến Lược Giá (Đồng bộ chuẩn hệ thống StayAway) */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-DEFAULT shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-DEFAULT bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <IoSparkles size={20} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-on-surface">
                  Chiến Lược Định Giá &amp; Tối Ưu Doanh Thu Bằng AI
                </h3>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  Gemini Flash AI
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                AI nạp toàn bộ công suất 30 ngày, lịch sử đặt phòng và giá từng hạng phòng để chẩn đoán &amp; khuyến nghị tăng/giảm giá.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isAiAnalyzing}
              onClick={handleRunOverallAiAnalysis}
              className="bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <IoSparkles size={15} className="text-lodgify-lime" />
              <span>{aiOverallAnalysis ? 'Phân tích lại toàn diện' : 'Khởi chạy Phân tích AI'}</span>
            </Button>
            {aiOverallAnalysis && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAiPanelOpen((v) => !v)}
              >
                {isAiPanelOpen ? 'Thu gọn' : 'Xem kết quả'}
              </Button>
            )}
          </div>
        </div>

        {/* Nội dung kết quả phân tích AI */}
        {isAiPanelOpen && (
          <div className="pt-3 border-t border-border-grey space-y-4 animate-page-enter">
            {isAiAnalyzing ? (
              <div className="py-8 text-center space-y-2.5 bg-surface-container-low rounded-DEFAULT border border-border-grey">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface">Đang phân tích dữ liệu 30 ngày với Gemini AI...</p>
                <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
                  Hệ thống đang đối chiếu tỷ lệ lấp đầy, xu hướng cuối tuần và tính toán mức điều chỉnh giá tối ưu doanh thu cho từng loại phòng.
                </p>
              </div>
            ) : aiOverallAnalysis ? (
              <div className="bg-surface-container-low border border-border-grey rounded-DEFAULT p-4 text-xs text-on-surface leading-relaxed max-h-[500px] overflow-y-auto">
                {renderAiMarkdown(aiOverallAnalysis)}
              </div>
            ) : null}

            {/* Khung đặt câu hỏi tùy ý cho AI */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <IoChatbubbleEllipsesOutline size={15} className="text-primary" />
                <span>Đặt câu hỏi chiến lược cho AI:</span>
              </label>
              <form onSubmit={handleAskAi} className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ví dụ: Cuối tuần sau tôi nên tăng giá phòng nào? Làm sao để lấp đầy phòng thứ 2-4?..."
                  className="flex-1 text-xs bg-surface-container-lowest border border-border-grey rounded-DEFAULT px-3.5 py-2.5 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAiAsking}
                  disabled={!aiQuestion.trim()}
                  className="bg-primary hover:bg-primary-hover text-white shrink-0 cursor-pointer"
                >
                  <IoSend size={13} />
                  <span>Gửi</span>
                </Button>
              </form>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-on-surface-variant">Gợi ý nhanh:</span>
                {[
                  'Cuối tuần sau nên tăng giá bao nhiêu %?',
                  'Làm sao để lấp đầy phòng thứ 2 - thứ 5?',
                  'Hạng phòng nào đang có doanh thu thấp nhất?'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiQuestion(chip);
                    }}
                    className="bg-surface-container-low hover:bg-surface-container border border-border-grey text-on-surface px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Lịch sử hỏi đáp AI */}
            {aiQnAList.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <IoBulbOutline size={15} className="text-amber-600" />
                  <span>Lịch sử trao đổi với AI ({aiQnAList.length}):</span>
                </p>
                {aiQnAList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low border border-border-grey rounded-DEFAULT text-xs space-y-2">
                    <div className="flex items-center justify-between text-on-surface font-bold">
                      <span className="text-primary">Q: {item.question}</span>
                      <span className="text-[10px] text-on-surface-variant font-normal">{item.timestamp}</span>
                    </div>
                    <div className="p-2.5 bg-surface-container-lowest border border-border-grey/70 rounded-md text-on-surface leading-relaxed">
                      {renderAiMarkdown(item.answer)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thanh trạng thái Tiền điều kiện & Độ tin cậy dữ liệu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tiền điều kiện 1: Đủ 3 tháng dữ liệu công suất */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary">Dữ liệu công suất tối thiểu</span>
            {data?.hasMinimumData ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <IoCheckmarkCircleOutline size={13} />
                Đủ điều kiện (≥ 3 tháng)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <IoAlertCircleOutline size={13} />
                Chưa đủ 3 tháng
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-on-surface mt-1.5">
            Đã tích lũy: {data?.dataMonthsCount || 0} tháng
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {data?.hasMinimumData 
              ? 'Hệ thống có đủ lịch sử để đánh giá xu hướng công suất.'
              : 'Dữ liệu quá khứ còn ít, gợi ý có thể chưa phản ánh hết chu kỳ mùa vụ.'}
          </p>
        </div>

        {/* Tiền điều kiện 2: Độ tin cậy dữ liệu quá khứ (1 năm) */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary">Độ tin cậy dữ liệu lịch sử</span>
            {data?.hasFullYearData ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <IoCheckmarkCircleOutline size={13} />
                Mức tin cậy Cao
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <IoAlertCircleOutline size={13} />
                Mức tin cậy Thấp
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-on-surface mt-1.5">
            {data?.hasFullYearData ? 'Đầy đủ dữ liệu cùng kỳ năm trước' : 'Chưa đủ dữ liệu 1 năm'}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {data?.hasFullYearData
              ? 'Gợi ý được đối chiếu trực tiếp với cùng kỳ năm ngoái.'
              : 'Hệ thống chỉ dùng ngưỡng do bạn cấu hình làm tham chiếu.'}
          </p>
        </div>

        {/* Ngưỡng cấu hình hiện tại */}
        <div className="p-3.5 bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary">Ngưỡng cấu hình đang dùng</span>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Chỉnh sửa
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div>
              <span className="text-on-surface-variant">Ngưỡng trên:</span>{' '}
              <span className="font-bold text-alert-red">≥ {data?.highOccupancyThreshold || 80}%</span>
            </div>
            <div>
              <span className="text-on-surface-variant">Ngưỡng dưới:</span>{' '}
              <span className="font-bold text-primary">≤ {data?.lowOccupancyThreshold || 30}%</span>
            </div>
            <div>
              <span className="text-on-surface-variant">Cận kề:</span>{' '}
              <span className="font-bold text-on-surface">≤ {data?.imminentDaysThreshold || 7} ngày</span>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1.5">
            Tổng số phòng cơ sở: <strong>{data?.totalRooms || 0} phòng</strong>
          </p>
        </div>
      </div>

      {/* KPI Cards: Tổng hợp số lượng ngày cần xử lý */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveTab('all')}
          className={`p-3 bg-surface-container-lowest border rounded-DEFAULT cursor-pointer transition-all ${
            activeTab === 'all' ? 'border-primary ring-1 ring-primary' : 'border-border-grey hover:border-outline'
          }`}
        >
          <p className="text-xs font-semibold text-secondary">Tổng ngày cần xem lại</p>
          <p className="text-2xl font-extrabold text-on-surface mt-1">
            {(data?.increaseCount || 0) + (data?.decreaseCount || 0)}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Trong 30 ngày tới</p>
        </div>

        <div 
          onClick={() => setActiveTab('increase')}
          className={`p-3 bg-surface-container-lowest border rounded-DEFAULT cursor-pointer transition-all ${
            activeTab === 'increase' ? 'border-alert-red ring-1 ring-alert-red' : 'border-border-grey hover:border-outline'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-alert-red">Cân nhắc tăng giá</p>
            <IoTrendingUpOutline size={16} className="text-alert-red" />
          </div>
          <p className="text-2xl font-extrabold text-alert-red mt-1">
            {data?.increaseCount || 0}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Ngày cháy phòng (≥ {data?.highOccupancyThreshold}%)</p>
        </div>

        <div 
          onClick={() => setActiveTab('decrease')}
          className={`p-3 bg-surface-container-lowest border rounded-DEFAULT cursor-pointer transition-all ${
            activeTab === 'decrease' ? 'border-primary ring-1 ring-primary' : 'border-border-grey hover:border-outline'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">Cân nhắc giảm giá / mở kênh</p>
            <IoTrendingDownOutline size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-primary mt-1">
            {data?.decreaseCount || 0}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Cận kề vắng khách (≤ {data?.lowOccupancyThreshold}%)</p>
        </div>

        <div 
          onClick={() => setActiveTab('dismissed')}
          className={`p-3 bg-surface-container-lowest border rounded-DEFAULT cursor-pointer transition-all ${
            activeTab === 'dismissed' ? 'border-secondary ring-1 ring-secondary' : 'border-border-grey hover:border-outline'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-secondary">Đã bỏ qua</p>
            <IoEyeOffOutline size={16} className="text-secondary" />
          </div>
          <p className="text-2xl font-extrabold text-secondary mt-1">
            {data?.dismissedCount || 0}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Không hiện lại</p>
        </div>
      </div>

      {/* Bộ lọc Tab */}
      <div className="flex items-center gap-1 border-b border-border-grey pt-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          Tất cả cần xử lý ({(data?.increaseCount || 0) + (data?.decreaseCount || 0)})
        </button>
        <button
          onClick={() => setActiveTab('increase')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'increase'
              ? 'border-alert-red text-alert-red'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-alert-red"></span>
          Nên tăng giá ({data?.increaseCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('decrease')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'decrease'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-agoda-blue"></span>
          Nên giảm giá / Mở kênh ({data?.decreaseCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('dismissed')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'dismissed'
              ? 'border-secondary text-on-surface'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          Đã bỏ qua ({data?.dismissedCount || 0})
        </button>
      </div>

      {/* Danh sách các ngày gợi ý */}
      {isLoading ? (
        <div className="p-8 text-center bg-surface-container-lowest border border-border-grey rounded-DEFAULT">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-on-surface-variant">Đang rà soát công suất 30 ngày tới...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="p-10 text-center bg-surface-container-lowest border border-border-grey rounded-DEFAULT space-y-2">
          <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mx-auto text-secondary">
            <IoCheckmarkCircleOutline size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-on-surface">
            {activeTab === 'dismissed' 
              ? 'Chưa có gợi ý nào bị bỏ qua' 
              : 'Không có ngày nào cần điều chỉnh giá'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            {activeTab === 'dismissed'
              ? 'Khi bạn bấm "Bỏ qua" trên một gợi ý, ngày đó sẽ được chuyển vào đây để xem lại hoặc khôi phục.'
              : 'Mức lấp đầy các ngày trong 30 ngày tới đang ở mức bình thường hoặc phù hợp với thời gian còn lại.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuggestions.map((item) => {
            const isIncrease = item.suggestionType === 'INCREASE_PRICE';
            const isDecrease = item.suggestionType === 'DECREASE_PRICE_OR_CHANNELS';
            const isExpanded = expandedDate === item.targetDate;

            return (
              <div 
                key={item.targetDate}
                className={`bg-surface-container-lowest border rounded-DEFAULT transition-all ${
                  item.dismissed 
                    ? 'border-border-grey opacity-75'
                    : isIncrease 
                      ? 'border-[#FECACA] hover:border-alert-red' 
                      : 'border-[#BAE6FD] hover:border-primary'
                }`}
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Cột 1: Ngày & Loại gợi ý */}
                  <div className="flex items-start gap-3 min-w-[220px]">
                    <div className={`p-2.5 rounded-DEFAULT shrink-0 text-center min-w-[64px] border ${
                      isIncrease 
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-alert-red' 
                        : isDecrease 
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] text-primary' 
                          : 'bg-surface-container border-border-grey text-secondary'
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider">{item.dayOfWeek}</p>
                      <p className="text-lg font-extrabold leading-tight">{item.targetDate.split('-')[2]}</p>
                      <p className="text-[10px] font-semibold text-on-surface-variant">{item.targetDate.split('-')[1]}/{item.targetDate.split('-')[0]}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isIncrease && (
                          <span className="px-2 py-0.5 bg-[#FEF2F2] text-alert-red rounded font-bold text-xs border border-[#FECACA] inline-flex items-center gap-1">
                            <IoTrendingUpOutline size={13} />
                            Cân nhắc tăng giá
                          </span>
                        )}
                        {isDecrease && (
                          <span className="px-2 py-0.5 bg-[#EFF6FF] text-primary rounded font-bold text-xs border border-[#BFDBFE] inline-flex items-center gap-1">
                            <IoTrendingDownOutline size={13} />
                            Cân nhắc giảm giá / Mở kênh
                          </span>
                        )}
                        {item.dismissed && (
                          <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded text-xs font-semibold">
                            Đã bỏ qua
                          </span>
                        )}
                        <span className="text-xs font-semibold text-secondary bg-surface-container px-2 py-0.5 rounded">
                          Còn {item.daysRemaining} ngày
                        </span>
                      </div>

                      {/* Khuyến nghị chi tiết */}
                      <p className="text-xs text-on-surface mt-2 font-medium leading-relaxed">
                        {item.recommendation}
                      </p>

                      {/* Độ tin cậy & Ghi chú */}
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                        <span className={`font-semibold ${item.confidenceLevel === 'HIGH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          • Mức tin cậy: {item.confidenceLevel === 'HIGH' ? 'Cao' : 'Thấp'}
                        </span>
                        <span>—</span>
                        <span className="italic">{item.confidenceNote}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Căn cứ minh bạch (Metrics) */}
                  <div className="flex items-center gap-4 border-y md:border-y-0 md:border-x border-border-grey py-3 md:py-0 md:px-5 shrink-0">
                    <div>
                      <span className="text-[11px] font-semibold text-secondary uppercase block">Mức lấp đầy</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xl font-extrabold ${isIncrease ? 'text-alert-red' : isDecrease ? 'text-primary' : 'text-on-surface'}`}>
                          {item.currentOccupancyRate}%
                        </span>
                      </div>
                      <div className="w-24 bg-surface-container rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isIncrease ? 'bg-alert-red' : isDecrease ? 'bg-agoda-blue' : 'bg-secondary'}`}
                          style={{ width: `${Math.min(100, item.currentOccupancyRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <p>
                        <span className="text-on-surface-variant">Đã đặt:</span>{' '}
                        <strong className="text-on-surface">{item.occupiedRooms}/{item.totalRooms} phòng</strong>
                      </p>
                      <p>
                        <span className="text-on-surface-variant">Còn trống:</span>{' '}
                        <strong className={`${item.vacantRooms === 0 ? 'text-alert-red' : 'text-emerald-700'}`}>
                          {item.vacantRooms} phòng
                        </strong>
                      </p>
                      <p>
                        <span className="text-on-surface-variant">Cùng kỳ năm trước:</span>{' '}
                        <strong>
                          {item.referenceOccupancyRate !== null ? `${item.referenceOccupancyRate}%` : 'Chưa có'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Cột 3: Hành động của Chủ cơ sở */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-end gap-2 shrink-0">
                    {!item.dismissed ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/manage/room-types')}
                          className="flex items-center gap-1.5 bg-agoda-blue whitespace-nowrap"
                        >
                          <span>Xem & Điều chỉnh giá</span>
                          <IoArrowForwardOutline size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAnalyzeDay(item.targetDate)}
                          isLoading={loadingDayAiDate === item.targetDate}
                          className="flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary whitespace-nowrap cursor-pointer"
                          title="Xem AI phân tích chuyên sâu cho ngày này"
                        >
                          <IoSparkles size={14} className="text-primary" />
                          <span>AI Phân tích</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDismissTargetDate(item.targetDate)}
                          className="flex items-center gap-1 text-secondary border-border-grey hover:bg-surface-container whitespace-nowrap"
                        >
                          <IoEyeOffOutline size={14} />
                          <span>Bỏ qua</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.targetDate)}
                        className="flex items-center gap-1 text-primary border-primary hover:bg-surface-blue-light whitespace-nowrap"
                      >
                        <IoArrowUndoOutline size={14} />
                        <span>Khôi phục gợi ý</span>
                      </Button>
                    )}

                    {/* Nút xem chi tiết loại phòng */}
                    <button
                      onClick={() => toggleExpand(item.targetDate)}
                      className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 mt-1"
                    >
                      <span>{isExpanded ? 'Ẩn chi tiết loại phòng' : 'Xem chi tiết loại phòng'}</span>
                      {isExpanded ? <IoChevronUpOutline size={13} /> : <IoChevronDownOutline size={13} />}
                    </button>
                  </div>
                </div>

                {/* Phân rã theo loại phòng (Collapsible) */}
                {isExpanded && (
                  <div className="border-t border-border-grey p-3 bg-surface-container-low text-xs">
                    <p className="font-bold text-on-surface mb-2">Chi tiết số phòng trống theo từng loại phòng ngày {item.targetDate}:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {item.roomTypeBreakdown?.map(rt => (
                        <div key={rt.roomTypeId} className="p-2 bg-surface-container-lowest border border-border-grey rounded">
                          <p className="font-bold text-on-surface truncate">{rt.roomTypeName}</p>
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
                            <span>Đã đặt: {rt.occupiedRooms}/{rt.totalRooms}</span>
                            <span className={`font-bold ${rt.vacantRooms === 0 ? 'text-alert-red' : 'text-emerald-700'}`}>
                              Trống: {rt.vacantRooms}
                            </span>
                          </div>
                          {rt.basePrice && (
                            <p className="text-[10px] text-secondary mt-1">
                              Giá cơ sở: {fmtCurrency(rt.basePrice)}/đêm
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cấu hình ngưỡng lấp đầy */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Cấu hình ngưỡng gợi ý điều chỉnh giá"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Thiết lập các ngưỡng để hệ thống tự động so sánh và đưa ra khuyến nghị kịp thời cho các ngày trong 30 ngày tới.
          </p>

          <div>
            <label className="block font-bold text-xs text-on-surface mb-1">
              Ngưỡng trên — Cân nhắc tăng giá (%)
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={configForm.highOccupancyThreshold}
              onChange={(e) => setConfigForm(prev => ({ ...prev, highOccupancyThreshold: parseFloat(e.target.value) || 0 }))}
              placeholder="VD: 80"
              required
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Khi mức lấp đầy của ngày đạt hoặc vượt ngưỡng này, hệ thống sẽ gợi ý tăng giá để tối ưu hóa doanh thu ngày cháy phòng.
            </p>
          </div>

          <div>
            <label className="block font-bold text-xs text-on-surface mb-1">
              Ngưỡng dưới — Cân nhắc giảm giá / Mở kênh (%)
            </label>
            <Input
              type="number"
              min="0"
              max="99"
              step="1"
              value={configForm.lowOccupancyThreshold}
              onChange={(e) => setConfigForm(prev => ({ ...prev, lowOccupancyThreshold: parseFloat(e.target.value) || 0 }))}
              placeholder="VD: 30"
              required
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Khi mức lấp đầy của ngày thấp hơn ngưỡng này và đã cận kề ngày đón khách, hệ thống sẽ gợi ý giảm giá hoặc mở bán thêm kênh.
            </p>
          </div>

          <div>
            <label className="block font-bold text-xs text-on-surface mb-1">
              Số ngày cận kề (ngày)
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              step="1"
              value={configForm.imminentDaysThreshold}
              onChange={(e) => setConfigForm(prev => ({ ...prev, imminentDaysThreshold: parseInt(e.target.value) || 1 }))}
              placeholder="VD: 7"
              required
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Chỉ cảnh báo giảm giá khi số ngày còn lại tới ngày đó nhỏ hơn hoặc bằng số ngày này (tránh giảm giá quá sớm khi khách chưa đặt).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-grey">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingConfig}
              className="bg-agoda-blue"
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác nhận bỏ qua gợi ý */}
      <Modal
        isOpen={!!dismissTargetDate}
        onClose={() => setDismissTargetDate(null)}
        title="Xác nhận bỏ qua gợi ý"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-on-surface">
            Bạn có chắc chắn muốn bỏ qua gợi ý điều chỉnh giá cho ngày <strong>{dismissTargetDate}</strong>?
          </p>
          <p className="text-xs text-on-surface-variant">
            Gợi ý này sẽ không hiển thị lại trong danh sách cần xử lý nữa. Bạn vẫn có thể xem lại hoặc khôi phục trong tab &quot;Đã bỏ qua&quot;.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-grey">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDismissTargetDate(null)}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDismiss}
              disabled={isDismissing}
              className="bg-alert-red text-white"
            >
              {isDismissing ? 'Đang xử lý...' : 'Xác nhận bỏ qua'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal AI Phân tích chi tiết một ngày */}
      <Modal
        isOpen={isDayAiModalOpen}
        onClose={() => setIsDayAiModalOpen(false)}
        title={`🤖 AI Phân Tích & Khuyến Nghị Ngày ${activeDayAi?.date || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 flex items-center gap-2">
            <IoSparkles className="text-indigo-600 shrink-0" size={18} />
            <p>Phân tích từ Google Gemini kết hợp công suất thực tế, ngày trong tuần và lịch sử đặt phòng của ngày <strong>{activeDayAi?.date}</strong>.</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-xl border border-border-grey max-h-[60vh] overflow-y-auto leading-relaxed text-on-surface">
            {activeDayAi?.analysis ? renderAiMarkdown(activeDayAi.analysis) : 'Đang tải phân tích...'}
          </div>
          <div className="flex justify-end pt-2 border-t border-border-grey">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDayAiModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PriceSuggestionPage;
