import React, { useEffect, useState } from 'react';
import {
  IoAddOutline,
  IoBedOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoDocumentOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoRemoveOutline,
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { roomTypeApi } from '../../services/roomTypeApi';
import groupBookingApi from '../../services/groupBookingApi';

const emptyRoomLine = () => ({ roomTypeId: '', quantity: 1 });

const GroupBookingForm = ({ isOpen, onClose, onSuccess }) => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [formData, setFormData] = useState({
    representativeName: '',
    representativePhone: '',
    representativeEmail: '',
    checkInDate: '',
    checkOutDate: '',
    note: '',
    rooms: [emptyRoomLine()],
  });
  const [loading, setLoading] = useState(false);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      representativeName: '', representativePhone: '', representativeEmail: '',
      checkInDate: '', checkOutDate: '', note: '', rooms: [emptyRoomLine()],
    });
    setError('');
    loadRoomTypes();
  }, [isOpen]);

  const loadRoomTypes = async () => {
    setLoadingRoomTypes(true);
    try {
      const data = await roomTypeApi.getAllRoomTypes();
      setRoomTypes((data || []).filter((roomType) => roomType.active));
    } catch {
      setError('Không thể tải danh sách loại phòng.');
    } finally {
      setLoadingRoomTypes(false);
    }
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const updateRoomLine = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
    }));
  };

  const addRoomLine = () => setFormData((previous) => ({ ...previous, rooms: [...previous.rooms, emptyRoomLine()] }));

  const removeRoomLine = (index) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.checkInDate >= formData.checkOutDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    if (formData.rooms.some((line) => !line.roomTypeId || Number(line.quantity) < 1)) {
      setError('Vui lòng chọn loại phòng và số lượng hợp lệ cho từng dòng.');
      return;
    }
    setLoading(true);
    try {
      await groupBookingApi.create({
        ...formData,
        rooms: formData.rooms.map((line) => ({ roomTypeId: Number(line.roomTypeId), quantity: Number(line.quantity) })),
      });
      onSuccess();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tạo hồ sơ đoàn.');
    } finally {
      setLoading(false);
    }
  };

  const totalRooms = formData.rooms.reduce((total, line) => total + (Number(line.quantity) || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo hồ sơ đặt phòng đoàn" maxWidth="max-w-3xl">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">{error}</div>}
      <form id="groupBookingForm" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-container-lowest border border-border-grey rounded-lg">
          <div className="md:col-span-2 font-title-md text-on-surface flex items-center gap-2">
            <IoPersonOutline className="text-primary" size={18} /> Người đại diện đoàn
          </div>
          <Input label="Họ và tên" name="representativeName" icon={IoPersonOutline} value={formData.representativeName} onChange={updateField} required />
          <Input label="Số điện thoại" name="representativePhone" value={formData.representativePhone} onChange={updateField} placeholder="Dùng để tìm hoặc tạo hồ sơ khách" />
          <Input label="Email" type="email" name="representativeEmail" value={formData.representativeEmail} onChange={updateField} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Ngày nhận phòng" type="date" name="checkInDate" icon={IoLogInOutline} value={formData.checkInDate} onChange={updateField} required />
          <Input label="Ngày trả phòng" type="date" name="checkOutDate" icon={IoLogOutOutline} value={formData.checkOutDate} onChange={updateField} required />
        </div>

        <div className="border border-border-grey rounded-lg overflow-hidden">
          <div className="p-4 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b border-border-grey">
            <div className="font-title-md text-on-surface flex items-center gap-2"><IoBedOutline className="text-primary" size={18} /> Nhu cầu phòng</div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">{totalRooms} phòng</span>
          </div>
          <div className="p-4 space-y-3">
            {formData.rooms.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_90px_38px] gap-3 items-end">
                <label className="block text-sm text-on-surface-variant">
                  <span className="block font-label-md mb-1.5">Loại phòng</span>
                  <select value={line.roomTypeId} onChange={(event) => updateRoomLine(index, 'roomTypeId', event.target.value)} className="w-full py-2.5 px-3 bg-surface border border-border-grey rounded-lg outline-none focus:border-primary" required disabled={loadingRoomTypes}>
                    <option value="">{loadingRoomTypes ? 'Đang tải...' : 'Chọn loại phòng'}</option>
                    {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
                  </select>
                </label>
                <Input label="Số lượng" type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateRoomLine(index, 'quantity', event.target.value)} required />
                <button type="button" title="Xóa dòng phòng" onClick={() => removeRoomLine(index)} disabled={formData.rooms.length === 1} className="h-[42px] border border-red-200 text-error rounded-md hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"><IoRemoveOutline className="mx-auto" size={18} /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" icon={IoAddOutline} onClick={addRoomLine}>Thêm loại phòng</Button>
          </div>
        </div>

        <Input label="Ghi chú" name="note" icon={IoDocumentOutline} value={formData.note} onChange={updateField} placeholder="Yêu cầu chung của đoàn..." />
      </form>
      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border-grey">
        <Button variant="ghost" onClick={onClose} disabled={loading} icon={IoCloseOutline}>Hủy</Button>
        <Button type="submit" form="groupBookingForm" isLoading={loading} icon={IoCheckmarkCircleOutline}>Tạo hồ sơ đoàn</Button>
      </div>
    </Modal>
  );
};

export default GroupBookingForm;