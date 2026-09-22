import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { NegotiatedPriceAgreement, NegotiatedPriceAgreementRequest } from '../../services/negotiatedPriceApi';
import { corporateClientApi, CorporateClient } from '../../services/corporateClientApi';
import { groupBookingApi } from '../../services/groupBookingApi';

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
  }, [initialData, defaultCorporateClientId, defaultGroupBookingId, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
    if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0) {
      setError('Mức giá thỏa thuận phải lớn hơn 0');
      return;
    }
    if (formData.startDate > formData.endDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        pricePerNight: Number(formData.pricePerNight),
        corporateClientId: targetType === 'CORPORATE' ? Number(formData.corporateClientId) : null,
        groupBookingId: targetType === 'GROUP' ? Number(formData.groupBookingId) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh sửa thỏa thuận giá' : 'Tạo mới thỏa thuận giá (Giá thỏa thuận)'}
      maxWidth="max-w-xl"
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
            placeholder="Ví dụ: Hợp đồng Viettel Q3/2026 hoặc Giá thỏa thuận Đoàn FPT"
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

        {/* Mức giá thỏa thuận */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mức giá thỏa thuận (VNĐ / đêm) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            name="pricePerNight"
            value={formData.pricePerNight || ''}
            onChange={handleChange}
            placeholder="Ví dụ: 850000"
            min="1000"
            step="1000"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            * Mức giá cố định này áp dụng cho mọi hạng phòng trong thời gian hiệu lực
          </p>
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
