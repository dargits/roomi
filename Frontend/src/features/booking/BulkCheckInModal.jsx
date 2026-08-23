import React, { useState, useEffect, useRef } from 'react';
import { 
  IoCloseOutline, 
  IoCheckmarkCircleOutline, 
  IoPersonAddOutline, 
  IoTrashOutline,
  IoQrCodeOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import guestApi from '../../services/guestApi';
import { useToast } from '../../context/ToastContext';

const BulkCheckInModal = ({ isOpen, onClose, group, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [roomsData, setRoomsData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // QR Scan state for the active room
  const [activeRoomIndex, setActiveRoomIndex] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && group) {
      // Initialize rooms data based on confirmed assigned rooms in the group
      const assignableRooms = group.bookings?.filter(b => b.status === 'CONFIRMED' && b.roomId) || [];
      const initialRoomsData = assignableRooms.map(b => ({
        bookingId: b.id,
        roomNumber: b.roomNumber,
        roomTypeName: b.roomTypeName,
        guests: [{ name: b.guestName || '', idNumber: b.guestIdNumber || '' }]
      }));
      
      setRoomsData(initialRoomsData);
      setErrorMsg(initialRoomsData.length === 0 ? 'Không có phòng nào đủ điều kiện để nhận phòng theo đoàn.' : '');
      setActiveRoomIndex(null);
      setQrInput('');
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (activeRoomIndex !== null && qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, [activeRoomIndex]);

  const handleAddGuest = (roomIndex) => {
    const newData = [...roomsData];
    newData[roomIndex].guests.push({ name: '', idNumber: '' });
    setRoomsData(newData);
  };

  const handleRemoveGuest = (roomIndex, guestIndex) => {
    const newData = [...roomsData];
    newData[roomIndex].guests.splice(guestIndex, 1);
    setRoomsData(newData);
  };

  const handleGuestChange = (roomIndex, guestIndex, field, value) => {
    const newData = [...roomsData];
    newData[roomIndex].guests[guestIndex][field] = value;
    setRoomsData(newData);
    
    // Auto-fill on exactly 12 digits
    if (field === 'idNumber' && value.length === 12 && /^\d{12}$/.test(value)) {
      fetchGuestInfo(value, roomIndex, guestIndex, newData);
    }
  };

  const fetchGuestInfo = async (idNumber, roomIndex, guestIndex, currentData) => {
    try {
      const guest = await guestApi.getGuestByIdNumber(idNumber);
      if (guest && guest.name) {
        const updatedData = [...currentData];
        updatedData[roomIndex].guests[guestIndex].name = guest.name;
        setRoomsData(updatedData);
        toastSuccess(`Đã tự động điền thông tin khách: ${guest.name}`);
      }
    } catch (err) {
      // Ignore if guest not found
    }
  };

  const handleQrInput = (e) => {
    const value = e.target.value;
    setQrInput(value);
    
    if (value.includes('|') && activeRoomIndex !== null) {
      const parts = value.split('|');
      if (parts.length >= 3) {
        const idNumber = parts[0];
        const name = parts[2];
        
        const newData = [...roomsData];
        const guests = newData[activeRoomIndex].guests;
        
        // Find empty slot or add new
        const emptyIndex = guests.findIndex(g => !g.name && !g.idNumber);
        if (emptyIndex !== -1) {
          guests[emptyIndex] = { name, idNumber };
        } else {
          guests.push({ name, idNumber });
        }
        
        setRoomsData(newData);
        toastSuccess(`Đã quét mã QR cho khách: ${name} vào Phòng ${newData[activeRoomIndex].roomNumber}`);
        setQrInput(''); // Reset for next scan
      }
    }
  };

  const handleSubmit = async () => {
    // Validate
    const payloadRooms = [];
    
    for (let r = 0; r < roomsData.length; r++) {
      const room = roomsData[r];
      const validGuests = room.guests.filter(g => g.name.trim() || g.idNumber.trim());
      
      if (validGuests.length === 0) {
        setErrorMsg(`Phòng ${room.roomNumber} chưa có thông tin khách lưu trú.`);
        return;
      }
      
      for (let i = 0; i < validGuests.length; i++) {
        const g = validGuests[i];
        if (!g.name.trim()) {
          setErrorMsg(`Vui lòng nhập Họ tên khách thứ ${i + 1} tại Phòng ${room.roomNumber}.`);
          return;
        }
        if (!g.idNumber || !g.idNumber.trim()) {
          setErrorMsg(`Vui lòng nhập số CCCD/CMND cho khách '${g.name}' tại Phòng ${room.roomNumber}.`);
          return;
        }
        if (g.idNumber.trim().length > 12) {
          setErrorMsg(`Số CCCD/CMND của khách '${g.name}' tại Phòng ${room.roomNumber} quá dài (tối đa 12 số).`);
          return;
        }
        if (!/^\d{9,12}$/.test(g.idNumber.trim())) {
          setErrorMsg(`Số CCCD/CMND của khách '${g.name}' tại Phòng ${room.roomNumber} không hợp lệ (phải từ 9-12 chữ số).`);
          return;
        }
      }
      
      payloadRooms.push({
        bookingId: room.bookingId,
        guests: validGuests
      });
    }

    if (payloadRooms.length === 0) {
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    try {
      await bookingApi.bulkCheckIn({ rooms: payloadRooms });
      toastSuccess(`Đã nhận phòng đoàn thành công cho ${payloadRooms.length} phòng!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Bulk check-in error:", error);
      setErrorMsg(error.response?.data?.message || "Lỗi khi nhận phòng đoàn. Vui lòng thử lại.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhận phòng đoàn (Bulk Check-in)" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 sticky top-0 z-10">
            <IoAlertCircleOutline size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-surface-container-low p-4 rounded-lg flex justify-between border border-border-grey items-center">
          <div>
            <div className="text-on-surface-variant text-sm">Đoàn khách:</div>
            <div className="font-semibold text-on-surface text-lg">{group.representativeName}</div>
          </div>
          <div className="text-right">
            <div className="text-on-surface-variant text-sm">Tổng số phòng nhận:</div>
            <div className="font-bold text-primary text-xl">{roomsData.length} phòng</div>
          </div>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-4">
          {roomsData.length === 0 && !errorMsg && (
            <div className="text-center py-8 text-on-surface-variant">
              Không có phòng nào đủ điều kiện để nhận phòng. (Các phòng cần được gán phòng và ở trạng thái Đã xác nhận)
            </div>
          )}

          {roomsData.map((room, rIndex) => (
            <div key={room.bookingId} className="border border-border-grey rounded-lg overflow-hidden">
              <div className="bg-surface-container-low px-4 py-3 border-b border-border-grey flex justify-between items-center">
                <div>
                  <span className="font-bold text-primary">Phòng {room.roomNumber}</span>
                  <span className="text-on-surface-variant text-sm ml-2">({room.roomTypeName})</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setActiveRoomIndex(activeRoomIndex === rIndex ? null : rIndex)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${activeRoomIndex === rIndex ? 'bg-primary text-white border-primary' : 'bg-surface-container border-border-grey text-on-surface hover:bg-surface-container-high'}`}
                  >
                    <IoQrCodeOutline size={14} /> {activeRoomIndex === rIndex ? 'Đóng quét QR' : 'Quét QR'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleAddGuest(rIndex)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <IoPersonAddOutline size={14} /> Thêm khách
                  </button>
                </div>
              </div>

              <div className="p-4 bg-surface-container-lowest">
                {activeRoomIndex === rIndex && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg relative overflow-hidden">
                    <div className="text-xs text-blue-800 mb-2 font-medium flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                      Vui lòng đặt con trỏ vào ô bên dưới và quét mã QR để thêm khách vào <strong>Phòng {room.roomNumber}</strong>
                    </div>
                    <input
                      ref={qrInputRef}
                      type="text"
                      value={qrInput}
                      onChange={handleQrInput}
                      placeholder="Dữ liệu mã QR sẽ xuất hiện ở đây..."
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {room.guests.map((guest, gIndex) => (
                    <div key={gIndex} className="flex gap-3 items-start relative group">
                      <div className="font-medium text-on-surface-variant pt-2.5 w-6 text-center text-sm">{gIndex + 1}.</div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={guest.name}
                            onChange={(e) => handleGuestChange(rIndex, gIndex, 'name', e.target.value)}
                            placeholder="Họ và tên khách"
                            className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={guest.idNumber}
                            onChange={(e) => handleGuestChange(rIndex, gIndex, 'idNumber', e.target.value)}
                            placeholder="Số CCCD (12 số)"
                            className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                          />
                        </div>
                      </div>
                      {room.guests.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveGuest(rIndex, gIndex)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-red-50 rounded-md transition-colors mt-0.5"
                          title="Xóa khách này"
                        >
                          <IoTrashOutline size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={processing} icon={IoCloseOutline}>
            Đóng
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={processing || roomsData.length === 0} 
            icon={IoCheckmarkCircleOutline}
          >
            {processing ? 'Đang xử lý...' : `Nhận phòng cho ${roomsData.length} phòng`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkCheckInModal;
