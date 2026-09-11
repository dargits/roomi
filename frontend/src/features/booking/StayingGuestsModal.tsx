import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { stayingGuestsApi } from '../../services/stayingGuestsApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoPersonAddOutline, 
  IoTrashOutline, 
  IoRefreshOutline,
  IoChevronDownOutline,
  IoInformationCircleOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';
import roomTypeApi from '../../services/roomTypeApi';
import { BookingResponse, RoomStayGuestResponseDto, StayingGuestsSummaryDto, RoomTypeResponse } from '../../types';

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
  const [summary, setSummary] = useState<StayingGuestsSummaryDto | null>(null);
  const [roomTypeConfig, setRoomTypeConfig] = useState<RoomTypeResponse | null>(null);
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
      // Tải cấu hình loại phòng trực tiếp từ API loại phòng để luôn có giá phụ thu mới nhất của chủ cơ sở
      const targetRoomTypeId = booking.roomTypeId || booking.roomType?.id;
      if (targetRoomTypeId) {
        roomTypeApi.getRoomTypeById(targetRoomTypeId)
          .then(res => { if (res) setRoomTypeConfig(res); })
          .catch(() => {});
      } else if (booking.roomTypeName) {
        roomTypeApi.getAllRoomTypes().then(types => {
          const matched = types.find(t => t.name === booking.roomTypeName);
          if (matched) setRoomTypeConfig(matched);
        }).catch(() => {});
      }

      const summaryData = await stayingGuestsApi.getStayingGuestsSummary(booking.id);
      setSummary(summaryData);
      setGuests(summaryData?.guests || []);
    } catch (err) {
      console.error(err);
      try {
        const data = await stayingGuestsApi.getStayingGuests(booking.id);
        setGuests(data || []);
      } catch {
        toastError('Không thể tải danh sách khách cùng phòng.');
      }
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

  const standardCapacity = summary?.standardCapacity 
    ?? roomTypeConfig?.standardCapacity 
    ?? booking?.standardCapacity 
    ?? booking?.roomType?.standardCapacity 
    ?? 2;

  const maxCapacity = summary?.maxCapacity 
    ?? roomTypeConfig?.maxCapacity 
    ?? booking?.maxCapacity 
    ?? booking?.roomCapacity 
    ?? booking?.roomType?.maxCapacity 
    ?? 4;

  const extraPersonChargePerNight = summary?.extraPersonChargePerNight 
    ?? (roomTypeConfig?.extraPersonChargePerNight !== undefined ? Number(roomTypeConfig.extraPersonChargePerNight) : undefined)
    ?? (booking?.extraPersonChargePerNight !== undefined ? Number(booking.extraPersonChargePerNight) : undefined)
    ?? (booking?.roomType?.extraPersonChargePerNight !== undefined ? Number(booking.roomType.extraPersonChargePerNight) : undefined)
    ?? 0;

  const maxChildAgeFree = summary?.maxChildAgeFree 
    ?? roomTypeConfig?.maxChildAgeFree 
    ?? booking?.maxChildAgeFree 
    ?? booking?.roomType?.maxChildAgeFree 
    ?? 6;

  const totalNights = summary?.totalNights ?? (booking?.checkInDate && booking?.checkOutDate 
    ? Math.max(1, Math.round((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))) 
    : 1);

  // Tự động nhận diện trẻ em nếu người dùng nhập năm sinh hợp lệ
  useEffect(() => {
    if (birthYear) {
      const year = Number(birthYear);
      if (!isNaN(year) && year > 1900) {
        const age = new Date().getFullYear() - year;
        if (age <= maxChildAgeFree) {
          setIsChild(true);
        }
      }
    }
  }, [birthYear, maxChildAgeFree]);

  if (!booking) return null;

  const currentStayingCount = summary ? summary.totalGuests : guests.filter(g => !g.leftEarlyAt).length;
  const remainingSlots = Math.max(0, maxCapacity - currentStayingCount);

  // Tính toán phụ thu dự phòng ngay cả khi backend chưa reload
  const fallbackExtraGuests = Math.max(0, currentStayingCount - standardCapacity);
  const fallbackChildCount = guests.filter(g => !g.leftEarlyAt && g.isChild).length;
  const fallbackFreeChildren = Math.min(fallbackChildCount, fallbackExtraGuests);
  const fallbackChargeableExtraGuests = Math.max(0, fallbackExtraGuests - fallbackFreeChildren);
  const fallbackTotalExtraCharge = extraPersonChargePerNight * fallbackChargeableExtraGuests * totalNights;

  const chargeableExtraGuests = summary?.chargeableExtraGuests ?? fallbackChargeableExtraGuests;
  const totalExtraCharge = summary?.totalExtraCharge ?? fallbackTotalExtraCharge;

  // Dự toán khách sắp thêm
  const nextStayingCount = currentStayingCount + 1;
  const willExceedStandard = nextStayingCount > standardCapacity;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toastError('Vui lòng nhập họ và tên khách cùng phòng.');
      return;
    }

    if (remainingSlots <= 0 || currentStayingCount >= maxCapacity) {
      toastError(`Phòng đã đạt sức chứa tối đa (${maxCapacity} người). Số khách có thể thêm tối đa là 0.`);
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

      let notice = `Đã thêm khách "${fullName.trim()}" vào phòng!`;
      if (!isChild && willExceedStandard && extraPersonChargePerNight > 0) {
        notice += ` (Áp dụng phụ thu vượt chuẩn: +${(extraPersonChargePerNight * totalNights).toLocaleString('vi-VN')} ₫)`;
      }
      toastSuccess(notice);

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
      message: `Đánh dấu khách "${guest.fullName}" rời phòng sớm lúc này? Tiền phụ thu (nếu có) sẽ được tính toán lại tương ứng.`,
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
      message: `Xác nhận xóa khách "${guest.fullName}" khỏi danh sách phòng? Phụ thu sẽ tự động điều chỉnh lại.`,
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
        {/* Banner thông tin phòng, sức chứa & phụ thu */}
        <div className="p-4 bg-surface-container-low rounded-xl border border-border-grey space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="font-bold text-on-surface text-base">
                Phòng {booking.roomNumber || 'Chưa gán'}
              </span>
              <span className="text-on-surface-variant ml-2 font-medium">
                (Booking #{booking.id} - {booking.roomTypeName})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                currentStayingCount >= maxCapacity 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-green-100 text-green-700 border border-green-300'
              }`}>
                {currentStayingCount} / {maxCapacity} người đang ở
              </span>
              <span className="text-xs text-on-surface-variant">
                (Còn thêm được: <strong className={remainingSlots > 0 ? "text-primary font-bold" : "text-error font-bold"}>{remainingSlots}</strong> người)
              </span>
              <Button size="sm" variant="ghost" onClick={fetchGuests} icon={IoRefreshOutline} disabled={loading} title="Tải lại danh sách" />
            </div>
          </div>

          {/* Cấu hình sức chứa tiêu chuẩn & phụ thu vượt ngưỡng do chủ cơ sở cấu hình */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2.5 border-t border-border-grey text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-on-surface">Tiêu chuẩn:</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border-grey font-bold text-on-surface">{standardCapacity} người</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-on-surface">Tối đa:</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border-grey font-bold text-on-surface">{maxCapacity} người</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-on-surface">Phụ thu vượt chuẩn:</span>
              <span className="text-amber-700 font-bold">
                {extraPersonChargePerNight > 0 ? `+${extraPersonChargePerNight.toLocaleString('vi-VN')} ₫/người/đêm` : '0 ₫/đêm'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span>(Trẻ em ≤ {maxChildAgeFree} tuổi: Miễn phụ thu)</span>
            </div>

            {chargeableExtraGuests > 0 && (
              <div className="sm:ml-auto px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold flex items-center gap-1">
                <span>⚡ Phụ thu vượt chuẩn ({chargeableExtraGuests} người): +{totalExtraCharge.toLocaleString('vi-VN')} ₫ / {totalNights} đêm</span>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách khách đang ở */}
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
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Trẻ em (Miễn phụ thu)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          Người lớn
                        </span>
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

        {/* Form thêm người cùng ở */}
        <form onSubmit={handleAddGuest} className="p-4 bg-surface-container-low rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <IoPersonAddOutline size={18} className="text-primary" />
              <span>Thêm người cùng ở</span>
            </div>
            <div className="text-xs text-on-surface-variant">
              Số khách có thể thêm tối đa: <strong className={remainingSlots > 0 ? "text-primary font-bold" : "text-error font-bold"}>{remainingSlots}</strong> người
            </div>
          </div>

          {remainingSlots <= 0 ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <IoInformationCircleOutline size={18} className="shrink-0 text-red-600" />
              <span>
                Phòng đã đạt sức chứa tối đa ({maxCapacity}/{maxCapacity} người). Số khách có thể thêm là <strong>0</strong>. Vui lòng nâng hạng sang phòng lớn hơn hoặc đặt thêm phòng nếu có thêm khách!
              </span>
            </div>
          ) : (
            <>
              {/* Dự toán phụ thu tự động theo cấu hình chủ cơ sở */}
              {isChild ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <IoCheckmarkCircleOutline size={18} className="shrink-0 text-emerald-600" />
                  <span>
                    Khách này là <strong>Trẻ em (≤ {maxChildAgeFree} tuổi)</strong>: Được miễn phí phụ thu thêm người (0 ₫).
                  </span>
                </div>
              ) : willExceedStandard ? (
                <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center gap-2">
                  <IoInformationCircleOutline size={18} className="shrink-0 text-amber-700" />
                  <span>
                    ⚡ Khách thứ <strong>{nextStayingCount}</strong> vượt quá sức chứa tiêu chuẩn ({standardCapacity} người) của loại phòng. 
                    Áp dụng phụ thu vượt ngưỡng: <strong>+{extraPersonChargePerNight.toLocaleString('vi-VN')} ₫/đêm</strong> 
                    {' '}(Tổng <strong>+{(extraPersonChargePerNight * totalNights).toLocaleString('vi-VN')} ₫</strong> cho {totalNights} đêm lưu trú).
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
                  <IoCheckmarkCircleOutline size={18} className="shrink-0 text-blue-600" />
                  <span>
                    ✓ Khách thứ {nextStayingCount} nằm trong sức chứa tiêu chuẩn ({standardCapacity} người). Không tính phụ thu (0 ₫).
                  </span>
                </div>
              )}
            </>
          )}

          {/* Form grid 4 cột đều nhau */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-start">
            <div>
              <Input
                label="Họ và tên"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn B"
                disabled={remainingSlots <= 0}
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
                disabled={remainingSlots <= 0}
              />
            </div>

            <div>
              <label className="block font-label-md text-on-surface-variant mb-1.5">Loại giấy tờ</label>
              <div className="relative">
                <select
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  disabled={remainingSlots <= 0}
                  className="w-full py-2.5 px-4 bg-surface border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-on-surface appearance-none cursor-pointer pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="CCCD">CCCD / CMND</option>
                  <option value="PASSPORT">Hộ chiếu (Passport)</option>
                  <option value="OTHER">Khác</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant/70">
                  <IoChevronDownOutline size={18} />
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Số giấy tờ tùy thân"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                placeholder="Ví dụ: 00120000..."
                disabled={remainingSlots <= 0}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isChild"
                checked={isChild}
                onChange={e => setIsChild(e.target.checked)}
                disabled={remainingSlots <= 0}
                className="w-4 h-4 text-primary rounded border-border-grey cursor-pointer disabled:cursor-not-allowed"
              />
              <label htmlFor="isChild" className="text-xs font-medium text-on-surface cursor-pointer select-none">
                Là trẻ em (Dưới ≤ {maxChildAgeFree} tuổi sẽ được tự động miễn phụ thu thêm người)
              </label>
            </div>

            <Button
              type="submit"
              size="sm"
              icon={IoPersonAddOutline}
              disabled={submitting || remainingSlots <= 0}
            >
              {submitting ? 'Đang thêm...' : remainingSlots <= 0 ? 'Đã đủ số người' : 'Thêm vào phòng'}
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
