import React, { useState, useEffect } from 'react';
import { 
  IoCashOutline, 
  IoAddOutline, 
  IoTrashOutline, 
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoSaveOutline
} from 'react-icons/io5';
import pricingApi from '../../services/pricingApi';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast, useConfirm } from '../../context/ToastContext';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const DAY_OPTIONS = [
  { value: 'FRIDAY', label: 'Thứ Sáu' },
  { value: 'SATURDAY', label: 'Thứ Bảy' },
  { value: 'SUNDAY', label: 'Chủ Nhật' },
];

interface WeekendAndHolidayPricingProps {
  roomTypeId: number | string;
  roomTypeName?: string;
  basePrice?: number;
}

const WeekendAndHolidayPricing: React.FC<WeekendAndHolidayPricingProps> = ({ roomTypeId, roomTypeName, basePrice = 0 }) => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'weekend' | 'holiday'>('weekend');

  // Weekend state
  const [weekendPrice, setWeekendPrice] = useState<number | string>(basePrice || 0);
  const [selectedDays, setSelectedDays] = useState<string[]>(['FRIDAY', 'SATURDAY', 'SUNDAY']);
  const [, setWeekendConfigId] = useState<number | string | null>(null);
  const [savingWeekend, setSavingWeekend] = useState(false);

  // Holiday state
  const [holidays, setHolidays] = useState<any[]>([]);
  const [newHoliday, setNewHoliday] = useState({
    holidayName: '',
    holidayDate: '',
    pricePerNight: basePrice || 0,
  });
  const [addingHoliday, setAddingHoliday] = useState(false);

  const loadWeekendConfig = async () => {
    try {
      const data = await pricingApi.getWeekendConfigs(roomTypeId);
      if (data && data.length > 0) {
        const first = data[0];
        setWeekendConfigId(first.id);
        setWeekendPrice(first.pricePerNight);
        if (first.weekendDays) {
          setSelectedDays(first.weekendDays.split(',').map((d: string) => d.trim()));
        }
      } else {
        setWeekendConfigId(null);
        setWeekendPrice(basePrice || 0);
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

  useEffect(() => {
    if (roomTypeId) {
      loadWeekendConfig();
      loadHolidays();
    }
  }, [roomTypeId]);

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

  const handleSaveWeekend = async () => {
    if (!weekendPrice || Number(weekendPrice) < 0) {
      toastWarning('Mức giá cuối tuần không hợp lệ');
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
      toastSuccess(`Đã lưu giá cuối tuần cho ${roomTypeName || ''}!`);
      loadWeekendConfig();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi lưu giá cuối tuần');
    } finally {
      setSavingWeekend(false);
    }
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
      toastSuccess(`Đã thêm giá ngày lễ "${newHoliday.holidayName}" thành công!`);
      setNewHoliday({ holidayName: '', holidayDate: '', pricePerNight: basePrice || 0 });
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
    } catch (err) {
      toastError('Lỗi khi xóa giá ngày lễ');
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border-grey p-4 space-y-4 text-sm mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-grey/60 pb-3">
        <div className="flex items-center gap-2">
          <IoCashOutline className="text-primary" size={18} />
          <span className="font-bold text-on-surface">Cấu hình giá linh hoạt: {roomTypeName}</span>
          <span className="text-xs text-on-surface-variant">(Giá cơ bản: {formatPrice(basePrice)})</span>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-surface-container p-0.5 border border-border-grey">
          <button
            type="button"
            onClick={() => setActiveTab('weekend')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'weekend' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Giá cuối tuần
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('holiday')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'holiday' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Giá ngày lễ ({holidays.length})
          </button>
        </div>
      </div>

      {/* Thông báo quy tắc ưu tiên giá */}
      <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg border border-border-grey/60 text-xs text-on-surface-variant">
        <IoInformationCircleOutline size={16} className="text-primary shrink-0" />
        <span>
          <strong>Thứ tự ưu tiên tính giá từng đêm: </strong>
          <span className="text-primary font-bold">Ngày lễ</span> &gt; <span className="text-indigo-600 font-bold">Cuối tuần</span> &gt; <span className="text-amber-700 font-bold">Theo mùa</span> &gt; Giá cơ bản.
        </span>
      </div>

      {/* Tab 1: Giá cuối tuần */}
      {activeTab === 'weekend' && (
        <div className="space-y-3 bg-surface-container-low/40 p-3.5 rounded-xl border border-border-grey/60">
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider">
            Các ngày được coi là cuối tuần:
          </div>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((d) => {
              const checked = selectedDays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => handleToggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    checked
                      ? 'bg-primary text-white border-primary shadow-2xs'
                      : 'bg-surface text-on-surface-variant border-border-grey hover:bg-surface-container'
                  }`}
                >
                  {checked && <IoCheckmarkCircleOutline size={14} />}
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-2">
            <div>
              <Input
                label="Mức giá mỗi đêm cuối tuần (VNĐ)"
                type="number"
                min="0"
                step="1000"
                value={weekendPrice}
                onChange={(e) => setWeekendPrice(e.target.value)}
              />
            </div>
            <div>
              <Button
                variant="primary"
                icon={IoSaveOutline}
                onClick={handleSaveWeekend}
                isLoading={savingWeekend}
              >
                Lưu cấu hình cuối tuần
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Giá ngày lễ */}
      {activeTab === 'holiday' && (
        <div className="space-y-4">
          {/* Form thêm ngày lễ */}
          <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-surface-container-low rounded-xl border border-border-grey/60 items-end">
            <div className="sm:col-span-4">
              <Input
                label="Tên ngày lễ"
                placeholder="Ví dụ: Lễ Quốc Khánh 2/9"
                value={newHoliday.holidayName}
                onChange={(e) => setNewHoliday({ ...newHoliday, holidayName: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="Ngày cụ thể"
                type="date"
                value={newHoliday.holidayDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="Mức giá (VNĐ/đêm)"
                type="number"
                min="0"
                step="1000"
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
                className="w-full"
              >
                Thêm lễ
              </Button>
            </div>
          </form>

          {/* Danh sách ngày lễ đã tạo */}
          <div className="border border-border-grey rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant font-semibold uppercase">
                <tr>
                  <th className="p-2.5">Tên ngày lễ</th>
                  <th className="p-2.5">Ngày áp dụng</th>
                  <th className="p-2.5 text-right">Mức giá / đêm</th>
                  <th className="p-2.5 text-center w-16">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey/60">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-on-surface-variant">
                      Chưa có ngày lễ nào được thiết lập giá riêng cho loại phòng này.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-2.5 font-semibold text-on-surface">{h.holidayName}</td>
                      <td className="p-2.5 text-on-surface">{h.holidayDate}</td>
                      <td className="p-2.5 text-right font-bold text-primary">{formatPrice(h.pricePerNight)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteHoliday(h.id, h.holidayName)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                          title="Xóa giá ngày lễ"
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekendAndHolidayPricing;
