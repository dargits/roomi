import React, { useEffect, useState } from 'react';
import {
  IoAddOutline,
  IoBedOutline,
  IoCalendarOutline,
  IoCallOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoRemoveOutline,
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import publicGroupBookingRequestApi from '../../services/publicGroupBookingRequestApi';

const emptyRoomLine = () => ({ roomTypeId: '', quantity: 1 });

const PublicGroupBookingModal = ({ isOpen, onClose, roomTypes, initialRoom, checkInDate, checkOutDate }) => {
  const [formData, setFormData] = useState({
    representativeName: '', phone: '', email: '', checkInDate: '', checkOutDate: '', note: '', rooms: [emptyRoomLine()],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      representativeName: '',
      phone: '',
      email: '',
      checkInDate: checkInDate ? checkInDate.toISOString().slice(0, 10) : '',
      checkOutDate: checkOutDate ? checkOutDate.toISOString().slice(0, 10) : '',
      note: '',
      rooms: [initialRoom ? { roomTypeId: String(initialRoom.id), quantity: 1 } : emptyRoomLine()],
    });
    setError('');
    setSuccess(false);
  }, [isOpen, initialRoom, checkInDate, checkOutDate]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const updateRoom = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, roomIndex) => roomIndex === index ? { ...room, [field]: value } : room),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.checkInDate >= formData.checkOutDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    if (formData.rooms.some((room) => !room.roomTypeId || Number(room.quantity) < 1)) {
      setError('Vui lòng chọn loại phòng và số lượng hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      await publicGroupBookingRequestApi.create({
        ...formData,
        rooms: formData.rooms.map((room) => ({ roomTypeId: Number(room.roomTypeId), quantity: Number(room.quantity) })),
      });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi yêu cầu đặt phòng đoàn.');
    } finally {
      setLoading(false);
    }
  };

  const totalRooms = formData.rooms.reduce((total, room) => total + (Number(room.quantity) || 0), 0);

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Yêu cầu đã được gửi" maxWidth="max-w-lg">
        <div className="py-5 text-center">
          <IoCheckmarkCircleOutline className="mx-auto text-green-600" size={52} />
          <h2 className="mt-4 text-xl font-bold text-on-surface">Cảm ơn bạn, {formData.representativeName}</h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Yêu cầu đặt {totalRooms} phòng cho đoàn đã được chuyển đến lễ tân. Chúng tôi sẽ liên hệ qua số {formData.phone} để xác nhận.</p>
          <Button onClick={handleClose} className="mt-6">Hoàn tất</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yêu cầu đặt phòng theo đoàn" maxWidth="max-w-3xl">
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{error}</div>}
      <form id="publicGroupBookingForm" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border-grey bg-surface-container-lowest p-4 sm:grid-cols-2">
          <div className="col-span-full flex items-center gap-2 font-semibold text-on-surface"><IoPersonOutline className="text-primary" /> Người đại diện đoàn</div>
          <Input label="Họ và tên" name="representativeName" value={formData.representativeName} onChange={updateField} required />
          <Input label="Số điện thoại" name="phone" icon={IoCallOutline} value={formData.phone} onChange={updateField} required />
          <div className="sm:col-span-2"><Input label="Email" name="email" type="email" icon={IoMailOutline} value={formData.email} onChange={updateField} /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Ngày nhận phòng" name="checkInDate" type="date" icon={IoCalendarOutline} value={formData.checkInDate} onChange={updateField} required />
          <Input label="Ngày trả phòng" name="checkOutDate" type="date" icon={IoCalendarOutline} value={formData.checkOutDate} onChange={updateField} required />
        </div>
        <section className="overflow-hidden rounded-lg border border-border-grey">
          <div className="flex items-center justify-between gap-3 border-b border-border-grey bg-surface-container-low p-4">
            <div className="flex items-center gap-2 font-semibold text-on-surface"><IoBedOutline className="text-primary" /> Nhu cầu phòng</div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">{totalRooms} phòng</span>
          </div>
          <div className="space-y-3 p-4">
            {formData.rooms.map((room, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_42px] items-end gap-3">
                <label className="block text-sm text-on-surface-variant"><span className="mb-1.5 block font-medium">Loại phòng</span>
                  <select value={room.roomTypeId} onChange={(event) => updateRoom(index, 'roomTypeId', event.target.value)} className="w-full rounded-md border border-border-grey bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:outline-none" required>
                    <option value="">Chọn loại phòng</option>
                    {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
                  </select>
                </label>
                <Input label="Số lượng" type="number" min="1" value={room.quantity} onChange={(event) => updateRoom(index, 'quantity', event.target.value)} required />
                <button type="button" title="Xóa loại phòng" onClick={() => setFormData((previous) => ({ ...previous, rooms: previous.rooms.filter((_, roomIndex) => roomIndex !== index) }))} disabled={formData.rooms.length === 1} className="h-[42px] rounded-md border border-red-200 text-error hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><IoRemoveOutline className="mx-auto" size={18} /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" icon={IoAddOutline} onClick={() => setFormData((previous) => ({ ...previous, rooms: [...previous.rooms, emptyRoomLine()] }))}>Thêm loại phòng</Button>
          </div>
        </section>
        <label className="block text-sm font-medium text-on-surface">Ghi chú
          <textarea name="note" value={formData.note} onChange={updateField} rows="3" className="mt-1.5 w-full rounded-md border border-border-grey bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="Số khách, giờ đến dự kiến hoặc yêu cầu đặc biệt..." />
        </label>
      </form>
      <div className="mt-6 flex justify-end gap-3 border-t border-border-grey pt-5">
        <Button variant="ghost" onClick={handleClose} disabled={loading} icon={IoCloseOutline}>Hủy</Button>
        <Button type="submit" form="publicGroupBookingForm" isLoading={loading} icon={IoPeopleOutline}>Gửi yêu cầu đoàn</Button>
      </div>
    </Modal>
  );
};

export default PublicGroupBookingModal;