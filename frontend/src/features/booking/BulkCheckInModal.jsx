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
import CameraQrScanner from '../../components/common/CameraQrScanner';
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

  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (isOpen && group) {
      setResultData(null);
      // Initialize rooms data based on confirmed assigned rooms in the group
      const assignableRooms = group.bookings?.filter(b => b.status === 'CONFIRMED' && b.roomId) || [];
      const initialRoomsData = assignableRooms.map((b, index) => {
        const status = b.roomStatus || 'AVAILABLE';
        const isReady = status === 'AVAILABLE';
        return {
          bookingId: b.id,
          roomNumber: String(b.roomNumber || ''),
          roomTypeName: b.roomTypeName,
          roomCapacity: b.roomCapacity,
          roomStatus: status,
          selected: isReady,
          guests: [{
            name: index === 0 ? (b.guestName || '') : '',
            idNumber: index === 0 ? (b.guestIdNumber || '') : '',
            phone: '',
            matched: false
          }]
        };
      });
      
      setRoomsData(initialRoomsData);
      setErrorMsg(initialRoomsData.length === 0 ? 'Không có phòng nào đủ điều kiện để nhận phòng theo đoàn.' : '');
      setActiveRoomIndex(null);
      setShowImportModal(false);
      setImportText('');
    }
  }, [isOpen, group]);

  useEffect(() => {
    if (!isOpen) {
      setActiveRoomIndex(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setActiveRoomIndex(null);
    onClose();
  };

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
        if (!updatedData[roomIndex].guests[guestIndex].name) {
          updatedData[roomIndex].guests[guestIndex].name = guest.name;
        }
        if (guest.phone && !updatedData[roomIndex].guests[guestIndex].phone) {
          updatedData[roomIndex].guests[guestIndex].phone = guest.phone;
        }
        setRoomsData(updatedData);
        toastSuccess(`Đã tự động điền thông tin khách: ${guest.name}`);
      }
    } catch (err) {
      // Ignore if guest not found
    }
  };

  const handleScanQrForActiveRoom = (parsedData, rawText) => {
    if (activeRoomIndex === null) return;
    const { idNumber, name } = parsedData;
    const targetId = idNumber || rawText?.trim() || '';
    const targetName = name || '';

    if (!targetId && !targetName) return;

    const newData = [...roomsData];
    const currentRoom = newData[activeRoomIndex];
    const guests = currentRoom.guests;
    
    // 1. Tìm dòng khách đã có số CCCD này từ trước
    let targetGuestIndex = guests.findIndex(g => g.idNumber && g.idNumber === targetId);

    // 2. Nếu chưa có, tìm dòng khách trùng tên và chưa có số CCCD
    if (targetGuestIndex === -1 && targetName) {
      targetGuestIndex = guests.findIndex(g => (!g.idNumber || !g.idNumber.trim()) && g.name && g.name.trim().toLowerCase() === targetName.trim().toLowerCase());
    }

    // 3. Nếu vẫn chưa có, tìm dòng khách đầu tiên chưa có số CCCD trong phòng này
    if (targetGuestIndex === -1) {
      targetGuestIndex = guests.findIndex(g => !g.idNumber || !g.idNumber.trim());
    }

    if (targetGuestIndex !== -1) {
      guests[targetGuestIndex] = {
        ...guests[targetGuestIndex],
        idNumber: targetId,
        name: targetName || guests[targetGuestIndex].name || '',
        matched: true
      };
      toastSuccess(`Đã cập nhật CCCD: ${targetName || targetId} (Phòng ${currentRoom.roomNumber})`);
    } else {
      targetGuestIndex = guests.length;
      guests.push({ name: targetName, idNumber: targetId, phone: '', matched: true });
      toastSuccess(`Đã quét thêm khách: ${targetName || targetId} vào Phòng ${currentRoom.roomNumber}`);
    }
    
    setRoomsData(newData);

    // Tự động đóng camera quét ngay khi nhận diện thành công cho phòng
    setActiveRoomIndex(null);

    if (targetId && /^\d{9,12}$/.test(targetId)) {
      fetchGuestInfo(targetId, activeRoomIndex, targetGuestIndex, newData);
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

  const handleToggleRoomSelect = (roomIdx) => {
    setRoomsData(prev => {
      const next = [...prev];
      next[roomIdx] = { ...next[roomIdx], selected: !next[roomIdx].selected };
      return next;
    });
  };

  const handleSelectAllReady = () => {
    setRoomsData(prev => prev.map(r => ({
      ...r,
      selected: r.roomStatus === 'AVAILABLE' || !r.roomStatus
    })));
  };

  const handleDeselectAll = () => {
    setRoomsData(prev => prev.map(r => ({ ...r, selected: false })));
  };

  const renderRoomStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Phòng sẵn sàng</span>;
      case 'DIRTY':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800" title="Chưa dọn xong - Hãy giục buồng phòng">Cần dọn (Chưa sẵn sàng)</span>;
      case 'INSPECTING':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" title="Chờ kiểm tra phòng">Chờ kiểm tra</span>;
      case 'MAINTENANCE':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">Đang bảo trì</span>;
      case 'OCCUPIED':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">Đang có khách</span>;
      default:
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{status || 'N/A'}</span>;
    }
  };

  const handleSubmit = async () => {
    const selectedRooms = roomsData.filter(r => r.selected);
    if (selectedRooms.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một phòng sẵn sàng để nhận phòng.');
      return;
    }

    const notReady = selectedRooms.filter(r => r.roomStatus && r.roomStatus !== 'AVAILABLE');
    if (notReady.length > 0) {
      setErrorMsg(`Phòng ${notReady.map(r => r.roomNumber).join(', ')} chưa dọn xong/sẵn sàng. Hãy bỏ chọn hoặc giục buồng phòng.`);
      return;
    }

    const payloadRooms = [];
    for (let r = 0; r < selectedRooms.length; r++) {
      const room = selectedRooms[r];
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
        if (g.idNumber && g.idNumber.trim()) {
          const cleanId = g.idNumber.trim();
          if (cleanId.length < 6 || cleanId.length > 20) {
            setErrorMsg(`Số CCCD/CMND của khách '${g.name}' tại Phòng ${room.roomNumber} không hợp lệ (từ 6-20 ký tự).`);
            return;
          }
        }
      }
      
      payloadRooms.push({
        bookingId: room.bookingId,
        guests: validGuests.map(g => ({
          name: g.name.trim(),
          idNumber: g.idNumber?.trim() || null,
          phone: g.phone?.trim() || null
        }))
      });
    }

    setProcessing(true);
    setErrorMsg('');
    try {
      const res = await bookingApi.bulkCheckIn({ rooms: payloadRooms });
      setResultData(res);
      if (res.successfulRooms?.length > 0) {
        toastSuccess(`Đã nhận phòng thành công cho ${res.successfulRooms.length} phòng!`);
      }
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

  const readyCount = roomsData.filter(r => r.roomStatus === 'AVAILABLE' || !r.roomStatus).length;
  const selectedCount = roomsData.filter(r => r.selected).length;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Nhận phòng đoàn" maxWidth="max-w-4xl">
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 sticky top-0 z-10">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultData ? (
            /* Màn hình kết quả sau khi nhận phòng */
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800 font-bold text-base mb-1">
                  <IoCheckmarkCircleOutline size={22} className="text-green-600" />
                  <span>Kết quả nhận phòng đoàn</span>
                </div>
                <p className="text-sm text-green-700">
                  Đã nhận thành công: <strong>{resultData.successfulRooms?.length || 0}</strong> / {resultData.totalRequested || 0} phòng.
                </p>
                {resultData.failedRooms?.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Có <strong>{resultData.failedRooms.length}</strong> phòng chưa thể nhận (bị chặn).
                  </p>
                )}
              </div>

              {/* Cảnh báo thiếu CCCD theo QTN khai báo lưu trú */}
              {resultData.missingDocumentRoomCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 text-sm">
                  <IoAlertCircleOutline size={22} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Nhắc nhở khai báo lưu trú:</div>
                    <div>
                      Có <strong>{resultData.missingDocumentRoomCount}</strong> phòng chưa khai báo số CCCD/giấy tờ tùy thân cho khách. Vui lòng bổ sung giấy tờ trước khi xuất tờ khai lưu trú nộp cơ quan công an!
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách phòng đã nhận */}
              {resultData.successfulRooms?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                    Phòng đã nhận thành công:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {resultData.successfulRooms.map((b) => (
                      <div key={b.id} className="p-2.5 bg-surface-container-low border border-border-grey rounded-lg text-sm">
                        <div className="font-bold text-on-surface">Phòng {b.roomNumber}</div>
                        <div className="text-xs text-on-surface-variant">{b.roomTypeName}</div>
                        <div className="text-xs text-green-600 font-medium mt-1">Đã nhận phòng ✓</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách phòng thất bại */}
              {resultData.failedRooms?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                    Phòng không thể nhận:
                  </h4>
                  <div className="space-y-2">
                    {resultData.failedRooms.map((f, idx) => (
                      <div key={idx} className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm">
                        <span className="font-bold text-red-800">Phòng {f.roomNumber}: </span>
                        <span className="text-red-700">{f.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border-grey">
                <Button variant="primary" onClick={handleClose}>
                  Đã hiểu & Đóng
                </Button>
              </div>
            </div>
          ) : (
            /* Màn hình form nhận phòng */
            <>
              {/* Quick Header Info & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-container-low border border-border-grey rounded-lg">
                <div className="text-sm text-on-surface">
                  <span className="font-semibold text-primary">{group.representativeName}</span>
                  <span className="text-on-surface-variant mx-2">•</span>
                  <span>{readyCount}/{roomsData.length} phòng sẵn sàng</span>
                  <span className="text-on-surface-variant mx-2">•</span>
                  <span className="text-primary font-medium">Đã chọn {selectedCount} phòng</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleSelectAllReady} className="border-border-grey text-xs">
                    Chọn tất cả phòng sẵn sàng
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDeselectAll} className="text-xs">
                    Bỏ chọn tất cả
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={IoCopyOutline}
                    onClick={handleCopyRepresentativeToAllRooms}
                    className="border-primary/40 text-primary hover:bg-primary/5 text-xs"
                    title="Sao chép thông tin người đại diện cho tất cả các phòng trong đoàn"
                  >
                    Sao chép người đại diện
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={IoCloudUploadOutline}
                    onClick={() => {
                      setImportText('');
                      setImportError('');
                      setShowImportModal(true);
                    }}
                    className="border-primary/40 text-primary hover:bg-primary/5 text-xs"
                  >
                    Nhập từ Excel
                  </Button>
                </div>
              </div>

              {/* Active QR scanner box if opened */}
              {activeRoomIndex !== null && (
                <div className="p-3 bg-primary/5 border border-primary/30 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center text-sm font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <IoQrCodeOutline size={18} /> Đang quét mã QR cho Phòng {roomsData[activeRoomIndex]?.roomNumber}
                    </span>
                    <button 
                      onClick={() => setActiveRoomIndex(null)}
                      className="text-xs text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container"
                      title="Đóng quét QR"
                    >
                      <IoCloseOutline size={20} />
                    </button>
                  </div>
                  <CameraQrScanner 
                    onScan={handleScanQrForActiveRoom}
                    placeholder="Dán hoặc dùng máy quét bắn mã QR CCCD vào đây..."
                    autoStopOnScan={false}
                  />
                </div>
              )}

              {/* Rooms and Guests Table */}
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {roomsData.map((room, roomIdx) => {
                  const isReady = room.roomStatus === 'AVAILABLE' || !room.roomStatus;
                  return (
                    <div 
                      key={room.bookingId} 
                      className={`p-4 rounded-xl border transition-all ${
                        activeRoomIndex === roomIdx 
                          ? 'border-primary bg-primary/5 shadow-xs' 
                          : !isReady
                          ? 'border-red-200 bg-red-50/20 opacity-80'
                          : 'border-border-grey bg-surface'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-border-grey/60">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={room.selected}
                            disabled={!isReady}
                            onChange={() => handleToggleRoomSelect(roomIdx)}
                            className="rounded border-border-grey text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            title={!isReady ? 'Phòng chưa sẵn sàng đón khách' : 'Chọn để nhận phòng'}
                          />
                          <span className="font-bold text-base text-on-surface">
                            Phòng {room.roomNumber}
                          </span>
                          <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                            {room.roomTypeName}
                          </span>
                          {renderRoomStatusBadge(room.roomStatus)}
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

                      {!isReady && (
                        <div className="mb-2 p-2 bg-red-100/70 text-red-800 text-xs rounded-lg flex items-center gap-1.5 font-medium">
                          <IoAlertCircleOutline size={16} className="shrink-0" />
                          <span>Phòng chưa dọn xong hoặc đang chờ kiểm tra. Vui lòng giục bộ phận Buồng phòng trước khi nhận phòng.</span>
                        </div>
                      )}

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
                                  placeholder="Số CCCD / Hộ chiếu (12 số)"
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
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-grey">
                <div className="text-xs text-on-surface-variant">
                  Đã chọn <strong>{selectedCount}</strong> phòng. Những phòng chưa chọn hoặc chưa sẵn sàng có thể nhận bổ sung sau.
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleClose} disabled={processing} icon={IoCloseOutline}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    icon={IoCheckmarkCircleOutline}
                    onClick={handleSubmit}
                    isLoading={processing}
                    disabled={selectedCount === 0 || processing}
                  >
                    Xác nhận Nhận phòng ({selectedCount} phòng)
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* P1.3: Modal Import danh sách khách */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Nhập danh sách khách đoàn từ văn bản / Excel"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs whitespace-pre-line">
              {importError}
            </div>
          )}

          <div className="text-xs text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface">Định dạng hỗ trợ (Sao chép từ Excel hoặc dán văn bản):</p>
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
