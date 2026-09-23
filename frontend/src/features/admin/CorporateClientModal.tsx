import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { CorporateClient, CorporateClientRequest } from '../../services/corporateClientApi';

interface CorporateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CorporateClientRequest) => Promise<void>;
  initialData?: CorporateClient | null;
  loading?: boolean;
}

export const CorporateClientModal: React.FC<CorporateClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CorporateClientRequest>({
    companyName: '',
    taxCode: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    note: '',
    active: true,
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        taxCode: initialData.taxCode || '',
        contactPerson: initialData.contactPerson || '',
        contactPhone: initialData.contactPhone || '',
        contactEmail: initialData.contactEmail || '',
        address: initialData.address || '',
        note: initialData.note || '',
        active: initialData.active ?? true,
      });
    } else {
      setFormData({
        companyName: '',
        taxCode: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        address: '',
        note: '',
        active: true,
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setError('Vui lòng nhập tên công ty / doanh nghiệp');
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh sửa hồ sơ khách công ty' : 'Thêm mới khách hàng công ty'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên công ty / Doanh nghiệp <span className="text-red-500">*</span>
          </label>
          <Input
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Ví dụ: Công ty TNHH Giải pháp FPT"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã số thuế
            </label>
            <Input
              name="taxCode"
              value={formData.taxCode}
              onChange={handleChange}
              placeholder="Ví dụ: 0101234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Người liên hệ chính
            </label>
            <Input
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Họ tên người phụ trách"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <Input
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              placeholder="Số điện thoại liên lạc"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email công ty / liên hệ
            </label>
            <Input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="example@company.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Địa chỉ doanh nghiệp
          </label>
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú
          </label>
          <textarea
            name="note"
            rows={3}
            value={formData.note}
            onChange={handleChange}
            placeholder="Ghi chú nội bộ về khách hàng doanh nghiệp..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="corp-active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="corp-active" className="text-sm font-medium text-gray-700 cursor-pointer">
            Đang hoạt động (Kích hoạt để cho phép tạo thỏa thuận giá)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Đang lưu...' : (initialData ? 'Lưu thay đổi' : 'Tạo hồ sơ')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CorporateClientModal;
