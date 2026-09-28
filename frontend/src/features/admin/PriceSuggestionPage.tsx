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
  IoBulbOutline,
  IoFlameOutline,
  IoPricetagOutline
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

// Helper nhận diện ngày cuối tuần chính xác (Thứ Sáu, Thứ Bảy, Chủ Nhật)
const isWeekendDay = (dow?: string): boolean => {
  if (!dow) return false;
  const d = dow.toLowerCase().trim();
  return d.includes('sáu') || d.includes('6') 
      || d.includes('bảy') || d.includes('7') 
      || d.includes('chủ nhật') || d.includes('cn')
      || d.includes('friday') || d.includes('saturday') || d.includes('sunday');
};

const renderAiMarkdown = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-2.5 text-xs sm:text-sm text-on-surface leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        // Table row
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
          const isHeader = i > 0 && lines[i - 1]?.includes('|---');
          const isSeparator = trimmed.includes('---');
          if (isSeparator) return null;

          return (
            <div key={i} className="overflow-x-auto my-1">
              <div className="grid grid-flow-col auto-cols-fr gap-2 p-2 bg-surface-container-lowest border border-border-grey/70 rounded-lg text-xs">
                {cells.map((cell, cIdx) => (
                  <span key={cIdx} className={isHeader ? 'font-bold text-primary' : 'text-on-surface'}>
                    {cell}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-xs sm:text-sm font-bold text-primary mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-sm sm:text-base font-bold text-on-surface border-b border-border-grey/80 pb-1 mt-4 flex items-center gap-2">
              <IoSparkles className="text-primary text-sm shrink-0" />
              <span>{trimmed.replace('## ', '')}</span>
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-base sm:text-lg font-extrabold text-on-surface mt-4 text-primary">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const text = trimmed.substring(2);
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-bold mt-1 text-xs">•</span>
              <div className="text-on-surface flex-1">
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

  // Tính toán dữ liệu kinh doanh 30 ngày chuẩn xác theo công thức
  const metrics = React.useMemo(() => {
    if (!data?.suggestions || data.suggestions.length === 0) {
      return {
        avgOccupancy: 0,
        totalBookedNights: 0,
        totalCapacityNights: 0,
        weekendDaysCount: 0,
        weekendBookedNights: 0,
        weekendCapacityNights: 0,
        weekendAvgOcc: 0,
        weekdayDaysCount: 0,
        weekdayBookedNights: 0,
        weekdayCapacityNights: 0,
        weekdayAvgOcc: 0,
        estimatedRevenue: 0,
        potentialBoostRevenue: 0,
        boostPercent: 0,
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
    let weekendDays = 0;
    let weekdayBooked = 0;
    let weekdayCap = 0;
    let weekdayDays = 0;
    let totalRev = 0;
    let weekendRev = 0;

    const roomTypeMap = new Map<string, { name: string; basePrice: number; totalRooms: number; booked: number; daysCount: number }>();

    for (const s of suggestions) {
      const occ = s.occupiedRooms || 0;
      const tot = s.totalRooms || 0;
      totalBooked += occ;
      totalCapacity += tot;

      const isWeekend = isWeekendDay(s.dayOfWeek);
      if (isWeekend) {
        weekendDays++;
        weekendBooked += occ;
        weekendCap += tot;
      } else {
        weekdayDays++;
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

          const rev = (rt.occupiedRooms || 0) * (rt.basePrice || 0);
          totalRev += rev;
          if (isWeekend) {
            weekendRev += rev;
          }
        }
      }
    }

    const avgOcc = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
    const weekendAvgOcc = weekendCap > 0 ? (weekendBooked / weekendCap) * 100 : 0;
    const weekdayAvgOcc = weekdayCap > 0 ? (weekdayBooked / weekdayCap) * 100 : 0;

    // Công thức tính tiềm năng tăng doanh thu dựa trên Dynamic Pricing thực tế:
    // 1. Tối ưu surge pricing cho ngày cuối tuần & cao điểm (+15% giá bán)
    // 2. Kích cầu ngày thường: kích hoạt lấp thêm 12% số đêm trống với mức giá ưu đãi (-15% so với giá cơ sở)
    const avgRoomPrice = totalBooked > 0 ? (totalRev / totalBooked) : 700000;
    const weekdayVacantNights = Math.max(0, weekdayCap - weekdayBooked);
    const potentialSurgeBoost = Math.round(weekendRev * 0.15);
    const potentialStimulationBoost = Math.round(weekdayVacantNights * 0.12 * (avgRoomPrice * 0.85));
    const potentialBoostRevenue = potentialSurgeBoost + potentialStimulationBoost;
    const boostPercent = totalRev > 0 ? Math.round((potentialBoostRevenue / totalRev) * 100) : 15;

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
      weekendDaysCount: weekendDays,
      weekendBookedNights: weekendBooked,
      weekendCapacityNights: weekendCap,
      weekendAvgOcc: Math.round(weekendAvgOcc * 10) / 10,
      weekdayDaysCount: weekdayDays,
      weekdayBookedNights: weekdayBooked,
      weekdayCapacityNights: weekdayCap,
      weekdayAvgOcc: Math.round(weekdayAvgOcc * 10) / 10,
      estimatedRevenue: totalRev,
      potentialBoostRevenue,
      boostPercent,
      roomTypeSummary
    };
  }, [data]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
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
      console.error('Failed to fetch price suggestions:', err);
      toastError(err?.response?.data?.message || 'Không thể tải danh sách gợi ý giá.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.lowOccupancyThreshold >= configForm.highOccupancyThreshold) {
      toastError('Ngưỡng lấp đầy thấp phải nhỏ hơn ngưỡng cao.');
      return;
    }

    try {
      setIsSavingConfig(true);
      await priceSuggestionApi.updateConfig(configForm);
      toastSuccess('Đã cập nhật ngưỡng gợi ý điều chỉnh giá.');
      setIsConfigModalOpen(false);
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to update config:', err);
      toastError(err?.response?.data?.message || 'Lưu cấu hình thất bại.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDismiss = async () => {
    if (!dismissTargetDate) return;
    try {
      setIsDismissing(true);
      await priceSuggestionApi.dismissSuggestion(dismissTargetDate);
      toastSuccess(`Đã bỏ qua gợi ý cho ngày ${dismissTargetDate}.`);
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

  const occDiff = Math.round((metrics.weekendAvgOcc - metrics.weekdayAvgOcc) * 10) / 10;

  return (
    <div className="space-y-4 pb-10">
      {/* Header trang đồng bộ chuẩn PMS */}
      <PageHeader
        icon={IoTrendingUpOutline}
        title="Gợi ý điều chỉnh giá theo công suất dự báo"
        subtitle="Hệ thống Revenue Management tự động đối chiếu công suất 30 ngày tới & quá khứ, kết hợp Trợ lý AI Gemini Flash đề xuất chiến lược giá tối ưu."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunOverallAiAnalysis}
              isLoading={isAiAnalyzing}
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-indigo-700 hover:from-primary-hover hover:to-indigo-800 text-white shadow-sm cursor-pointer rounded-xl font-semibold"
            >
              <IoSparkles size={16} className="text-lodgify-lime" />
              <span>AI Phân tích chiến lược 30 ngày</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border-border-grey hover:bg-surface-container"
            >
              <IoSettingsOutline size={16} />
              <span>Cấu hình ngưỡng</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border-border-grey hover:bg-surface-container"
            >
              <IoRefreshOutline size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/manage/room-types')}
              className="flex items-center gap-1.5 bg-agoda-blue rounded-xl"
            >
              <IoBedOutline size={16} />
              <span>Cấu hình giá phòng</span>
            </Button>
          </div>
        }
      />

      {/* Cam kết an toàn & Nguyên tắc kiểm soát */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-start gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <IoShieldCheckmarkOutline size={18} />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-sm text-blue-950">Hệ thống hỗ trợ gợi ý có kiểm soát — Tuyệt đối không tự động đổi giá</p>
          <p className="mt-0.5 text-blue-800">
            Mọi gợi ý chỉ mang tính chất tham khảo dựa trên công suất phòng và dữ liệu tham chiếu. 
            Mọi thao tác thay đổi giá phải do Chủ cơ sở hoặc Quản trị viên trực tiếp thực hiện qua tính năng cấu hình giá loại phòng.
          </p>
        </div>
      </div>

      {/* 4 Thẻ KPI Chỉ Số Vận Hành & Dự Báo 30 Ngày */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Công suất dự báo 30 ngày */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Công suất dự báo 30 ngày</span>
              <span className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${metrics.avgOccupancy >= (data?.highOccupancyThreshold || 80) ? 'text-alert-red' : metrics.avgOccupancy <= (data?.lowOccupancyThreshold || 30) ? 'text-primary' : 'text-on-surface'}`}>
                {metrics.avgOccupancy}%
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                ({metrics.totalBookedNights}/{metrics.totalCapacityNights} đêm)
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${metrics.avgOccupancy >= 70 ? 'bg-emerald-600' : metrics.avgOccupancy >= 40 ? 'bg-agoda-blue' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, metrics.avgOccupancy)}%` }}
              />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
              <span>Đã đặt trước on-the-books</span>
              <span className="font-semibold text-on-surface">{metrics.totalBookedNights} đêm</span>
            </p>
          </div>
        </div>

        {/* Card 2: Doanh thu phòng đã đặt */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Doanh thu phòng đã đặt</span>
              <IoPricetagOutline size={16} className="text-primary" />
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-on-surface">
                {fmtCurrency(metrics.estimatedRevenue)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-3 border-t border-border-grey/40 pt-2">
            Tính trên các lượt đặt hiện có trong 30 ngày tới
          </p>
        </div>

        {/* Card 3: Tiềm năng tối ưu thêm (AI) */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tiềm năng tăng thêm (AI)</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                +{metrics.boostPercent}%
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                +{fmtCurrency(metrics.potentialBoostRevenue)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-3 border-t border-border-grey/40 pt-2 flex items-center gap-1">
            <IoSparkles className="text-emerald-600 shrink-0" size={13} />
            <span>Tối ưu surge pricing ngày cao điểm &amp; kích cầu</span>
          </p>
        </div>

        {/* Card 4: Phân bổ Cuối tuần vs Ngày thường (ĐÃ SỬA CÔNG THỨC) */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Cuối tuần vs Ngày thường</span>
              <IoCalendarOutline size={16} className="text-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-amber-50/50 border border-amber-100 rounded-xl">
                <span className="text-[10px] text-amber-900 font-semibold block">Cuối tuần (T6-CN)</span>
                <span className="text-lg font-extrabold text-amber-700">{metrics.weekendAvgOcc}%</span>
                <span className="text-[10px] text-amber-800/80 block mt-0.5">({metrics.weekendBookedNights}/{metrics.weekendCapacityNights} đêm)</span>
              </div>
              <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] text-blue-900 font-semibold block">Ngày thường (T2-T5)</span>
                <span className="text-lg font-extrabold text-primary">{metrics.weekdayAvgOcc}%</span>
                <span className="text-[10px] text-blue-800/80 block mt-0.5">({metrics.weekdayBookedNights}/{metrics.weekdayCapacityNights} đêm)</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-on-surface-variant mt-2 border-t border-border-grey/40 pt-1.5 flex items-center justify-between">
            <span>Chênh lệch:</span>
            <span className={`font-bold ${occDiff > 0 ? 'text-amber-700' : occDiff < 0 ? 'text-primary' : 'text-on-surface'}`}>
              {occDiff > 0 ? `+${occDiff}% (Cuối tuần cao hơn)` : occDiff < 0 ? `${occDiff}% (Ngày thường cao hơn)` : 'Cân bằng'}
            </span>
          </div>
        </div>
      </div>

      {/* Bảng Tóm Tắt Nhu Cầu & Công Suất Theo Từng Hạng Phòng */}
      {metrics.roomTypeSummary.length > 0 && (
        <div className="bg-surface-container-lowest border border-border-grey/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <IoBedOutline size={14} />
              </div>
              <span>Phân rã nhu cầu &amp; Công suất theo từng hạng phòng (30 ngày tới)</span>
            </h4>
            <span className="text-xs text-on-surface-variant font-medium">
              Tổng quy mô cơ sở: <strong className="text-on-surface">{data?.totalRooms || 0} phòng</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.roomTypeSummary.map((rt) => {
              const isHigh = rt.occRate >= 60;
              const isLow = rt.occRate <= 25;
              return (
                <div key={rt.name} className="p-3.5 bg-surface-container-low/60 hover:bg-surface-container-low border border-border-grey/70 rounded-xl transition-all text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-on-surface font-bold text-sm truncate">{rt.name}</strong>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isHigh
                          ? 'bg-red-50 text-alert-red border border-red-200'
                          : isLow
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isHigh ? 'Nhu cầu cao' : isLow ? 'Nhu cầu thấp' : 'Ổn định'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-on-surface-variant">
                      <span>Giá niêm yết:</span>
                      <strong className="text-on-surface font-bold">{fmtCurrency(rt.basePrice)}/đêm</strong>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-on-surface-variant">
                      <span>Đã bán 30 ngày:</span>
                      <strong className="text-on-surface">{rt.bookedRooms30d} đêm ({rt.occRate}%)</strong>
                    </div>
                  </div>

                  <div className="w-full bg-surface-container rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-alert-red' : isLow ? 'bg-amber-500' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(100, rt.occRate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trợ Lý AI Phân Tích & Chiến Lược Giá (Copilot Stay Away) */}
      <div className="bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <IoSparkles size={20} className="text-lodgify-lime" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-on-surface">
                  Chiến Lược Định Giá &amp; Tối Ưu Doanh Thu Bằng AI
                </h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  Gemini Flash AI Copilot
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                AI tổng hợp dữ liệu 30 ngày qua (thực tế), lịch sử booking 30 ngày tới, chính sách giá cuối tuần và phân rã từng loại phòng để tư vấn.
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
              className="bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer rounded-xl"
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
                className="rounded-xl border-border-grey"
              >
                {isAiPanelOpen ? 'Thu gọn' : 'Xem kết quả'}
              </Button>
            )}
          </div>
        </div>

        {/* Nội dung kết quả phân tích AI */}
        {isAiPanelOpen && (
          <div className="pt-3 border-t border-border-grey/70 space-y-4 animate-page-enter">
            {isAiAnalyzing ? (
              <div className="py-10 text-center space-y-3 bg-surface-container-low/50 rounded-2xl border border-border-grey/70">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-on-surface">Đang phân tích dữ liệu chuyên sâu với Gemini AI...</p>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  Hệ thống đang đối chiếu tỷ lệ lấp đầy lịch sử, xu hướng cuối tuần và xây dựng bảng giá đề xuất cho từng hạng phòng.
                </p>
              </div>
            ) : aiOverallAnalysis ? (
              <div className="bg-surface-container-low/40 border border-border-grey/70 rounded-2xl p-4 sm:p-5 text-xs text-on-surface leading-relaxed max-h-[520px] overflow-y-auto shadow-inner">
                {renderAiMarkdown(aiOverallAnalysis)}
              </div>
            ) : null}

            {/* Khung đặt câu hỏi tùy ý cho AI */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <IoChatbubbleEllipsesOutline size={16} className="text-primary" />
                <span>Đặt câu hỏi chiến lược cho AI:</span>
              </label>
              <form onSubmit={handleAskAi} className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ví dụ: Cuối tuần sau tôi nên tăng giá phòng nào? Làm sao để lấp đầy phòng thứ 2-4?..."
                  className="flex-1 text-xs bg-surface-container-lowest border border-border-grey rounded-xl px-3.5 py-2.5 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAiAsking}
                  disabled={!aiQuestion.trim()}
                  className="bg-primary hover:bg-primary-hover text-white shrink-0 cursor-pointer rounded-xl px-4"
                >
                  <IoSend size={13} />
                  <span>Gửi</span>
                </Button>
              </form>

              {/* Chips câu hỏi gợi ý */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                <span className="text-on-surface-variant text-[11px] font-medium">Gợi ý nhanh:</span>
                {[
                  'Cuối tuần sau nên tăng giá bao nhiêu %?',
                  'Làm sao để lấp đầy phòng thứ 2 - thứ 5?',
                  'Hạng phòng nào đang có doanh thu thấp nhất?',
                  'Có nên áp dụng chính sách ở tối thiểu 2 đêm cuối tuần?'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAiQuestion(chip)}
                    className="bg-surface-container-low hover:bg-surface-container border border-border-grey/70 text-on-surface px-2.5 py-1 rounded-full transition-colors cursor-pointer text-[11px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Lịch sử trao đổi với AI */}
            {aiQnAList.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <IoBulbOutline size={16} className="text-amber-600" />
                  <span>Lịch sử trao đổi với AI ({aiQnAList.length}):</span>
                </p>
                {aiQnAList.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-surface-container-low/50 border border-border-grey/70 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-on-surface font-bold">
                      <span className="text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Hỏi: {item.question}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-normal">{item.timestamp}</span>
                    </div>
                    <div className="p-3 bg-surface-container-lowest border border-border-grey/60 rounded-xl text-on-surface leading-relaxed">
                      {renderAiMarkdown(item.answer)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Độ tin cậy dữ liệu & Cấu hình ngưỡng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Tiền điều kiện 1: Đủ 3 tháng dữ liệu công suất */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">Dữ liệu công suất tối thiểu</span>
            {data?.hasMinimumData ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <IoCheckmarkCircleOutline size={13} />
                Đủ điều kiện (≥ 3 tháng)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <IoAlertCircleOutline size={13} />
                Chưa đủ 3 tháng
              </span>
            )}
          </div>
          <p className="text-base font-bold text-on-surface mt-2">
            Đã tích lũy: {data?.dataMonthsCount || 0} tháng
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {data?.hasMinimumData 
              ? 'Hệ thống có đủ lịch sử để đánh giá chính xác xu hướng công suất.'
              : 'Dữ liệu quá khứ còn ít, gợi ý có thể chưa phản ánh hết chu kỳ mùa vụ.'}
          </p>
        </div>

        {/* Tiền điều kiện 2: Độ tin cậy dữ liệu quá khứ (1 năm) */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">Độ tin cậy dữ liệu lịch sử</span>
            {data?.hasFullYearData ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <IoCheckmarkCircleOutline size={13} />
                Mức tin cậy Cao
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <IoAlertCircleOutline size={13} />
                Mức tin cậy Thấp
              </span>
            )}
          </div>
          <p className="text-base font-bold text-on-surface mt-2">
            {data?.hasFullYearData ? 'Đầy đủ dữ liệu cùng kỳ năm trước' : 'Chưa đủ dữ liệu 1 năm'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {data?.hasFullYearData
              ? 'Gợi ý được đối chiếu trực tiếp với cùng kỳ năm ngoái.'
              : 'Hệ thống kết hợp ngưỡng cấu hình và baseline 30 ngày qua.'}
          </p>
        </div>

        {/* Ngưỡng cấu hình hiện tại */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">Ngưỡng cấu hình tham chiếu</span>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Chỉnh sửa
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div>
              <span className="text-on-surface-variant block text-[10px]">Ngưỡng trên:</span>
              <span className="font-bold text-alert-red">≥ {data?.highOccupancyThreshold || 80}%</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px]">Ngưỡng dưới:</span>
              <span className="font-bold text-primary">≤ {data?.lowOccupancyThreshold || 30}%</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px]">Cận kề:</span>
              <span className="font-bold text-on-surface">≤ {data?.imminentDaysThreshold || 7} ngày</span>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2 border-t border-border-grey/40 pt-1.5">
            Cơ sở có: <strong className="text-on-surface">{data?.totalRooms || 0} phòng vật lý</strong>
          </p>
        </div>
      </div>

      {/* Tabs Phân Loại Gợi Ý Điều Chỉnh Giá */}
      <div className="flex items-center gap-2 border-b border-border-grey/80 pt-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span>Tất cả cần xử lý</span>
          <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full">
            {(data?.increaseCount || 0) + (data?.decreaseCount || 0)}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('increase')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'increase'
              ? 'border-alert-red text-alert-red'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <IoTrendingUpOutline size={14} className="text-alert-red" />
          <span>Cân nhắc tăng giá</span>
          <span className="px-1.5 py-0.2 bg-red-100 text-alert-red text-[10px] rounded-full">
            {data?.increaseCount || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('decrease')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'decrease'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <IoTrendingDownOutline size={14} className="text-primary" />
          <span>Cân nhắc giảm giá / Mở kênh</span>
          <span className="px-1.5 py-0.2 bg-blue-100 text-primary text-[10px] rounded-full">
            {data?.decreaseCount || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('dismissed')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'dismissed'
              ? 'border-secondary text-on-surface'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <IoEyeOffOutline size={14} />
          <span>Đã bỏ qua</span>
          <span className="px-1.5 py-0.2 bg-surface-container text-secondary text-[10px] rounded-full">
            {data?.dismissedCount || 0}
          </span>
        </button>
      </div>

      {/* Danh sách các ngày gợi ý */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-on-surface-variant font-medium">Đang rà soát công suất và lập đề xuất giá 30 ngày tới...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-border-grey/80 rounded-2xl shadow-xs space-y-3">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <IoCheckmarkCircleOutline size={32} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-on-surface">
            {activeTab === 'dismissed' 
              ? 'Chưa có gợi ý nào bị bỏ qua' 
              : 'Không có ngày nào cần điều chỉnh giá'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
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
            const isWeekend = isWeekendDay(item.dayOfWeek);

            return (
              <div 
                key={item.targetDate}
                className={`bg-surface-container-lowest border rounded-2xl transition-all shadow-xs overflow-hidden ${
                  item.dismissed 
                    ? 'border-border-grey opacity-75'
                    : isIncrease 
                      ? 'border-red-200 hover:border-alert-red hover:shadow-sm' 
                      : 'border-blue-200 hover:border-primary hover:shadow-sm'
                }`}
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Cột 1: Ngày & Loại gợi ý */}
                  <div className="flex items-start gap-3.5 min-w-[240px]">
                    {/* Hộp ngày tháng */}
                    <div className={`p-2.5 rounded-xl shrink-0 text-center min-w-[68px] border shadow-xs ${
                      isIncrease 
                        ? 'bg-red-50/70 border-red-200 text-alert-red' 
                        : isDecrease 
                          ? 'bg-blue-50/70 border-blue-200 text-primary' 
                          : 'bg-surface-container border-border-grey text-secondary'
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider">{item.dayOfWeek}</p>
                      <p className="text-2xl font-extrabold leading-tight">{item.targetDate.split('-')[2]}</p>
                      <p className="text-[10px] font-semibold opacity-80">{item.targetDate.split('-')[1]}/{item.targetDate.split('-')[0]}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isIncrease && (
                          <span className="px-2.5 py-0.5 bg-red-50 text-alert-red rounded-full font-bold text-xs border border-red-200 inline-flex items-center gap-1">
                            <IoTrendingUpOutline size={13} />
                            Cân nhắc tăng giá
                          </span>
                        )}
                        {isDecrease && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-primary rounded-full font-bold text-xs border border-blue-200 inline-flex items-center gap-1">
                            <IoTrendingDownOutline size={13} />
                            Cân nhắc giảm giá / Mở kênh
                          </span>
                        )}
                        {isWeekend && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200">
                            Cuối tuần
                          </span>
                        )}
                        {item.dismissed && (
                          <span className="px-2 py-0.5 bg-surface-container text-secondary rounded-full text-[10px] font-semibold">
                            Đã bỏ qua
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-secondary bg-surface-container-low px-2 py-0.5 rounded-full">
                          Còn {item.daysRemaining} ngày
                        </span>
                      </div>

                      {/* Khuyến nghị chi tiết */}
                      <p className="text-xs text-on-surface mt-2 font-medium leading-relaxed">
                        {item.recommendation}
                      </p>

                      {/* Độ tin cậy & Ghi chú */}
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-on-surface-variant flex-wrap">
                        <span className={`font-semibold ${item.confidenceLevel === 'HIGH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          • Mức tin cậy: {item.confidenceLevel === 'HIGH' ? 'Cao' : 'Thấp'}
                        </span>
                        <span>—</span>
                        <span className="italic">{item.confidenceNote}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Căn cứ minh bạch (Metrics) */}
                  <div className="flex items-center gap-5 border-y md:border-y-0 md:border-x border-border-grey/70 py-3 md:py-0 md:px-5 shrink-0">
                    <div>
                      <span className="text-[11px] font-bold text-secondary uppercase block">Mức lấp đầy</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-2xl font-extrabold ${isIncrease ? 'text-alert-red' : isDecrease ? 'text-primary' : 'text-on-surface'}`}>
                          {item.currentOccupancyRate}%
                        </span>
                      </div>
                      <div className="w-28 bg-surface-container rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isIncrease ? 'bg-alert-red' : isDecrease ? 'bg-agoda-blue' : 'bg-secondary'}`}
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
                        <span className="text-on-surface-variant">Cùng kỳ năm ngoái:</span>{' '}
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
                          className="flex items-center gap-1.5 bg-agoda-blue whitespace-nowrap rounded-xl shadow-xs"
                        >
                          <span>Xem & Điều chỉnh giá</span>
                          <IoArrowForwardOutline size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAnalyzeDay(item.targetDate)}
                          isLoading={loadingDayAiDate === item.targetDate}
                          className="flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary whitespace-nowrap cursor-pointer rounded-xl"
                          title="Xem AI phân tích chuyên sâu cho ngày này"
                        >
                          <IoSparkles size={14} className="text-primary" />
                          <span>AI Phân tích</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDismissTargetDate(item.targetDate)}
                          className="flex items-center gap-1 text-secondary border-border-grey hover:bg-surface-container whitespace-nowrap rounded-xl"
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
                        className="flex items-center gap-1 text-primary border-primary hover:bg-surface-blue-light whitespace-nowrap rounded-xl"
                      >
                        <IoArrowUndoOutline size={14} />
                        <span>Khôi phục gợi ý</span>
                      </Button>
                    )}

                    {/* Nút xem chi tiết loại phòng */}
                    <button
                      onClick={() => toggleExpand(item.targetDate)}
                      className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 mt-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Ẩn phân rã loại phòng' : 'Xem chi tiết loại phòng'}</span>
                      {isExpanded ? <IoChevronUpOutline size={13} /> : <IoChevronDownOutline size={13} />}
                    </button>
                  </div>
                </div>

                {/* Phân rã theo loại phòng (Collapsible Drawer) */}
                {isExpanded && (
                  <div className="border-t border-border-grey/70 p-4 bg-surface-container-low/50 text-xs animate-page-enter">
                    <p className="font-bold text-on-surface mb-2.5 flex items-center gap-1.5">
                      <IoBedOutline className="text-primary" />
                      <span>Chi tiết đặt phòng &amp; Phòng trống ngày {item.targetDate}:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {item.roomTypeBreakdown?.map(rt => (
                        <div key={rt.roomTypeId} className="p-3 bg-surface-container-lowest border border-border-grey/70 rounded-xl shadow-xs">
                          <p className="font-bold text-on-surface truncate text-sm">{rt.roomTypeName}</p>
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1.5">
                            <span>Đã đặt:</span>
                            <span className="font-bold text-on-surface">{rt.occupiedRooms}/{rt.totalRooms}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
                            <span>Còn trống:</span>
                            <span className={`font-bold ${rt.vacantRooms === 0 ? 'text-alert-red' : 'text-emerald-700'}`}>
                              {rt.vacantRooms} phòng
                            </span>
                          </div>
                          {rt.basePrice && (
                            <p className="text-[10px] text-secondary mt-1.5 pt-1.5 border-t border-border-grey/40">
                              Giá cơ sở: <strong>{fmtCurrency(rt.basePrice)}/đêm</strong>
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
              variant="secondary"
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
              className="bg-agoda-blue rounded-xl"
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
              className="bg-alert-red text-white rounded-xl"
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
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 flex items-center gap-2">
            <IoSparkles className="text-indigo-600 shrink-0" size={18} />
            <p>Phân tích từ Google Gemini kết hợp công suất thực tế, ngày trong tuần và lịch sử đặt phòng của ngày <strong>{activeDayAi?.date}</strong>.</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-2xl border border-border-grey/70 max-h-[60vh] overflow-y-auto leading-relaxed text-on-surface shadow-inner">
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
