import React, { useState, useEffect } from 'react';
import { 
  IoCashOutline, 
  IoAddOutline, 
  IoTrashOutline, 
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoSaveOutline,
  IoCalendarOutline,
  IoTrendingUpOutline,
  IoPencilOutline,
  IoCloseOutline,
  IoSparklesOutline,
  IoFlashOutline,
  IoSunnyOutline,
  IoMoonOutline,
  IoRibbonOutline
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import pricingApi from '../../services/pricingApi';
import seasonalPriceApi from '../../services/seasonalPriceApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { HolidayPriceResponse, SeasonalPriceResponse } from '../../types';

interface RoomTypePricingConfigProps {
  roomTypeId: number | string;
  roomTypeName?: string;
  basePrice?: number;
  onClose?: () => void;
}

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const DAY_OPTIONS = [
  { value: 'FRIDAY', label: 'Thứ Sáu', short: 'T6' },
  { value: 'SATURDAY', label: 'Thứ Bảy', short: 'T7' },
  { value: 'SUNDAY', label: 'Chủ Nhật', short: 'CN' },
];

const VIETNAM_HOLIDAY_PRESETS = [
  { name: 'Lễ 30/4 - 1/5', date: '2026-04-30', multiplier: 1.5 },
  { name: 'Quốc Khánh 2/9', date: '2026-09-02', multiplier: 1.5 },
  { name: 'Giỗ Tổ Hùng Vương', date: '2026-04-26', multiplier: 1.4 },
  { name: 'Tết Dương Lịch 1/1', date: '2027-01-01', multiplier: 1.6 },
  { name: 'Đêm Giáng Sinh (Noel)', date: '2026-12-24', multiplier: 1.3 },
];

const RoomTypePricingConfig: React.FC<RoomTypePricingConfigProps> = ({
  roomTypeId,
  roomTypeName,
  basePrice = 0,
  onClose
}) => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'weekend' | 'holiday' | 'seasonal'>('weekend');

  // === State Giá cuối tuần ===
  const [weekendPrice, setWeekendPrice] = useState<number | string>(basePrice || 0);
  const [selectedDays, setSelectedDays] = useState<string[]>(['SATURDAY', 'SUNDAY']);
  const [, setWeekendConfigId] = useState<number | string | null>(null);
  const [savingWeekend, setSavingWeekend] = useState(false);
  const [hasWeekendConfig, setHasWeekendConfig] = useState(false);

  // === State Giá ngày lễ ===
  const [holidays, setHolidays] = useState<HolidayPriceResponse[]>([]);
  const [newHoliday, setNewHoliday] = useState({
    holidayName: '',
    holidayDate: '',
    pricePerNight: Math.round(basePrice * 1.5) || 0,
  });
  const [addingHoliday, setAddingHoliday] = useState(false);

  // === State Giá theo mùa ===
  const [seasonalPrices, setSeasonalPrices] = useState<SeasonalPriceResponse[]>([]);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<number | string | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    startDate: '',
    endDate: '',
    pricePerNight: (basePrice || 0).toString()
  });
  const [seasonFormError, setSeasonFormError] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Load tất cả dữ liệu giá khi mở
  useEffect(() => {
    if (roomTypeId) {
      loadAllPricing();
    }
  }, [roomTypeId]);

  const loadAllPricing = async () => {
    loadWeekendConfig();
    loadHolidays();
    loadSeasonalPrices();
  };

  const loadWeekendConfig = async () => {
    try {
      const data = await pricingApi.getWeekendConfigs(roomTypeId);
      if (data && data.length > 0) {
        const first = data[0];
        setWeekendConfigId(first.id);
        setWeekendPrice(first.pricePerNight);
        setHasWeekendConfig(true);
        if (first.weekendDays) {
          setSelectedDays(first.weekendDays.split(',').map((d: string) => d.trim()));
        }
      } else {
        setWeekendConfigId(null);
        setWeekendPrice(basePrice || 0);
        setHasWeekendConfig(false);
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình giá cuối tuần:', err);
    }
  };

  const loadHolidays = async () => {
    try {
      const data = await pricingApi.getHolidayPrices(roomTypeId);
      setHolidays(data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách ngày lễ:', err);
    }
  };

  const loadSeasonalPrices = async () => {
    setLoadingSeasonal(true);
    try {
      const data = await seasonalPriceApi.getAll(roomTypeId);
      setSeasonalPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải giá theo mùa:', err);
    } finally {
      setLoadingSeasonal(false);
    }
  };

  // --- Handlers Giá cuối tuần ---
  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        toastWarning('Cần chọn ít nhất 1 ngày cuối tuần');
        return;
      }
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleApplyPresetDays = (days: string[]) => {
    setSelectedDays(days);
  };

  const handleApplyPricePercent = (percent: number) => {
    const calc = Math.round(basePrice * (1 + percent / 100));
    setWeekendPrice(calc);
  };

  const handleApplyPriceFixedAdd = (addAmount: number) => {
    setWeekendPrice(basePrice + addAmount);
  };

  const handleSaveWeekend = async () => {
    if (!weekendPrice || Number(weekendPrice) <= 0) {
      toastWarning('Mức giá cuối tuần phải lớn hơn 0');
      return;
    }
    setSavingWeekend(true);
    try {
      await pricingApi.saveWeekendConfig({
        roomTypeId: Number(roomTypeId),
        weekendDays: selectedDays.join(','),
        pricePerNight: Number(weekendPrice),
        active: true
      });
      toastSuccess(`Đã lưu cấu hình giá cuối tuần cho ${roomTypeName}!`);
      loadWeekendConfig();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi lưu giá cuối tuần');
    } finally {
      setSavingWeekend(false);
    }
  };

  // --- Handlers Giá ngày lễ ---
  const handleApplyHolidayPreset = (preset: typeof VIETNAM_HOLIDAY_PRESETS[0]) => {
    setNewHoliday({
      holidayName: preset.name,
      holidayDate: preset.date,
      pricePerNight: Math.round(basePrice * preset.multiplier)
    });
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.holidayName.trim() || !newHoliday.holidayDate || !newHoliday.pricePerNight) {
      toastWarning('Vui lòng điền đầy đủ tên ngày lễ, ngày cụ thể và mức giá');
      return;
    }
    setAddingHoliday(true);
    try {
      await pricingApi.saveHolidayPrice({
        roomTypeId: Number(roomTypeId),
        holidayName: newHoliday.holidayName.trim(),
        holidayDate: newHoliday.holidayDate,
        pricePerNight: Number(newHoliday.pricePerNight),
        active: true
      });
      toastSuccess(`Đã thêm giá ngày lễ "${newHoliday.holidayName}"!`);
      setNewHoliday({
        holidayName: '',
        holidayDate: '',
        pricePerNight: Math.round(basePrice * 1.5) || 0
      });
      loadHolidays();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi thêm giá ngày lễ');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: number | string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận xóa giá ngày lễ',
      message: `Bạn có chắc chắn muốn xóa giá ngày lễ "${name}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await pricingApi.deleteHolidayPrice(id);
      toastSuccess(`Đã xóa giá ngày lễ "${name}"!`);
      loadHolidays();
    } catch {
      toastError('Lỗi khi xóa giá ngày lễ');
    }
  };

  // --- Handlers Giá theo mùa ---
  const handleOpenCreateSeason = () => {
    setEditingSeasonId(null);
    setSeasonForm({
      startDate: '',
      endDate: '',
      pricePerNight: Math.round(basePrice * 1.2).toString()
    });
    setSeasonFormError('');
    setIsSeasonModalOpen(true);
  };

  const handleOpenEditSeason = (season: SeasonalPriceResponse) => {
    setEditingSeasonId(season.id);
    setSeasonForm({
      startDate: season.startDate || '',
      endDate: season.endDate || '',
      pricePerNight: season.pricePerNight?.toString() || ''
    });
    setSeasonFormError('');
    setIsSeasonModalOpen(true);
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeasonFormError('');
    if (!seasonForm.startDate || !seasonForm.endDate || !seasonForm.pricePerNight) {
      setSeasonFormError('Vui lòng điền đầy đủ ngày bắt đầu, ngày kết thúc và mức giá');
      return;
    }
    const priceNum = parseFloat(seasonForm.pricePerNight);
    if (isNaN(priceNum) || priceNum <= 0) {
      setSeasonFormError('Mức giá mỗi đêm phải lớn hơn 0');
      return;
    }
    if (seasonForm.startDate >= seasonForm.endDate) {
      setSeasonFormError('Ngày bắt đầu phải trước ngày kết thúc');
      return;
    }

    setSavingSeason(true);
    try {
      const payload = {
        startDate: seasonForm.startDate,
        endDate: seasonForm.endDate,
        pricePerNight: priceNum
      };
      if (editingSeasonId) {
        await seasonalPriceApi.update(roomTypeId, editingSeasonId, payload);
        toastSuccess('Cập nhật cấu hình giá theo mùa thành công!');
      } else {
        await seasonalPriceApi.create(roomTypeId, payload);
        toastSuccess('Thêm cấu hình giá theo mùa thành công!');
      }
      setIsSeasonModalOpen(false);
      loadSeasonalPrices();
    } catch (err: any) {
      setSeasonFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu giá theo mùa');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleDeleteSeason = async (seasonId: number | string, label: string) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận xóa giá theo mùa',
      message: `Bạn có chắc chắn muốn xóa cấu hình giá mùa (${label})?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await seasonalPriceApi.delete(roomTypeId, seasonId);
      toastSuccess('Đã xóa cấu hình giá theo mùa!');
      loadSeasonalPrices();
    } catch {
      toastError('Lỗi khi xóa cấu hình giá theo mùa');
    }
  };

  // Helper tính chênh lệch so với giá cơ bản
  const calcDiff = (targetPrice: number) => {
    const diff = targetPrice - basePrice;
    const pct = basePrice > 0 ? ((diff / basePrice) * 100) : 0;
    return {
      diff,
      pct: pct.toFixed(1),
      isHigher: diff > 0,
      isEqual: diff === 0
    };
  };

  const weekendDiff = calcDiff(Number(weekendPrice) || 0);

  return (
    <div className="bg-white rounded-2xl border border-border-grey shadow-sm overflow-hidden text-sm transition-all duration-300">
      {/* 1. Header Card với Tên loại phòng & Giá cơ bản */}
      <div className="bg-gradient-to-r from-surface-container-low via-white to-surface-container-low px-5 py-4 border-b border-border-grey flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
            <IoCashOutline size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-on-surface text-base tracking-tight">
                Cấu hình giá linh hoạt: {roomTypeName}
              </h3>
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full border border-primary/20">
                Giá cơ bản: {formatPrice(basePrice)}/đêm
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Thiết lập giá linh hoạt để tối ưu doanh thu vào cuối tuần, dịp lễ và các mùa cao điểm.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/manage/price-suggestions')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all bg-surface-container-low hover:bg-primary/10 text-primary border border-primary/20 hover:border-primary flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Xem gợi ý điều chỉnh giá thông minh theo công suất phòng"
          >
            <IoTrendingUpOutline size={15} />
            <span>Gợi ý giá theo công suất</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center border border-border-grey cursor-pointer transition-colors"
              title="Đóng bảng cấu hình"
            >
              <IoCloseOutline size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sơ đồ quy tắc ưu tiên tính giá (Visual Priority Stepper) */}
      <div className="bg-surface-container-low/60 px-5 py-2.5 border-b border-border-grey/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <IoInformationCircleOutline size={16} className="text-primary shrink-0" />
          <span className="font-semibold text-on-surface">Thứ tự ưu tiên tính giá:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold shadow-2xs">
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
            🎆 Ngày Lễ
          </span>
          <span className="text-on-surface-variant/40 font-bold">➔</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold shadow-2xs">
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
            🌙 Cuối Tuần
          </span>
          <span className="text-on-surface-variant/40 font-bold">➔</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold shadow-2xs">
            <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">3</span>
            🍂 Theo Mùa
          </span>
          <span className="text-on-surface-variant/40 font-bold">➔</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            <span className="w-4 h-4 rounded-full bg-slate-500 text-white flex items-center justify-center text-[10px]">4</span>
            🏷️ Giá Cơ Bản
          </span>
        </div>
      </div>

      {/* 3. Thanh điều hướng Tab chính */}
      <div className="px-5 pt-3 border-b border-border-grey flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('weekend')}
          className={`pb-3 pt-1 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'weekend'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoMoonOutline size={16} />
          <span>Giá Cuối Tuần</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            hasWeekendConfig
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-surface-container text-on-surface-variant'
          }`}>
            {hasWeekendConfig ? 'Đang bật' : 'Mặc định'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('holiday')}
          className={`pb-3 pt-1 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'holiday'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoRibbonOutline size={16} />
          <span>Giá Ngày Lễ</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {holidays.length} ngày
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seasonal')}
          className={`pb-3 pt-1 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'seasonal'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoSunnyOutline size={16} />
          <span>Giá Theo Mùa</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {seasonalPrices.length} mùa
          </span>
        </button>
      </div>

      {/* 4. Nội dung từng Tab */}
      <div className="p-5">
        {/* ================= TAB 1: GIÁ CUỐI TUẦN ================= */}
        {activeTab === 'weekend' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột trái: Cấu hình ngày & mức giá */}
            <div className="lg:col-span-7 space-y-4">
              {/* Chọn ngày cuối tuần */}
              <div className="bg-surface-container-low/50 p-4 rounded-xl border border-border-grey space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <IoCalendarOutline size={15} className="text-primary" />
                    Các ngày tính giá cuối tuần:
                  </label>
                  <div className="flex gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDays(['SATURDAY', 'SUNDAY'])}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-container border border-border-grey text-on-surface-variant text-[11px] font-medium transition-colors"
                    >
                      Chỉ T7 & CN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDays(['FRIDAY', 'SATURDAY', 'SUNDAY'])}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-container border border-border-grey text-on-surface-variant text-[11px] font-medium transition-colors"
                    >
                      Cả T6, T7, CN
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {DAY_OPTIONS.map((d) => {
                    const checked = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => handleToggleDay(d.value)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                          checked
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white text-on-surface-variant border-border-grey hover:bg-surface-container hover:text-on-surface'
                        }`}
                      >
                        {checked ? (
                          <IoCheckmarkCircleOutline size={16} />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-border-grey inline-block" />
                        )}
                        <span>{d.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${checked ? 'bg-white/20' : 'bg-surface-container'}`}>
                          {d.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhập mức giá & Phím tắt chọn nhanh */}
              <div className="bg-surface-container-low/50 p-4 rounded-xl border border-border-grey space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <IoCashOutline size={15} className="text-primary" />
                    Mức giá mỗi đêm cuối tuần (VNĐ):
                  </label>
                  <span className="text-xs text-on-surface-variant">
                    Giá gốc: <strong className="text-on-surface">{formatPrice(basePrice)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={weekendPrice}
                      onChange={(e) => setWeekendPrice(e.target.value)}
                      className="w-full text-base font-bold text-on-surface bg-white border border-border-grey rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                      placeholder="VD: 650000"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant pointer-events-none">
                      VNĐ/đêm
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    icon={IoSaveOutline}
                    onClick={handleSaveWeekend}
                    isLoading={savingWeekend}
                    className="py-2.5 px-4 rounded-xl shrink-0 font-bold"
                  >
                    Lưu cấu hình
                  </Button>
                </div>

                {/* Các phím chọn nhanh giá */}
                <div className="pt-1 space-y-1.5">
                  <div className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                    <IoSparklesOutline size={12} className="text-amber-600" />
                    Điều chỉnh nhanh theo giá gốc:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPricePercent(10)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-primary/5 text-primary border border-primary/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPricePercent(20)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-primary/5 text-primary border border-primary/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +20%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPricePercent(30)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-primary/5 text-primary border border-primary/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +30%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPricePercent(50)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-primary/5 text-primary border border-primary/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPriceFixedAdd(50000)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +50.000 ₫
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPriceFixedAdd(100000)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      +100.000 ₫
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekendPrice(basePrice)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-surface-container text-on-surface-variant border border-border-grey text-xs font-medium transition-colors cursor-pointer"
                    >
                      Bằng giá gốc
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Thẻ so sánh & Mô phỏng doanh thu */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50/50 via-white to-primary/5 p-4 rounded-xl border border-primary/20 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-primary/10 pb-2.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <IoFlashOutline size={15} />
                  Hiệu quả giá cuối tuần
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  weekendDiff.isHigher
                    ? 'bg-emerald-100 text-emerald-800'
                    : weekendDiff.isEqual
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {weekendDiff.isHigher ? `+${weekendDiff.pct}%` : weekendDiff.isEqual ? 'Bằng giá ngày thường' : `${weekendDiff.pct}%`}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border-grey/50">
                  <span className="text-on-surface-variant">Giá ngày thường (T2 - T5):</span>
                  <span className="font-semibold text-on-surface">{formatPrice(basePrice)}/đêm</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-grey/50">
                  <span className="text-on-surface-variant">Giá cuối tuần áp dụng:</span>
                  <span className="font-bold text-primary text-sm">{formatPrice(Number(weekendPrice) || 0)}/đêm</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-grey/50">
                  <span className="text-on-surface-variant">Chênh lệch mỗi đêm:</span>
                  <span className={`font-bold ${weekendDiff.isHigher ? 'text-emerald-600' : 'text-on-surface'}`}>
                    {weekendDiff.diff > 0 ? `+${formatPrice(weekendDiff.diff)}` : formatPrice(weekendDiff.diff)}
                  </span>
                </div>
              </div>

              {/* Mô phỏng đặt phòng 2 đêm T7-CN */}
              <div className="bg-white p-3 rounded-lg border border-primary/15 text-xs space-y-1">
                <div className="font-semibold text-on-surface flex items-center justify-between">
                  <span>Mô phỏng 1 booking cuối tuần (2 đêm):</span>
                  <span className="text-primary font-bold">
                    {formatPrice((Number(weekendPrice) || 0) * 2)}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Doanh thu tăng thêm:{' '}
                  <strong className="text-emerald-600">
                    +{formatPrice(Math.max(0, (Number(weekendPrice) - basePrice) * 2))}
                  </strong>{' '}
                  so với giá ngày thường.
                </p>
              </div>

              <p className="text-[11px] text-on-surface-variant/80 italic">
                * Chính sách cuối tuần sẽ tự động áp dụng khi khách đặt phòng vào các ngày đã chọn, trừ khi ngày đó trùng ngày lễ được định giá riêng.
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 2: GIÁ NGÀY LỄ ================= */}
        {activeTab === 'holiday' && (
          <div className="space-y-4">
            {/* Form thêm ngày lễ mới */}
            <form onSubmit={handleAddHoliday} className="bg-surface-container-low/50 p-4 rounded-xl border border-border-grey space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <IoAddOutline size={16} className="text-primary" />
                  Thêm cấu hình giá ngày lễ mới
                </span>
                <span className="text-xs text-on-surface-variant">
                  Gợi ý nhanh ngày lễ phổ biến:
                </span>
              </div>

              {/* Preset ngày lễ Việt Nam */}
              <div className="flex flex-wrap gap-1.5">
                {VIETNAM_HOLIDAY_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyHolidayPreset(p)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-on-surface-variant border border-border-grey text-xs font-medium transition-colors cursor-pointer"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                <div className="sm:col-span-4">
                  <Input
                    label="Tên ngày lễ"
                    placeholder="VD: Lễ Quốc Khánh 2/9"
                    value={newHoliday.holidayName}
                    onChange={(e) => setNewHoliday({ ...newHoliday, holidayName: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Ngày áp dụng"
                    type="date"
                    value={newHoliday.holidayDate}
                    onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Mức giá lễ (VNĐ/đêm)"
                    type="number"
                    min="0"
                    step="10000"
                    value={newHoliday.pricePerNight}
                    onChange={(e) => setNewHoliday({ ...newHoliday, pricePerNight: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    variant="primary"
                    icon={IoAddOutline}
                    isLoading={addingHoliday}
                    className="w-full py-2.5 rounded-xl font-bold"
                  >
                    Thêm lễ
                  </Button>
                </div>
              </div>
            </form>

            {/* Danh sách ngày lễ đã thiết lập */}
            <div className="border border-border-grey rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tên ngày lễ</th>
                    <th className="py-3 px-4">Ngày áp dụng</th>
                    <th className="py-3 px-4 text-right">Mức giá / đêm</th>
                    <th className="py-3 px-4 text-center">So với giá gốc</th>
                    <th className="py-3 px-4 text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        <IoRibbonOutline size={36} className="mx-auto mb-2 opacity-30 text-rose-500" />
                        <p className="font-medium text-sm">Chưa có ngày lễ nào được thiết lập giá riêng</p>
                        <p className="text-xs text-on-surface-variant/80 mt-1">
                          Vào các ngày lễ, giá phòng sẽ tính theo mức giá cuối tuần hoặc mùa nếu không thiết lập giá lễ.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    holidays.map((h) => {
                      const diff = calcDiff(h.pricePerNight);
                      return (
                        <tr key={h.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface text-sm">
                            {h.holidayName}
                          </td>
                          <td className="py-3 px-4 font-medium text-on-surface">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-mono">
                              <IoCalendarOutline size={13} className="text-primary" />
                              {formatDate(h.holidayDate)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-primary text-sm">
                            {formatPrice(h.pricePerNight)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              diff.isHigher
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              +{diff.pct}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id, h.holidayName)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                              title="Xóa giá ngày lễ"
                            >
                              <IoTrashOutline size={16} />
                            </button>
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

        {/* ================= TAB 3: GIÁ THEO MÙA ================= */}
        {activeTab === 'seasonal' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/50 p-4 rounded-xl border border-border-grey">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Chính sách giá theo khoảng thời gian mùa
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Áp dụng mức giá đặc biệt cho mùa cao điểm du lịch (hè, tết) hoặc mùa thấp điểm kích cầu.
                </p>
              </div>
              <Button
                variant="primary"
                icon={IoAddOutline}
                onClick={handleOpenCreateSeason}
                className="py-2 px-3.5 rounded-xl font-bold text-xs"
              >
                Thêm khoảng thời gian mùa
              </Button>
            </div>

            {/* Bảng danh sách các mùa */}
            <div className="border border-border-grey rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Khoảng thời gian</th>
                    <th className="py-3 px-4 text-center">Thời lượng</th>
                    <th className="py-3 px-4 text-right">Mức giá / đêm</th>
                    <th className="py-3 px-4 text-center">So với giá gốc</th>
                    <th className="py-3 px-4 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {loadingSeasonal ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        Đang tải danh sách giá theo mùa...
                      </td>
                    </tr>
                  ) : seasonalPrices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        <IoSunnyOutline size={36} className="mx-auto mb-2 opacity-30 text-amber-500" />
                        <p className="font-medium text-sm">Chưa có khoảng thời gian mùa nào được thiết lập</p>
                        <p className="text-xs text-on-surface-variant/80 mt-1">
                          Nếu không thiết lập mùa, hệ thống sẽ tính theo giá cơ bản và giá cuối tuần.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    seasonalPrices.map((season) => {
                      const diff = calcDiff(season.pricePerNight);
                      const nights = Math.max(
                        1,
                        Math.ceil((new Date(season.endDate).getTime() - new Date(season.startDate).getTime()) / (1000 * 60 * 60 * 24))
                      );
                      return (
                        <tr key={season.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4 font-semibold text-on-surface">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs">
                                {formatDate(season.startDate)}
                              </span>
                              <span className="text-on-surface-variant">➔</span>
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs">
                                {formatDate(season.endDate)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-on-surface-variant font-medium">
                            {nights} đêm
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-700 text-sm">
                            {formatPrice(season.pricePerNight)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              diff.isHigher
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : diff.isEqual
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {diff.isHigher ? `+${diff.pct}%` : `${diff.pct}%`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSeason(season)}
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                title="Sửa giá mùa"
                              >
                                <IoPencilOutline size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSeason(season.id, `${formatDate(season.startDate)} - ${formatDate(season.endDate)}`)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                title="Xóa giá mùa"
                              >
                                <IoTrashOutline size={15} />
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
      </div>

      {/* ================= MODAL: THÊM / SỬA GIÁ THEO MÙA ================= */}
      <Modal
        isOpen={isSeasonModalOpen}
        onClose={() => setIsSeasonModalOpen(false)}
        title={editingSeasonId ? 'Sửa cấu hình giá theo mùa' : 'Thêm khoảng thời gian mùa mới'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSeason} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={seasonForm.startDate}
              onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
              required
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              value={seasonForm.endDate}
              onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Mức giá mỗi đêm (VNĐ)"
            type="number"
            min="0"
            step="10000"
            value={seasonForm.pricePerNight}
            onChange={(e) => setSeasonForm({ ...seasonForm, pricePerNight: e.target.value })}
            placeholder="VD: 600000"
            required
          />

          {/* Preset nhanh cho giá mùa */}
          <div className="space-y-1.5">
            <div className="text-xs text-on-surface-variant font-medium">Chọn nhanh tỷ lệ giá mùa:</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSeasonForm({ ...seasonForm, pricePerNight: Math.round(basePrice * 1.15).toString() })}
                className="px-2 py-1 rounded bg-surface hover:bg-surface-container border border-border-grey text-xs font-semibold"
              >
                Mùa cao điểm (+15%)
              </button>
              <button
                type="button"
                onClick={() => setSeasonForm({ ...seasonForm, pricePerNight: Math.round(basePrice * 1.3).toString() })}
                className="px-2 py-1 rounded bg-surface hover:bg-surface-container border border-border-grey text-xs font-semibold"
              >
                Mùa cao điểm (+30%)
              </button>
              <button
                type="button"
                onClick={() => setSeasonForm({ ...seasonForm, pricePerNight: Math.round(basePrice * 0.85).toString() })}
                className="px-2 py-1 rounded bg-surface hover:bg-surface-container border border-border-grey text-xs font-semibold text-rose-700"
              >
                Mùa thấp điểm (-15%)
              </button>
            </div>
          </div>

          {seasonFormError && (
            <div className="p-3 bg-red-50 border border-red-200 text-error rounded-xl text-xs font-medium">
              {seasonFormError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button variant="secondary" icon={IoCloseOutline} onClick={() => setIsSeasonModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" icon={IoCheckmarkCircleOutline} type="submit" isLoading={savingSeason}>
              {editingSeasonId ? 'Cập nhật' : 'Thêm mùa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomTypePricingConfig;
