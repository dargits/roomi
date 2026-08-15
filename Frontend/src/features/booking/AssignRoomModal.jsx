import React, { useState, useEffect } from 'react';
import { IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { roomApi } from '../../services/roomApi';
import bookingApi from '../../services/bookingApi';

const AssignRoomModal = ({ isOpen, onClose, bookingId, roomTypeId, onAssigned }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Gọi API lấy toàn bộ phòng AVAILABLE
      const allRooms = await roomApi.getAllRooms('AVAILABLE');
      // Lọc các phòng khớp với roomTypeId của booking
      const suitableRooms = allRooms.filter(r => r.roomTypeId === roomTypeId);
      setRooms(suitableRooms);
      if (suitableRooms.length > 0) {
        setSelectedRoomId(suitableRooms[0].id);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách phòng trống", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoomId) return;
    setProcessing(true);
    try {
      await bookingApi.assignRoom(bookingId, selectedRoomId);
      onAssigned();
      onClose();
    } catch (error) {
      alert("Lỗi xếp phòng: " + (error.response?.data?.message || "Đã xảy ra lỗi"));
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xếp Phòng Khách Sạn" maxWidth="max-w-md">
      <div className="p-2">
        <p className="text-body-md text-on-surface-variant mb-4">
          Vui lòng chọn một phòng trống phù hợp với loại phòng khách đã đặt.
        </p>

        {loading ? (
          <div className="text-center p-4">Đang tải danh sách phòng...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center p-4 text-error bg-red-50 rounded border border-red-100">
            Không có phòng trống nào thuộc loại phòng này!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-label-md text-on-surface mb-2">Chọn phòng trống</label>
              <select 
                value={selectedRoomId} 
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    Phòng {room.roomNumber} - {room.floor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={processing}>Hủy</Button>
          <Button 
            onClick={handleAssign} 
            disabled={rooms.length === 0 || !selectedRoomId || processing} 
            isLoading={processing}
            icon={IoCheckmarkOutline}
          >
            Lưu
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignRoomModal;
