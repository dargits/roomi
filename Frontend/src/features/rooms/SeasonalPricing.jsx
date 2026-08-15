import React, { useState, useEffect } from 'react';
import { IoAddOutline, IoCalendarOutline, IoCashOutline, IoChevronDownOutline, IoChevronUpOutline, IoCreateOutline, IoTrashOutline, IoWarningOutline } from 'react-icons/io5';
import seasonalPriceApi from '../../services/seasonalPriceApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  pricePerNight: ''
};

/**
 * Component quản lý Giá theo Mùa cho một Loại phòng cụ thể.
 * Sử dụng như một panel có thể thu gọn bên dưới mỗi loại phòng.
 */
const SeasonalPricing = ({ roomTypeId, roomTypeName, basePrice }) => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Delete confirm
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await seasonalPriceApi.getAll(roomTypeId);
      setPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải giá theo mùa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) fetchPrices();
  }, [expanded, roomTypeId]);

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setEditingId(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (price) => {
    setFormData({
      startDate: price.startDate || '',
      endDate: price.endDate || '',
      pricePerNight: price.pricePerNight?.toString() || ''
    });
    setIsEditing(true);
    setEditingId(price.id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.startDate || !formData.endDate || !formData.pricePerNight) {
      setFormError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (formData.startDate >= formData.endDate) {
      setFormError('Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }
    setProcessing(true);
    try {
      const payload = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        pricePerNight: parseFloat(formData.pricePerNight)
      };
      if (isEditing) {
        await seasonalPriceApi.update(roomTypeId, editingId, payload);
      } else {
        await seasonalPriceApi.create(roomTypeId, payload);
      }
      setIsModalOpen(false);
      fetchPrices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      await seasonalPriceApi.delete(roomTypeId, deletingId);
      setIsDeleteOpen(false);
      setDeletingId(null);
      fetchPrices();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-4 border border-border-grey rounded-lg overflow-hidden">
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container transition-colors"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <div className="flex items-center gap-2 font-label-md text-on-surface-variant">
          <IoCashOutline size={16} className="text-tertiary" />
          <span>Giá theo Mùa</span>
          {prices.length > 0 && !loading && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/10 text-tertiary">
              {prices.length}
            </span>
          )}
        </div>
        {expanded ? <IoChevronUpOutline size={16} /> : <IoChevronDownOutline size={16} />}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 bg-surface-container-lowest">
          <div className="flex justify-between items-center mb-3">
            <p className="font-body-md text-on-surface-variant">
              Giá cơ bản: <strong className="text-primary">{formatCurrency(basePrice)}</strong>/đêm
            </p>
            <Button onClick={openAddModal} icon={IoAddOutline} className="text-xs py-1.5 px-3">
              Thêm mùa
            </Button>
          </div>

          {loading ? (
            <div className="py-4 text-center text-on-surface-variant text-sm">Đang tải...</div>
          ) : prices.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-border-grey rounded-lg">
              <IoCalendarOutline size={28} className="text-on-surface-variant/30 mx-auto mb-2" />
              <p className="text-sm text-on-surface-variant">Chưa có giá đặc biệt theo mùa nào.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prices.map((price) => (
                <div
                  key={price.id}
                  className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-border-grey"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-tertiary/10 rounded">
                      <IoCalendarOutline size={16} className="text-tertiary" />
                    </div>
                    <div>
                      <p className="font-title-sm text-on-surface">
                        {formatDate(price.startDate)} → {formatDate(price.endDate)}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {Math.ceil((new Date(price.endDate) - new Date(price.startDate)) / (1000 * 60 * 60 * 24))} đêm
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-title-md text-tertiary font-bold">
                      {formatCurrency(price.pricePerNight)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(price)}
                        className="p-1.5 rounded hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant"
                        title="Sửa"
                      >
                        <IoCreateOutline size={15} />
                      </button>
                      <button
                        onClick={() => { setDeletingId(price.id); setIsDeleteOpen(true); }}
                        className="p-1.5 rounded hover:bg-red-50 hover:text-error transition-colors text-on-surface-variant"
                        title="Xóa"
                      >
                        <IoTrashOutline size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Sửa giá theo mùa' : 'Thêm giá theo mùa'}
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
            {formError}
          </div>
        )}
        <form id="seasonalPriceForm" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ngày bắt đầu"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            label="Ngày kết thúc"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
          <Input
            label="Giá mỗi đêm (VNĐ)"
            type="number"
            min="0"
            step="1000"
            value={formData.pricePerNight}
            onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
            placeholder="Ví dụ: 2000000"
            required
          />
          {formData.pricePerNight && (
            <p className="text-xs text-on-surface-variant">
              = <strong className="text-primary">{formatCurrency(parseFloat(formData.pricePerNight) || 0)}</strong>/đêm
            </p>
          )}
        </form>
        <div className="flex justify-end gap-3 pt-5 border-t border-border-grey mt-5">
          <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Hủy</Button>
          <Button type="submit" form="seasonalPriceForm" isLoading={processing}>Lưu</Button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center pb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-error flex items-center justify-center mb-4">
            <IoWarningOutline size={28} strokeWidth={1.5} />
          </div>
          <h3 className="font-title-lg text-on-surface mb-2">Xóa giá theo mùa?</h3>
          <p className="font-body-md text-on-surface-variant">Thao tác này không thể hoàn tác.</p>
        </div>
        <div className="flex gap-3 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="flex-1">Hủy</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={processing} className="flex-1">Xóa</Button>
        </div>
      </Modal>
    </div>
  );
};

export default SeasonalPricing;
