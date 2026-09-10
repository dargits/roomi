import React, { useState, useEffect } from 'react';
import { 
  IoCheckmarkCircleOutline, 
  IoPersonAddOutline, 
  IoTrashOutline, 
  IoQrCodeOutline, 
  IoAlertCircleOutline, 
  IoCloudUploadOutline, 
  IoCopyOutline 
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import CameraQrScanner from '../../components/common/CameraQrScanner';
import bookingApi from '../../services/bookingApi';
import guestApi from '../../services/guestApi';
import { useToast } from '../../context/ToastContext';
import { GroupBookingResponse, RoomStatus } from '../../types';

interface RoomGuestItem {
  name: string;
  idNumber: string;
  phone: string;
  matched?: boolean;
}

interface BulkRoomData {
  bookingId: number;
  roomNumber: string;
  roomTypeName?: string;
  roomCapacity?: number;
  roomStatus?: RoomStatus | string;
  selected: boolean;
  guests: RoomGuestItem[];
}

interface BulkCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupBookingResponse | any;
  onSuccess?: () => void;
}

const BulkCheckInModal: React.FC<BulkCheckInModalProps> = ({ isOpen, onClose, group, onSuccess }) => {
  const { toastSuccess, toastWarning } = useToast();
  const [roomsData, setRoomsData] = useState<BulkRoomData[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // QR Scan state for the active room
  const [activeRoomIndex, setActiveRoomIndex] = useState<number | null>(null);

  // Import modal state (P1.3)
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [resultData, setResultData] = useState<any>(null);

  const handleCopyRepresentativeToAllRooms = () => {
    if (!roomsData || roomsData.length === 0) return;

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
      if (idx === 0) return room;
      const firstGuest: RoomGuestItem = {
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
      setResultData(null);
      const assignableRooms = group.bookings?.filter((b: any) => b.status === 'CONFIRMED' && b.roomId) || [];
      const initialRoomsData: BulkRoomData[] = assignableRooms.map((b: any, index: number) => {
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

  const handleAddGuest = (roomIndex: number) => {
    const newData = [...roomsData];
    newData[roomIndex].guests.push({ name: '', idNumber: '', phone: '', matched: false });
    setRoomsData(newData);
  };

  const handleRemoveGuest = (roomIndex: number, guestIndex: number) => {
    const newData = [...roomsData];
    newData[roomIndex].guests.splice(guestIndex, 1);
    setRoomsData(newData);
  };

  const handleGuestChange = (roomIndex: number, guestIndex: number, field: keyof RoomGuestItem, value: any) => {
    const newData = [...roomsData];
    (newData[roomIndex].guests[guestIndex] as any)[field] = value;
    newData[roomIndex].guests[guestIndex].matched = false;
    setRoomsData(newData);
    
    if (field === 'idNumber' && typeof value === 'string' && value.length === 12 && /^\d{12}$/.test(value)) {
      fetchGuestInfo(value, roomIndex, guestIndex, newData);
    }
  };

  const fetchGuestInfo = async (idNumber: string, roomIndex: number, guestIndex: number, currentData: BulkRoomData[]) => {
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
    } catch {
      // Ignore if guest not found
    }
  };

  const handleScanQrForActiveRoom = (parsedData: any, rawText?: string) => {
    if (activeRoomIndex === null) return;
    const { idNumber, name } = parsedData || {};
    const targetId = idNumber || rawText?.trim() || '';
    const targetName = name || '';

    if (!targetId && !targetName) return;

    const newData = [...roomsData];
    const currentRoom = newData[activeRoomIndex];
    const guests = currentRoom.guests;
    
    let targetGuestIndex = guests.findIndex(g => g.idNumber && g.idNumber === targetId);

    if (targetGuestIndex === -1 && targetName) {
      targetGuestIndex = guests.findIndex(g => (!g.idNumber || !g.idNumber.trim()) && g.name && g.name.trim().toLowerCase() === targetName.trim().toLowerCase());
    }

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
    setActiveRoomIndex(null);

    if (targetId && /^\d{9,12}$/.test(targetId)) {
      fetchGuestInfo(targetId, activeRoomIndex, targetGuestIndex, newData);
    }
  };

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
    const errors: string[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().includes('số phòng')) return;

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

    updatedRoomsData.forEach(r => {
      if (r.guests.length === 0) {
        r.guests.push({ name: '', idNumber: '', phone: '', matched: false });
      }
    });

    setRoomsData(updatedRoomsData);
    setShowImportModal(false);
    toastSuccess(`Đã nhập thành công ${importedCount} khách vào danh sách các phòng!`);
  };

  const handleToggleRoomSelect = (roomIdx: number) => {
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

  const renderRoomStatusBadge = (status?: string) => {
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

    const payloadRooms: any[] = [];
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
    } catch (error: any) {
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
      <Modal isOpen={isOpen} onClose={handleClose} title="Nhận phòng đoàn" maxWidth="max-w-4xl">
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 sticky top-0 z-10">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultData ? (
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

              {resultData.successfulRooms?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                    Phòng đã nhận thành công:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {resultData.successfulRooms.map((b: any) => (
                      <div key={b.id} className="p-2.5 bg-surface-container-low border border-border-grey rounded-lg text-sm">
                        <div className="font-bold text-on-surface">Phòng {b.roomNumber}</div>
                        <div className="text-xs text-on-surface-variant">{b.roomTypeName}</div>
                        <div className="text-xs text-green-600 font-medium mt-1">Đã nhận phòng ✓</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border-grey">
                <Button variant="primary" onClick={handleClose}>
                  Hoàn tất
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header đoàn & actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-container-low rounded-lg border border-border-grey text-xs">
                <div>
                  <span className="text-on-surface-variant">Mã đoàn:</span>{' '}
                  <strong className="text-on-surface">{group.groupCode || `#${group.id}`}</strong>
                  <span className="mx-2 text-border-grey">|</span>
                  <span className="text-on-surface-variant">Trưởng đoàn:</span>{' '}
                  <strong className="text-on-surface">{group.representativeName}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" icon={IoCopyOutline} onClick={handleCopyRepresentativeToAllRooms}>
                    Sao chép trưởng đoàn sang tất cả phòng
                  </Button>
                  <Button size="sm" variant="outline" icon={IoCloudUploadOutline} onClick={() => setShowImportModal(true)}>
                    Nhập file danh sách
                  </Button>
                </div>
              </div>

              {/* Bộ lọc chọn nhanh */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSelectAllReady} className="text-primary hover:underline font-medium cursor-pointer">
                    Chọn tất cả phòng sẵn sàng
                  </button>
                  <span className="text-on-surface-variant/40">•</span>
                  <button type="button" onClick={handleDeselectAll} className="text-on-surface-variant hover:underline cursor-pointer">
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div className="text-on-surface-variant font-medium">
                  Đã chọn: {roomsData.filter(r => r.selected).length} / {roomsData.length} phòng
                </div>
              </div>

              {/* Danh sách các phòng */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {roomsData.map((room, roomIdx) => (
                  <div 
                    key={room.bookingId} 
                    className={`p-3.5 rounded-lg border transition-all ${
                      room.selected 
                        ? 'border-primary/40 bg-surface-container-lowest shadow-xs' 
                        : 'border-border-grey bg-surface-container-low/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={room.selected} 
                          onChange={() => handleToggleRoomSelect(roomIdx)} 
                          className="w-4 h-4 text-primary rounded border-border-grey"
                        />
                        <span className="font-bold text-sm text-on-surface">Phòng {room.roomNumber}</span>
                        <span className="text-xs text-on-surface-variant">({room.roomTypeName})</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {renderRoomStatusBadge(room.roomStatus)}
                        {room.selected && (
                          <button 
                            type="button" 
                            onClick={() => setActiveRoomIndex(activeRoomIndex === roomIdx ? null : roomIdx)} 
                            className="text-xs px-2 py-1 rounded bg-surface-container border border-border-grey hover:bg-surface-container-high flex items-center gap-1 cursor-pointer"
                          >
                            <IoQrCodeOutline size={13} />
                            <span>Quét CCCD</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {activeRoomIndex === roomIdx && (
                      <div className="mb-3 p-2 bg-surface-container-low border border-border-grey rounded-lg">
                        <CameraQrScanner 
                          onScan={handleScanQrForActiveRoom} 
                          placeholder={`Dán hoặc quét QR CCCD vào Phòng ${room.roomNumber}...`} 
                          autoStopOnScan={false} 
                        />
                      </div>
                    )}

                    {room.selected && (
                      <div className="space-y-2 pt-1 border-t border-border-grey/40">
                        {room.guests.map((g, gIdx) => (
                          <div key={gIdx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-4">
                              <input 
                                type="text" 
                                placeholder="Họ và tên *" 
                                value={g.name} 
                                onChange={(e) => handleGuestChange(roomIdx, gIdx, 'name', e.target.value)} 
                                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-grey rounded focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>
                            <div className="col-span-4">
                              <input 
                                type="text" 
                                placeholder="Số CCCD / CMND" 
                                value={g.idNumber} 
                                onChange={(e) => handleGuestChange(roomIdx, gIdx, 'idNumber', e.target.value)} 
                                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-grey rounded font-mono focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>
                            <div className="col-span-3">
                              <input 
                                type="text" 
                                placeholder="Số ĐT" 
                                value={g.phone} 
                                onChange={(e) => handleGuestChange(roomIdx, gIdx, 'phone', e.target.value)} 
                                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-grey rounded focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>
                            <div className="col-span-1 text-center">
                              {room.guests.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveGuest(roomIdx, gIdx)} 
                                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                  title="Xóa khách"
                                >
                                  <IoTrashOutline size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="pt-1">
                          <button 
                            type="button" 
                            onClick={() => handleAddGuest(roomIdx)} 
                            className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <IoPersonAddOutline size={13} /> Thêm khách vào phòng {room.roomNumber}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
                <Button variant="ghost" onClick={handleClose} disabled={processing}>
                  Hủy
                </Button>
                <Button variant="primary" onClick={handleSubmit} isLoading={processing}>
                  Xác nhận Nhận phòng ({roomsData.filter(r => r.selected).length} phòng)
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Import danh sách khách */}
      {showImportModal && (
        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Nhập danh sách khách từ bảng / Excel" maxWidth="max-w-xl">
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant">
              Dán dữ liệu danh sách khách theo định dạng: <strong>Số phòng, Họ tên, CCCD, SĐT</strong> (mỗi khách 1 dòng).
            </p>
            {importError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs whitespace-pre-line">
                {importError}
              </div>
            )}
            <textarea 
              rows={8} 
              value={importText} 
              onChange={e => setImportText(e.target.value)} 
              placeholder={`101, Nguyễn Văn A, 001200000001, 0901234567\n101, Trần Thị B, 001200000002\n102, Lê Văn C, 001200000003`} 
              className="w-full p-2.5 bg-surface-container border border-border-grey rounded text-xs font-mono focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>Hủy</Button>
              <Button size="sm" onClick={handleProcessImport}>Áp dụng vào danh sách</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default BulkCheckInModal;
