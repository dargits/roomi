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
import { corporateClientApi, CorporateClient } from '../../services/corporateClientApi';
import { RoomTypeResponse, GroupBookingResponse } from '../../types';

interface RoomLine {
  roomTypeId: string | number;
  quantity: number | string;
}

const emptyRoomLine = (): RoomLine => ({ roomTypeId: '', quantity: 1 });

interface GroupBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: GroupBookingResponse, isDraft?: boolean) => void;
}

const GroupBookingForm: React.FC<GroupBookingFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [corporateClients, setCorporateClients] = useState<CorporateClient[]>([]);
  const [formData, setFormData] = useState({
    representativeName: '',
    representativePhone: '',
    representativeEmail: '',
    checkInDate: '',
    checkOutDate: '',
    note: '',
    corporateClientId: '',
    rooms: [emptyRoomLine()],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      representativeName: '', representativePhone: '', representativeEmail: '',
      checkInDate: '', checkOutDate: '', note: '', corporateClientId: '', rooms: [emptyRoomLine()],
    });
    setError('');
    loadRoomTypes();
    corporateClientApi.getAll(undefined, true).then(setCorporateClients).catch(console.error);
  }, [isOpen]);

  const updateField = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const updateRoomLine = (index: number, field: keyof RoomLine, value: any) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
    }));
  };

  const addRoomLine = () => setFormData((previous) => ({ ...previous, rooms: [...previous.rooms, emptyRoomLine()] }));

  const removeRoomLine = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
      const created = await groupBookingApi.create({
        ...formData,
        corporateClientId: formData.corporateClientId ? Number(formData.corporateClientId) : undefined,
        rooms: formData.rooms.map((line) => ({ roomTypeId: Number(line.roomTypeId), quantity: Number(line.quantity) })),
      });
      if (onSuccess) {
        onSuccess(created, false);
      }
    } catch (requestError: any) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FBFDF9] border border-border-grey rounded-xl">
          <div className="md:col-span-2 font-bold text-xs uppercase tracking-wider text-[#586650]">
            Người đại diện đoàn
          </div>
          <Input label="Họ và tên" name="representativeName" value={formData.representativeName} onChange={updateField} required />
          <Input label="Số điện thoại" name="representativePhone" value={formData.representativePhone} onChange={updateField} placeholder="Dùng để tìm hoặc tạo hồ sơ khách" />
          <Input label="Email" type="email" name="representativeEmail" value={formData.representativeEmail} onChange={updateField} />
          {/* Corporate Client Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-label-md mb-1.5 text-on-surface-variant">
              Khách hàng công ty <span className="text-xs font-normal text-on-surface-variant">(nếu đoàn có thỏa thuận giá)</span>
            </label>
            <select
              name="corporateClientId"
              value={formData.corporateClientId}
              onChange={(e) => setFormData(prev => ({ ...prev, corporateClientId: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none text-sm text-[#002146] transition-all"
            >
              <option value="">-- Khách lẻ / Không có thỏa thuận --</option>
              {corporateClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName}{c.taxCode ? ` (MST: ${c.taxCode})` : ''}
                </option>
              ))}
            </select>
            {formData.corporateClientId && (
              <p className="mt-1.5 text-xs text-emerald-700">
                🏷️ Giá thỏa thuận có hiệu lực (nếu có) sẽ được tự động áp khi tạo đặt phòng đơn.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Ngày nhận phòng" type="date" name="checkInDate" value={formData.checkInDate} onChange={updateField} required />
          <Input label="Ngày trả phòng" type="date" name="checkOutDate" value={formData.checkOutDate} onChange={updateField} required />
        </div>

        <div className="border border-border-grey rounded-xl overflow-hidden">
          <div className="p-4 bg-[#FBFDF9] flex flex-wrap items-center justify-between gap-3 border-b border-border-grey">
            <div className="font-bold text-xs uppercase tracking-wider text-[#586650]">Nhu cầu phòng</div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{totalRooms} phòng</span>
          </div>
          <div className="p-4 space-y-3">
            {formData.rooms.map((line, index) => {
              const selectedOtherIds = new Set(
                formData.rooms
                  .filter((_, lineIndex) => lineIndex !== index && _.roomTypeId)
                  .map((r) => Number(r.roomTypeId))
              );
              const availableRoomTypes = roomTypes.filter(
                (rt) => !selectedOtherIds.has(Number(rt.id)) || Number(rt.id) === Number(line.roomTypeId)
              );

              return (
                <div key={index} className="grid grid-cols-[1fr_90px_38px] gap-3 items-end">
                  <label className="block text-sm text-on-surface-variant">
                    <span className="block font-label-md mb-1.5">Loại phòng</span>
                    <select
                      value={line.roomTypeId}
                      onChange={(event) => updateRoomLine(index, 'roomTypeId', event.target.value)}
                      className="w-full py-2.5 px-3 bg-surface border border-border-grey rounded-lg outline-none focus:border-primary"
                      required
                      disabled={loadingRoomTypes}
                    >
                      <option value="">{loadingRoomTypes ? 'Đang tải...' : 'Chọn loại phòng'}</option>
                      {availableRoomTypes.map((roomType) => (
                        <option key={roomType.id} value={roomType.id}>
                          {roomType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Số lượng"
                    type="number"
                    min="1"
                    step="1"
                    value={String(line.quantity)}
                    onChange={(event) => updateRoomLine(index, 'quantity', event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    title="Xóa dòng phòng"
                    onClick={() => removeRoomLine(index)}
                    disabled={formData.rooms.length === 1}
                    className="h-[42px] border border-red-200 text-error rounded-xl hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <IoRemoveOutline className="mx-auto" size={18} />
                  </button>
                </div>
              );
            })}
            {formData.rooms.length < roomTypes.length && (
              <Button type="button" variant="outline" size="sm" onClick={addRoomLine}>
                Thêm loại phòng
              </Button>
            )}
          </div>
        </div>

        <Input label="Ghi chú" name="note" value={formData.note} onChange={updateField} placeholder="Yêu cầu chung của đoàn..." />
      </form>
      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border-grey">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button type="submit" form="groupBookingForm" isLoading={loading}>Tạo hồ sơ đoàn</Button>
      </div>
    </Modal>
  );
};

export default GroupBookingForm;
