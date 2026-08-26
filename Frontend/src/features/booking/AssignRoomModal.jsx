import React, { useState, useEffect } from 'react';
import { IoCheckmarkOutline, IoBedOutline, IoAlertCircleOutline, IoSwapHorizontalOutline, IoPersonOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { roomApi } from '../../services/roomApi';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';

const AssignRoomModal = ({
  isOpen,
  onClose,
  booking,
  bookingId: propBookingId,
  roomTypeId: propRoomTypeId,
  checkInDate: propCheckInDate,
  checkOutDate: propCheckOutDate,
  onAssigned,
  onSuccess
}) => {
  const { toastSuccess, toastError } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [processing, setProcessing] = useState(false);

  const effectiveBookingId = propBookingId || booking?.id || booking?.bookingId;
  const effectiveRoomTypeId = propRoomTypeId || booking?.roomTypeId || booking?.roomType?.id;
  const effectiveCheckInDate = propCheckInDate || booking?.checkInDate;
  const effectiveCheckOutDate = propCheckOutDate || booking?.checkOutDate;
  const currentRoomNumber = booking?.roomNumber || booking?.room?.roomNumber;
  const isChangingRoom = Boolean(currentRoomNumber);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen, effectiveRoomTypeId, effectiveCheckInDate, effectiveCheckOutDate]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      let availableRooms = [];
      if (effectiveRoomTypeId && effectiveCheckInDate && effectiveCheckOutDate) {
        // Lấy phòng trống không trùng lịch cho khoảng ngày
        availableRooms = await roomApi.getAvailableRooms(
          effectiveRoomTypeId,
          effectiveCheckInDate,
          effectiveCheckOutDate
        );
      } else {
        // Fallback: lấy toàn bộ phòng AVAILABLE
        const allRooms = await roomApi.getAllRooms('AVAILABLE');
        availableRooms = (effectiveRoomTypeId && Array.isArray(allRooms))
          ? allRooms.filter(r => Number(r.roomTypeId) === Number(effectiveRoomTypeId))
          : (Array.isArray(allRooms) ? allRooms : []);
      }

      setRooms(availableRooms || []);
      if (availableRooms && availableRooms.length > 0) {
        setSelectedRoomId(String(availableRooms[0].id));
      } else {
        setSelectedRoomId('');
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách phòng trống", error);
      toastError("Không thể tải danh sách phòng khả dụng");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoomId || !effectiveBookingId) return;
    setProcessing(true);
    try {
      await bookingApi.assignRoom(effectiveBookingId, selectedRoomId);
      toastSuccess(isChangingRoom ? "Đổi phòng thành công!" : "Xếp phòng thành công!");
      if (onAssigned) onAssigned();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi xếp phòng");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isChangingRoom ? "Đổi phòng khách sạn" : "Xếp phòng khách sạn"}
      maxWidth="max-w-md"
    >
      <div className="p-1 space-y-4">
        {isChangingRoom && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
            <IoSwapHorizontalOutline className="text-amber-700 shrink-0" size={18} />
            <div>
              Phòng hiện tại: <strong className="text-amber-950 font-bold">P.{currentRoomNumber}</strong>
              <div className="text-[11px] text-amber-700">Chọn một phòng trống bên dưới để chuyển sang phòng mới:</div>
            </div>
          </div>
        )}

        <p className="text-body-md text-on-surface-variant text-xs leading-relaxed">
          {isChangingRoom
            ? "Danh sách phòng trống khả dụng (không bị trùng lịch trong thời gian lưu trú):"
            : "Chọn một phòng trống khả dụng để gán cho đơn đặt phòng này:"}
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-on-surface-variant">Đang tải danh sách phòng trống...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-5 text-center bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
            <IoAlertCircleOutline size={28} className="text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-red-800">
              Không có phòng trống nào phù hợp trong thời gian này!
            </p>
            <p className="text-[11px] text-red-600">
              Tất cả phòng thuộc hạng phòng này đã được đặt hoặc có khách ở trong thời gian nhận/trả phòng.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block font-label-md text-on-surface text-xs font-medium">
              Danh sách phòng trống khả dụng ({rooms.length} phòng)
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {rooms.map(room => {
                const isSelected = String(selectedRoomId) === String(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(String(room.id))}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border-grey bg-white hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}>
                        <IoBedOutline size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-on-surface">Phòng {room.roomNumber}</p>
                        <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                          Tầng {room.floor || '—'} • {room.roomTypeName || 'Tiêu chuẩn'} 
                          {room.maxCapacity && (
                            <>
                              <span>•</span>
                              <IoPersonOutline size={10} /> {room.maxCapacity} người
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={processing} size="sm">
            Hủy
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={rooms.length === 0 || !selectedRoomId || processing} 
            isLoading={processing}
            icon={IoCheckmarkOutline}
            size="sm"
          >
            {isChangingRoom ? "Xác nhận đổi phòng" : "Xác nhận xếp phòng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignRoomModal;


