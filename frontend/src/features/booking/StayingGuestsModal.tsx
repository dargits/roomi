import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { stayingGuestsApi } from '../../services/stayingGuestsApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoPersonAddOutline, 
  IoTrashOutline, 
  IoRefreshOutline
} from 'react-icons/io5';
import { BookingResponse, RoomStayGuestResponseDto } from '../../types';

interface StayingGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingResponse | any;
  onUpdated?: () => void;
}

const StayingGuestsModal: React.FC<StayingGuestsModalProps> = ({ isOpen, onClose, booking, onUpdated }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [guests, setGuests] = useState<RoomStayGuestResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form state
  const [fullName, setFullName] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('CCCD');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [isChild, setIsChild] = useState<boolean>(false);

  const fetchGuests = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const data = await stayingGuestsApi.getStayingGuests(booking.id);
      setGuests(data || []);
    } catch (err) {
      console.error(err);
      toastError('Không thể tải danh sách khách cùng phòng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      fetchGuests();
      setFullName('');
      setBirthYear('');
      setDocumentType('CCCD');
      setDocumentNumber('');
      setIsChild(false);
    }
  }, [isOpen, booking]);

  if (!booking) return null;

  const currentStayingCount = guests.filter(g => !g.leftEarlyAt).length;
  const maxCapacity = booking.maxCapacity || booking.roomType?.maxCapacity || 4;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toastError('Vui lòng nhập họ và tên khách cùng phòng.');
      return;
    }

    if (currentStayingCount >= maxCapacity) {
      toastError(`Phòng đã đạt sức chứa tối đa (${maxCapacity} người). Vui lòng chuyển sang phòng lớn hơn hoặc đặt thêm phòng!`);
      return;
    }

    setSubmitting(true);
    try {
      await stayingGuestsApi.addStayingGuest(booking.id, {
        fullName: fullName.trim(),
        birthYear: birthYear ? Number(birthYear) : null,
        documentType,
        documentNumber: documentNumber.trim(),
        isChild
      });
      toastSuccess(`Đã thêm khách "${fullName.trim()}" vào phòng!`);
      setFullName('');
      setBirthYear('');
      setDocumentNumber('');
      setIsChild(false);
      fetchGuests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi thêm khách.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLeftEarly = async (guest: RoomStayGuestResponseDto) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận khách rời sớm',
      message: `Đánh dấu khách "${guest.fullName}" rời phòng sớm lúc này?`,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    try {
      await stayingGuestsApi.markLeftEarly(booking.id, guest.id);
      toastSuccess(`Đã đánh dấu khách "${guest.fullName}" rời phòng sớm.`);
      fetchGuests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi đánh dấu rời sớm.');
    }
  };

  const handleRemoveGuest = async (guest: RoomStayGuestResponseDto) => {
    if (guest.isExported) {
      toastError('Khách này đã nằm trong bản khai báo lưu trú đã kết xuất tới cơ quan quản lý. Quy định không cho phép xóa, chỉ được đánh dấu rời sớm!');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Xác nhận xóa khách',
      message: `Xác nhận xóa khách "${guest.fullName}" khỏi danh sách phòng?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await stayingGuestsApi.removeStayingGuest(booking.id, guest.id);
      toastSuccess(`Đã xóa khách "${guest.fullName}".`);
      fetchGuests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Lỗi khi xóa khách.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Danh sách khách cùng phòng & Khai báo lưu trú" maxWidth="max-w-4xl">
      <div className="space-y-5">
        <div className="p-3.5 bg-surface-container-low rounded-lg border border-border-grey flex flex-wrap justify-between items-center gap-3 text-sm">
          <div>
            <span className="font-bold text-on-surface text-base">
              Phòng {booking.roomNumber || 'Chưa gán'}
            </span>
            <span className="text-on-surface-variant ml-2">
              (Booking #{booking.id} - {booking.roomTypeName})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Sức chứa:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              currentStayingCount >= maxCapacity 
                ? 'bg-red-100 text-red-700 border border-red-300' 
                : 'bg-green-100 text-green-700 border border-green-300'
            }`}>
              {currentStayingCount} / {maxCapacity} người đang ở
            </span>
            <Button size="sm" variant="ghost" onClick={fetchGuests} icon={IoRefreshOutline} disabled={loading} />
          </div>
        </div>

        <div className="overflow-x-auto border border-border-grey rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-grey font-label-md text-on-surface-variant uppercase text-xs">
                <th className="p-3">Họ và tên</th>
                <th className="p-3 text-center">Năm sinh</th>
                <th className="p-3">Giấy tờ tùy thân</th>
                <th className="p-3 text-center">Đối tượng</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 text-center w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-on-surface-variant">Đang tải danh sách khách...</td></tr>
              ) : guests.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-on-surface-variant">Chưa có khách nào được khai báo cùng phòng.</td></tr>
              ) : (
                guests.map(guest => (
                  <tr key={guest.id} className={`border-b border-border-grey hover:bg-surface-container-low/40 ${guest.leftEarlyAt ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="p-3 font-medium text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span>{guest.fullName}</span>
                        {guest.isPrimaryGuest && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary border border-primary/20">
                            Chính
                          </span>
                        )}
                      </div>
                      {guest.isExported && (
                        <div className="text-[11px] text-blue-600 mt-0.5">✓ Đã xuất khai báo lưu trú</div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {guest.birthYear || '---'}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <div><span className="text-on-surface-variant">{guest.documentType || 'CCCD'}:</span> {guest.documentNumber || 'Chưa cập nhật'}</div>
                    </td>
                    <td className="p-3 text-center">
                      {guest.isChild ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Trẻ em (Miễn phụ thu)
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant">Người lớn</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {guest.leftEarlyAt ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                          Rời sớm ({guest.leftEarlyAt.substring(11, 16)})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          Đang lưu trú
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {!guest.isPrimaryGuest && (
                        <div className="flex items-center justify-center gap-2">
                          {!guest.leftEarlyAt && (
                            <button
                              type="button"
                              onClick={() => handleMarkLeftEarly(guest)}
                              className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 rounded border border-amber-300 font-medium transition-colors cursor-pointer"
                              title="Đánh dấu khách rời sớm"
                            >
                              Rời sớm
                            </button>
                          )}
                          {!guest.isExported && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest(guest)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Xóa khách"
                            >
                              <IoTrashOutline size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleAddGuest} className="p-4 bg-surface-container-low rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <IoPersonAddOutline size={18} className="text-primary" />
            <span>Thêm người cùng ở</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Input
                label="Họ và tên"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn B"
              />
            </div>

            <div>
              <Input
                label="Năm sinh"
                type="number"
                min="1900"
                max={String(new Date().getFullYear())}
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                placeholder="Ví dụ: 1995"
              />
            </div>

            <div>
              <label className="block font-label-md text-on-surface-variant mb-1.5 text-xs">Loại giấy tờ</label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-border-grey rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="CCCD">CCCD / CMND</option>
                <option value="PASSPORT">Hộ chiếu (Passport)</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <Input
                label="Số giấy tờ tùy thân"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                placeholder="Ví dụ: 00120000..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isChild"
                checked={isChild}
                onChange={e => setIsChild(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border-grey cursor-pointer"
              />
              <label htmlFor="isChild" className="text-xs font-medium text-on-surface cursor-pointer">
                Là trẻ em (Dưới độ tuổi quy định sẽ được tự động miễn phụ thu thêm người)
              </label>
            </div>

            <Button
              type="submit"
              size="sm"
              icon={IoPersonAddOutline}
              disabled={submitting || currentStayingCount >= maxCapacity}
            >
              {submitting ? 'Đang thêm...' : 'Thêm vào phòng'}
            </Button>
          </div>
        </form>

        <div className="flex justify-end pt-3 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StayingGuestsModal;
