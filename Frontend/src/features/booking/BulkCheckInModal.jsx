import React, { useState, useEffect, useRef } from 'react';
import { 
  IoCloseOutline, 
  IoCheckmarkCircleOutline, 
  IoPersonAddOutline, 
  IoTrashOutline,
  IoQrCodeOutline,
  IoAlertCircleOutline,
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoShieldCheckmarkOutline,
  IoCopyOutline,
  IoPersonOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingApi from '../../services/bookingApi';
import guestApi from '../../services/guestApi';
import { useToast } from '../../context/ToastContext';

const BulkCheckInModal = ({ isOpen, onClose, group, onSuccess }) => {
  const { toastSuccess, toastError, toastWarning } = useToast();
  const [roomsData, setRoomsData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // QR Scan state for the active room
  const [activeRoomIndex, setActiveRoomIndex] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  // Import modal state (P1.3)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const handleCopyRepresentativeToAllRooms = () => {
    if (!roomsData || roomsData.length === 0) return;

    // Lấy thông tin từ khách ở dòng đầu tiên đang hiển thị trên form, nếu trống mới fallback sang group
    const firstGuestInput = roomsData[0]?.guests?.[0];
    const repName = firstGuestInput?.name?.trim() || group?.representativeName?.trim() || group?.bookings?.[0]?.guestName?.trim() || '';
    const repId = firstGuestInput?.idNumber?.trim() || group?.representativeIdNumber?.trim() || group?.bookings?.[0]?.guestIdNumber?.trim() || '';
    const repPhone = firstGuestInput?.phone?.trim() || group?.representativePhone?.trim() || group?.bookings?.[0]?.guestPhone?.trim() || '';
    const isMatched = firstGuestInput?.matched || false;

    if (!repName && !repId) {
      toastWarning('Vui lòng nhập họ tên hoặc số CCCD ở phòng đầu tiên để sao chép.');
      return;
    }

    const updatedData = roomsData.map((room, idx) => {
      if (idx === 0) return room; // Giữ nguyên dòng đầu
      const firstGuest = {
        name: repName,
        idNumber: repId,
        phone: repPhone,
        matched: isMatched,
      };
      return {
        ...room,
        guests: [firstGuest, ...room.guests.slice(1)],
      };
    });

    setRoomsData(updatedData);
    toastSuccess(`Đã sao chép thông tin (Tên: ${repName || '—'}${repId ? ', CCCD: ' + repId : ''}) cho tất cả ${roomsData.length} phòng!`);
  };

  useEffect(() => {
    if (isOpen && group) {
      // Initialize rooms data based on confirmed assigned rooms in the group
      const assignableRooms = group.bookings?.filter(b => b.status === 'CONFIRMED' && b.roomId) || [];
      const initialRoomsData = assignableRooms.map((b, index) => ({
        bookingId: b.id,
        roomNumber: String(b.roomNumber || ''),
        roomTypeName: b.roomTypeName,
        roomCapacity: b.roomCapacity,
        guests: [{
          name: index === 0 ? (b.guestName || '') : '',
          idNumber: index === 0 ? (b.guestIdNumber || '') : '',
          phone: '',
          matched: false
        }]
      }));
      
      setRoomsData(initialRoomsData);
      setErrorMsg(initialRoomsData.length === 0 ? 'Không có phòng nào đủ điều kiện để nhận phòng theo đoàn.' : '');
      setActiveRoomIndex(null);
      setQrInput('');
      setShowImportModal(false);
      setImportText('');
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (activeRoomIndex !== null && qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, [activeRoomIndex]);

  const handleAddGuest = (roomIndex) => {
    const newData = [...roomsData];
    newData[roomIndex].guests.push({ name: '', idNumber: '', phone: '', matched: false });
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
    newData[roomIndex].guests[guestIndex].matched = false;
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
        if (guest.phone) updatedData[roomIndex].guests[guestIndex].phone = guest.phone;
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
        const idNumber = parts[0]?.trim();
        const name = parts[2]?.trim();
        
        const newData = [...roomsData];
        const guests = newData[activeRoomIndex].guests;
        
        // Check if there is an existing guest to match or empty slot
        const existingIndex = guests.findIndex(g => g.idNumber === idNumber || (!g.idNumber && g.name === name));
        if (existingIndex !== -1) {
          guests[existingIndex].name = name;
          guests[existingIndex].idNumber = idNumber;
          guests[existingIndex].matched = true;
          toastSuccess(`Đã đối chiếu khớp CCCD: ${name} (Phòng ${newData[activeRoomIndex].roomNumber})`);
        } else {
          const emptyIndex = guests.findIndex(g => !g.name && !g.idNumber);
          if (emptyIndex !== -1) {
            guests[emptyIndex] = { name, idNumber, phone: '', matched: true };
          } else {
            guests.push({ name, idNumber, phone: '', matched: true });
          }
          toastSuccess(`Đã quét mã QR cho khách: ${name} vào Phòng ${newData[activeRoomIndex].roomNumber}`);
        }
        
        setRoomsData(newData);
        setQrInput(''); // Reset for next scan
      }
    }
  };

  // P1.3: Xử lý import danh sách khách
  const handleProcessImport = () => {
    if (!importText.trim()) {
      setImportError('Vui lòng dán nội dung danh sách khách.');
      return;
    }

    const lines = importText.trim().split('\n');
    const updatedRoomsData = roomsData.map(r => ({
      ...r,
      guests: r.guests.filter(g => g.name || g.idNumber).length > 0 ? [...r.guests] : []
    }));

    let importedCount = 0;
    const errors = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().includes('số phòng')) return;

      // Hỗ trợ dấu phẩy, chấm phẩy, tab hoặc gạch đứng
      const delimiter = trimmed.includes('\t') ? '\t' : trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : ',';
      const parts = trimmed.split(delimiter).map(p => p.trim());

      if (parts.length < 2) {
        errors.push(`Dòng ${lineIdx + 1}: Không đủ thông tin (cần ít nhất Số phòng và Họ tên).`);
        return;
      }

      const roomNumber = parts[0].replace(/^P\./i, '').trim();
      const guestName = parts[1];
      const idNumber = parts[2] || '';
      const phone = parts[3] || '';

      const targetRoom = updatedRoomsData.find(r => r.roomNumber === roomNumber);
      if (!targetRoom) {
        errors.push(`Dòng ${lineIdx + 1}: Phòng ${roomNumber} không có trong danh sách đoàn.`);
        return;
      }

      if (idNumber && !/^\d{9,12}$/.test(idNumber)) {
        errors.push(`Dòng ${lineIdx + 1}: Số CCCD '${idNumber}' của khách ${guestName} không hợp lệ (phải từ 9-12 số).`);
        return;
      }

      // Thêm vào phòng
      targetRoom.guests.push({
        name: guestName,
        idNumber,
        phone,
        matched: false
      });
      importedCount++;
    });

    if (errors.length > 0) {
      setImportError(errors.join('\n'));
      return;
    }

    // Đảm bảo mỗi phòng có ít nhất 1 slot
    updatedRoomsData.forEach(r => {
      if (r.guests.length === 0) {
        r.guests.push({ name: '', idNumber: '', phone: '', matched: false });
      }
    });

    setRoomsData(updatedRoomsData);
    setShowImportModal(false);
    toastSuccess(`Đã nhập thành công ${importedCount} khách vào danh sách các phòng!`);
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
        const cleanId = g.idNumber.trim();
        if (cleanId.length < 6 || cleanId.length > 20) {
          setErrorMsg(`Số CCCD/CMND/Hộ chiếu của khách '${g.name}' tại Phòng ${room.roomNumber} không hợp lệ (từ 6-20 ký tự).`);
          return;
        }
      }
      
      payloadRooms.push({
        bookingId: room.bookingId,
        guests: validGuests.map(g => ({
          name: g.name.trim(),
          idNumber: g.idNumber.trim(),
          phone: g.phone?.trim() || null
        }))
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
      const resData = error.response?.data;
      let msg = resData?.message;
      if (!msg && resData && typeof resData === 'object') {
        const firstVal = Object.values(resData)[0];
        if (typeof firstVal === 'string') msg = firstVal;
      }
      setErrorMsg(msg || "Lỗi khi nhận phòng đoàn. Vui lòng kiểm tra lại thông tin khách lưu trú.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Nhận phòng đoàn (Bulk Check-in)" maxWidth="max-w-4xl">
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 sticky top-0 z-10">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Header Info & Import Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-container-low border border-border-grey rounded-lg">
            <div className="text-sm text-on-surface">
              <span className="font-semibold text-primary">{group.representativeName}</span>
              <span className="text-on-surface-variant mx-2">•</span>
              <span>{roomsData.length} phòng đã sẵn sàng</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={IoCopyOutline}
                onClick={handleCopyRepresentativeToAllRooms}
                className="border-primary/40 text-primary hover:bg-primary/5"
                title="Sao chép thông tin người đại diện cho tất cả các phòng trong đoàn"
              >
                Sao chép người đại diện cho tất cả phòng
              </Button>

              {/* P1.3: Nút Import danh sách */}
              <Button
                size="sm"
                variant="outline"
                icon={IoCloudUploadOutline}
                onClick={() => {
                  setImportText('');
                  setImportError('');
                  setShowImportModal(true);
                }}
                className="border-primary/40 text-primary hover:bg-primary/5"
              >
                Nhập danh sách (CSV / Excel)
              </Button>
            </div>
          </div>

          {/* Active QR scanner box if opened */}
          {activeRoomIndex !== null && (
            <div className="p-4 bg-primary/5 border border-primary/30 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <IoQrCodeOutline size={18} /> Đang quét mã QR cho Phòng {roomsData[activeRoomIndex]?.roomNumber}
                </span>
                <button 
                  onClick={() => setActiveRoomIndex(null)}
                  className="text-xs text-on-surface-variant hover:text-on-surface p-1"
                >
                  <IoCloseOutline size={20} />
                </button>
              </div>
              <input 
                ref={qrInputRef}
                type="text" 
                value={qrInput}
                onChange={handleQrInput}
                placeholder="Đặt con trỏ vào đây và quét mã QR trên thẻ CCCD..."
                className="w-full p-2.5 bg-surface border border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-on-surface-variant italic">
                * Dùng máy quét QR bắn vào ô trên. Thông tin sẽ tự động điền vào danh sách khách bên dưới.
              </p>
            </div>
          )}

          {/* Rooms and Guests Table */}
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {roomsData.map((room, roomIdx) => (
              <div 
                key={room.bookingId} 
                className={`p-4 rounded-xl border transition-all ${
                  activeRoomIndex === roomIdx 
                    ? 'border-primary bg-primary/5 shadow-xs' 
                    : 'border-border-grey bg-surface'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-border-grey/60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-on-surface">
                      Phòng {room.roomNumber}
                    </span>
                    <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                      {room.roomTypeName}
                    </span>
                    {room.roomCapacity && (
                      <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded flex items-center gap-1">
                        <IoPersonOutline size={12} /> {room.roomCapacity} người
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRoomIndex(activeRoomIndex === roomIdx ? null : roomIdx)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        activeRoomIndex === roomIdx
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low text-primary border-primary/30 hover:bg-primary/5'
                      }`}
                    >
                      <IoQrCodeOutline size={14} /> Quét QR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddGuest(roomIdx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-on-surface hover:bg-surface-container border border-border-grey"
                    >
                      <IoPersonAddOutline size={14} /> Thêm khách
                    </button>
                  </div>
                </div>

                {/* Guests list for this room */}
                <div className="space-y-2.5">
                  {room.guests.map((guest, guestIdx) => (
                    <div key={guestIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-5">
                        <Input 
                          placeholder="Họ và tên khách *"
                          value={guest.name}
                          onChange={(e) => handleGuestChange(roomIdx, guestIdx, 'name', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-6 flex items-center gap-1.5">
                        <div className="flex-1 relative">
                          <Input 
                            placeholder="Số CCCD / Hộ chiếu (12 số) *"
                            value={guest.idNumber}
                            maxLength={12}
                            onChange={(e) => handleGuestChange(roomIdx, guestIdx, 'idNumber', e.target.value)}
                          />
                        </div>
                        {guest.matched && (
                          <span title="Đã đối chiếu khớp thẻ CCCD" className="text-green-600 shrink-0">
                            <IoShieldCheckmarkOutline size={20} />
                          </span>
                        )}
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {room.guests.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGuest(roomIdx, guestIdx)}
                            className="p-2 text-on-surface-variant hover:text-red-600 rounded"
                            title="Xóa khách"
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose} disabled={processing} icon={IoCloseOutline}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={IoCheckmarkCircleOutline}
              onClick={handleSubmit}
              isLoading={processing}
              disabled={roomsData.length === 0 || processing}
            >
              Xác nhận Nhận phòng ({roomsData.length} phòng)
            </Button>
          </div>
        </div>
      </Modal>

      {/* P1.3: Modal Import danh sách khách */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Nhập danh sách khách đoàn (Paste / CSV)"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs whitespace-pre-line">
              {importError}
            </div>
          )}

          <div className="text-xs text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface">Định dạng hỗ trợ (Copy từ Excel hoặc dán văn bản):</p>
            <div className="p-2.5 bg-surface-container-low rounded border border-border-grey font-mono text-[11px]">
              Số phòng, Họ tên, Số CCCD, SĐT<br />
              101, Nguyễn Văn A, 001099001234, 0912345678<br />
              102, Trần Thị B, 001099005678, 0987654321
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Dán nội dung danh sách khách vào đây:
            </label>
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Dán nội dung các dòng khách tại đây..."
              className="w-full p-3 bg-surface border border-border-grey rounded-lg text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setShowImportModal(false)} icon={IoCloseOutline}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={IoCloudUploadOutline}
              onClick={handleProcessImport}
            >
              Áp dụng danh sách
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkCheckInModal;
