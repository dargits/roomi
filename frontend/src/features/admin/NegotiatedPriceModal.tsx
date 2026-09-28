import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { NegotiatedPriceAgreement, NegotiatedPriceAgreementRequest, NegotiatedPriceItem } from '../../services/negotiatedPriceApi';
import { corporateClientApi, CorporateClient } from '../../services/corporateClientApi';
import { groupBookingApi } from '../../services/groupBookingApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import { RoomTypeResponse } from '../../types';

interface NegotiatedPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NegotiatedPriceAgreementRequest) => Promise<void>;
  initialData?: NegotiatedPriceAgreement | null;
  defaultCorporateClientId?: number | null;
  defaultGroupBookingId?: number | null;
  loading?: boolean;
}

export const NegotiatedPriceModal: React.FC<NegotiatedPriceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultCorporateClientId,
  defaultGroupBookingId,
  loading = false,
}) => {
  const [targetType, setTargetType] = useState<'CORPORATE' | 'GROUP'>('CORPORATE');
  const [corporateClients, setCorporateClients] = useState<CorporateClient[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [roomPrices, setRoomPrices] = useState<Record<number, string | number>>({});
  const [batchPrice, setBatchPrice] = useState<string>('');

  const [formData, setFormData] = useState<NegotiatedPriceAgreementRequest>({
    name: '',
    corporateClientId: null,
    groupBookingId: null,
    pricePerNight: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    active: true,
    note: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load corporate clients
      corporateClientApi.getAll(undefined, true).then(setCorporateClients).catch(console.error);
      // Load groups
      groupBookingApi.getAll().then(setGroups).catch(console.error);
      // Load room types
      roomTypeApi.getAllRoomTypes().then(types => {
        const activeTypes = types.filter(t => t.active !== false);
        setRoomTypes(activeTypes);
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const isGroup = !!initialData.groupBookingId;
      setTargetType(isGroup ? 'GROUP' : 'CORPORATE');
      setFormData({
        name: initialData.name || '',
        corporateClientId: initialData.corporateClientId || null,
        groupBookingId: initialData.groupBookingId || null,
        pricePerNight: initialData.pricePerNight || 0,
        startDate: initialData.startDate || new Date().toISOString().split('T')[0],
        endDate: initialData.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        active: initialData.active ?? true,
        note: initialData.note || '',
      });
    } else {
      const isGroup = !!defaultGroupBookingId;
      setTargetType(isGroup ? 'GROUP' : 'CORPORATE');
      setFormData({
        name: '',
        corporateClientId: defaultCorporateClientId || null,
        groupBookingId: defaultGroupBookingId || null,
        pricePerNight: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        active: true,
        note: '',
      });
    }
    setError('');
    setBatchPrice('');
  }, [initialData, defaultCorporateClientId, defaultGroupBookingId, isOpen]);

  // Populate roomPrices once initialData and roomTypes are ready
  useEffect(() => {
    if (!isOpen) return;

    const prices: Record<number, string | number> = {};
    if (initialData?.items && initialData.items.length > 0) {
      initialData.items.forEach(it => {
        prices[it.roomTypeId] = it.pricePerNight;
      });
    } else if (initialData?.pricePerNight && roomTypes.length > 0) {
      roomTypes.forEach(rt => {
        prices[rt.id] = initialData.pricePerNight || '';
      });
    }
    setRoomPrices(prices);
  }, [initialData, roomTypes, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRoomPriceChange = (roomTypeId: number, value: string) => {
    setRoomPrices(prev => ({
      ...prev,
      [roomTypeId]: value === '' ? '' : Number(value),
    }));
  };

  const handleApplyBatchPrice = () => {
    const val = Number(batchPrice);
    if (!val || val <= 0) return;
    const nextPrices: Record<number, number> = {};
    roomTypes.forEach(rt => {
      nextPrices[rt.id] = val;
    });
    setRoomPrices(nextPrices);
  };

  const handleTargetTypeChange = (type: 'CORPORATE' | 'GROUP') => {
    setTargetType(type);
    if (type === 'CORPORATE') {
      setFormData(prev => ({ ...prev, groupBookingId: null }));
    } else {
      setFormData(prev => ({ ...prev, corporateClientId: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên thỏa thuận');
      return;
    }
    if (targetType === 'CORPORATE' && !formData.corporateClientId) {
      setError('Vui lòng chọn khách hàng công ty');
      return;
    }
    if (targetType === 'GROUP' && !formData.groupBookingId) {
      setError('Vui lòng chọn hoặc nhập mã đoàn đặt phòng');
      return;
    }

    // Build items from roomPrices
    const items: NegotiatedPriceItem[] = roomTypes
      .filter(rt => {
        const p = roomPrices[rt.id];
        return p !== undefined && p !== '' && Number(p) > 0;
      })
      .map(rt => ({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        pricePerNight: Number(roomPrices[rt.id]),
      }));

    if (items.length === 0) {
      setError('Vui lòng nhập mức giá thỏa thuận cho ít nhất một loại phòng');
      return;
    }

    if (formData.startDate > formData.endDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        items,
        pricePerNight: items[0]?.pricePerNight || 0,
        corporateClientId: targetType === 'CORPORATE' ? Number(formData.corporateClientId) : null,
        groupBookingId: targetType === 'GROUP' ? Number(formData.groupBookingId) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra');
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh sửa thỏa thuận giá' : 'Tạo mới thỏa thuận giá (Giá thỏa thuận)'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Tên thỏa thuận */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên thỏa thuận / Hợp đồng <span className="text-red-500">*</span>
          </label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ví dụ: Hợp đồng Saigontourist 2026 hoặc Giá thỏa thuận Đoàn FPT"
            required
          />
        </div>

        {/* Đối tượng áp dụng: Công ty hay Đoàn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đối tượng áp dụng <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleTargetTypeChange('CORPORATE')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                targetType === 'CORPORATE'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Khách hàng công ty
            </button>
            <button
              type="button"
              onClick={() => handleTargetTypeChange('GROUP')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                targetType === 'GROUP'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đoàn đặt phòng
            </button>
          </div>
        </div>

        {/* Chọn Khách công ty hoặc Đoàn */}
        {targetType === 'CORPORATE' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn công ty <span className="text-red-500">*</span>
            </label>
            <select
              name="corporateClientId"
              value={formData.corporateClientId || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">-- Chọn khách hàng công ty --</option>
              {corporateClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} {c.taxCode ? `(MST: ${c.taxCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn hồ sơ đoàn <span className="text-red-500">*</span>
            </label>
            <select
              name="groupBookingId"
              value={formData.groupBookingId || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">-- Chọn đoàn đặt phòng --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  Đoàn #{g.id} - Đại diện: {g.representativeName} ({g.checkInDate} - {g.checkOutDate})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bảng giá thỏa thuận theo từng loại phòng */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Thỏa thuận giá theo từng loại phòng <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">
                Đặt giá riêng cho từng loại phòng. Loại phòng để trống sẽ áp dụng giá niêm yết thông thường.
              </p>
            </div>

            {/* Quick apply same price */}
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                value={batchPrice}
                onChange={(e) => setBatchPrice(e.target.value)}
                placeholder="Nhập giá chung..."
                className="w-32 px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
                step="any"
              />
              <button
                type="button"
                onClick={handleApplyBatchPrice}
                className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                title="Áp dụng mức giá này cho tất cả loại phòng"
              >
                Áp dụng tất cả
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-60 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Loại phòng</th>
                  <th className="py-2.5 px-3 text-right">Giá niêm yết</th>
                  <th className="py-2.5 px-3 w-48 text-right">Giá thỏa thuận (VNĐ / đêm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roomTypes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-gray-400">
                      Đang tải danh sách loại phòng...
                    </td>
                  </tr>
                ) : (
                  roomTypes.map((rt) => {
                    const currentVal = roomPrices[rt.id] ?? '';
                    return (
                      <tr key={rt.id} className="hover:bg-gray-50/80">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {rt.name}
                          <span className="block text-xs text-gray-400 font-normal">
                            Sức chứa: {rt.standardCapacity} người
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-gray-500">
                          {formatVND(rt.basePrice || 0)}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => handleRoomPriceChange(rt.id, e.target.value)}
                            placeholder="Chưa thỏa thuận"
                            min="0"
                            step="any"
                            className="w-full px-2.5 py-1.5 text-xs text-right font-medium text-emerald-800 bg-emerald-50/40 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Thời gian hiệu lực */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày bắt đầu hiệu lực <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày kết thúc hiệu lực <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú / Điều khoản thỏa thuận
          </label>
          <textarea
            name="note"
            rows={2}
            value={formData.note}
            onChange={handleChange}
            placeholder="Ghi chú chi tiết về cam kết, số lượng phòng tối thiểu..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="agreement-active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="agreement-active" className="text-sm font-medium text-gray-700 cursor-pointer">
            Kích hoạt thỏa thuận (Được tự động áp giá khi lễ tân đặt phòng)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Đang lưu...' : (initialData ? 'Lưu thay đổi' : 'Tạo thỏa thuận')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NegotiatedPriceModal;
