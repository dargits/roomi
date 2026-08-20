import React, { useEffect, useState } from 'react';
import { IoBedOutline, IoCallOutline, IoCheckmarkCircleOutline, IoDocumentOutline, IoPeopleOutline, IoRefreshOutline, IoTrashOutline, IoWarningOutline } from 'react-icons/io5';
import groupBookingApi from '../../services/groupBookingApi';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatDate';


const STATUS_STYLES = {
  NEW: 'bg-amber-100 text-amber-800',
  PARTIALLY_ASSIGNED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  NEW: 'Mới tạo', PARTIALLY_ASSIGNED: 'Đang xếp phòng', CONFIRMED: 'Đã xếp đủ',
  CHECKED_IN: 'Đang ở', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
};

const GroupBookingList = ({ refreshKey }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentState, setAssignmentState] = useState({ group: null, suggestion: null, selections: {} });
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [invoiceState, setInvoiceState] = useState({ group: null, data: null, mode: 'COMBINED' });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  // NCL-13-CN-004: State cho modal hủy một phần
  const [cancelPartialState, setCancelPartialState] = useState({ group: null, selectedIds: new Set() });
  const [cancelPartialSubmitting, setCancelPartialSubmitting] = useState(false);
  const [cancelPartialError, setCancelPartialError] = useState('');

  const { success } = useToast();
  const { user } = useAuth();
  const canManageInvoices = ['OWNER', 'ACCOUNTANT'].includes(user?.role);
  const canCancelPartial = ['OWNER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role);


  const loadGroups = async () => {
    setLoading(true);
    try {
      setGroups(await groupBookingApi.getAll());
    } catch (error) {
      console.error('Không thể tải hồ sơ đoàn', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, [refreshKey]);

  const openAssignment = async (group) => {
    setAssignmentLoading(true);
    setAssignmentError('');
    setAssignmentState({ group, suggestion: null, selections: {} });
    try {
      const suggestion = await groupBookingApi.getAssignmentSuggestion(group.id);
      const usedRoomIds = new Set();
      const selections = suggestion.assignments.reduce((result, line) => {
        const firstUnusedRoom = line.availableRooms.find((room) => !usedRoomIds.has(room.id));
        if (firstUnusedRoom) usedRoomIds.add(firstUnusedRoom.id);
        result[line.bookingId] = firstUnusedRoom?.id ? String(firstUnusedRoom.id) : '';
        return result;
      }, {});
      setAssignmentState({ group, suggestion, selections });
    } catch (error) {
      setAssignmentError(error.response?.data?.message || 'Không thể tải gợi ý phòng trống.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const closeAssignment = () => {
    if (assignmentSubmitting) return;
    setAssignmentState({ group: null, suggestion: null, selections: {} });
    setAssignmentError('');
  };

  const updateSelection = (bookingId, roomId) => {
    setAssignmentState((previous) => ({
      ...previous,
      selections: { ...previous.selections, [bookingId]: roomId },
    }));
  };

  const submitAssignment = async () => {
    const { group, suggestion, selections } = assignmentState;
    if (!group || !suggestion) return;
    const roomIds = Object.values(selections).filter(Boolean);
    if (roomIds.length !== suggestion.assignments.length || new Set(roomIds).size !== roomIds.length) {
      setAssignmentError('Mỗi booking cần một phòng riêng. Vui lòng kiểm tra lại lựa chọn.');
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError('');
    try {
      await groupBookingApi.assignRooms(group.id, suggestion.assignments.map((line) => ({
        bookingId: line.bookingId,
        roomId: Number(selections[line.bookingId]),
      })));
      success('Đã gán phòng cho toàn bộ booking còn thiếu của đoàn.');
      setAssignmentState({ group: null, suggestion: null, selections: {} });
      setAssignmentError('');
      await loadGroups();
    } catch (error) {
      setAssignmentError(error.response?.data?.message || 'Không thể gán phòng. Danh sách phòng có thể đã thay đổi, hãy tải lại gợi ý.');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const openInvoices = async (group) => {
    setInvoiceState({ group, data: null, mode: 'COMBINED' });
    setInvoiceError('');
    setInvoiceLoading(true);
    try {
      const data = await groupBookingApi.getInvoices(group.id);
      setInvoiceState((previous) => ({ ...previous, data }));
    } catch (error) {
      setInvoiceError(error.response?.data?.message || 'Không thể tải trạng thái hóa đơn đoàn.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoices = () => {
    if (invoiceSubmitting) return;
    setInvoiceState({ group: null, data: null, mode: 'COMBINED' });
    setInvoiceError('');
  };

  const createInvoices = async () => {
    const { group, mode } = invoiceState;
    if (!group) return;
    setInvoiceSubmitting(true);
    setInvoiceError('');
    try {
      const data = await groupBookingApi.createInvoices(group.id, { mode });
      setInvoiceState((previous) => ({ ...previous, data }));
      success(mode === 'COMBINED' ? 'Đã lập hóa đơn chung cho đoàn.' : 'Đã lập hóa đơn riêng cho từng phòng.');
    } catch (error) {
      setInvoiceError(error.response?.data?.message || 'Không thể lập hóa đơn đoàn.');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const closeCancelPartial = () => {
    if (cancelPartialSubmitting) return;
    setCancelPartialState({ group: null, selectedIds: new Set() });
    setCancelPartialError('');
  };

  const toggleSelectBookingToCancel = (bookingId) => {
    setCancelPartialState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return { ...prev, selectedIds: next };
    });
  };

  const submitCancelPartial = async () => {
    const { group, selectedIds } = cancelPartialState;
    if (!group || selectedIds.size === 0) {
      setCancelPartialError('Vui lòng chọn ít nhất một phòng để hủy.');
      return;
    }

    const activeBookings = group.bookings?.filter(
      (b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW'
    ) || [];

    if (selectedIds.size >= activeBookings.length) {
      setCancelPartialError(
        'Bạn đang chọn hủy toàn bộ phòng. Với trường hợp này, vui lòng sử dụng tính năng hủy cả hồ sơ đoàn.'
      );
      return;
    }

    setCancelPartialSubmitting(true);
    setCancelPartialError('');
    try {
      await groupBookingApi.cancelPartial(group.id, Array.from(selectedIds));
      success(`Đã hủy thành công ${selectedIds.size} phòng trong đoàn.`);
      closeCancelPartial();
      await loadGroups();
    } catch (error) {
      setCancelPartialError(
        error.response?.data?.message || 'Không thể hủy phòng. Vui lòng thử lại.'
      );
    } finally {
      setCancelPartialSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-on-surface-variant"><IoRefreshOutline className="animate-spin mx-auto mb-2" size={24} />Đang tải hồ sơ đoàn...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-surface-container-low border-b-2 border-border-grey text-xs uppercase text-on-surface-variant"><th className="p-4">Mã đoàn</th><th className="p-4">Người đại diện</th><th className="p-4">Thời gian</th><th className="p-4">Phòng</th><th className="p-4">Dự kiến</th><th className="p-4 text-center">Trạng thái</th><th className="p-4 text-center">Thao tác</th></tr></thead>
        <tbody>
          {groups.length === 0 ? <tr><td colSpan="7" className="p-10 text-center text-on-surface-variant">Chưa có hồ sơ đặt phòng đoàn.</td></tr> : groups.map((group) => (
            <tr key={group.id} className="border-b border-border-grey hover:bg-surface-container-low/60">
              <td className="p-4 font-semibold text-primary">ĐOÀN-{String(group.id).padStart(5, '0')}</td>
              <td className="p-4"><div className="font-semibold text-on-surface flex items-center gap-1.5"><IoPeopleOutline size={16} className="text-primary" />{group.representativeName}</div><div className="text-xs text-on-surface-variant flex items-center gap-1 mt-1"><IoCallOutline size={13} />{group.representativePhone || 'Chưa có SĐT'}</div></td>
              <td className="p-4 text-sm text-on-surface-variant">{formatDate(group.checkInDate)} - {formatDate(group.checkOutDate)}</td>
              <td className="p-4"><div className="font-semibold text-on-surface flex items-center gap-1.5"><IoBedOutline size={16} className="text-primary" />{group.assignedRooms}/{group.totalRooms} đã xếp</div></td>
              <td className="p-4 font-semibold text-on-surface">{Number(group.expectedTotal || 0).toLocaleString('vi-VN')} đ</td>
              <td className="p-4 text-center"><span className={`px-2 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-800'}`}>{STATUS_LABELS[group.status] || group.status}</span></td>
              <td className="p-4 text-center"><div className="flex flex-wrap justify-center gap-2">
                {group.assignedRooms < group.totalRooms && <Button size="sm" variant="outline" icon={IoBedOutline} onClick={() => openAssignment(group)}>Gán phòng</Button>}
                {canCancelPartial && ['NEW','CONFIRMED','PARTIALLY_ASSIGNED'].includes(group.status) && (
                  <Button size="sm" variant="outline" icon={IoTrashOutline}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setCancelPartialState({ group, selectedIds: new Set() })}>
                    Hủy một phần
                  </Button>
                )}
                {canManageInvoices && <Button size="sm" variant="outline" icon={IoDocumentOutline} onClick={() => openInvoices(group)}>Hóa đơn</Button>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        isOpen={Boolean(assignmentState.group)}
        onClose={closeAssignment}
        title={assignmentState.group ? `Gán phòng cho ĐOÀN-${String(assignmentState.group.id).padStart(5, '0')}` : ''}
        maxWidth="max-w-3xl"
      >
        {assignmentLoading ? <div className="py-12 text-center text-on-surface-variant"><IoRefreshOutline className="mx-auto mb-2 animate-spin" size={24} />Đang tìm phòng trống...</div> : <div className="space-y-5">
          {assignmentError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{assignmentError}</div>}
          {assignmentState.suggestion?.assignments.length === 0 ? <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Đoàn này không còn booking nào cần gán phòng.</div> : assignmentState.suggestion && <>
            <div className="rounded-md border border-border-grey bg-surface-container-low p-3 text-sm text-on-surface-variant">Chọn một phòng riêng cho từng booking. Hệ thống sẽ kiểm tra lại tình trạng trống khi xác nhận.</div>
            <div className="space-y-3">{assignmentState.suggestion.assignments.map((line, index) => {
              const selectedRoomId = assignmentState.selections[line.bookingId] || '';
              return <div key={line.bookingId} className="grid gap-3 rounded-md border border-border-grey p-4 md:grid-cols-[1fr_1.4fr] md:items-center"><div><div className="font-semibold text-on-surface">Phòng {index + 1}: {line.roomTypeName}</div><div className="mt-1 text-xs text-on-surface-variant">Booking #{line.bookingId}</div></div><select value={selectedRoomId} onChange={(event) => updateSelection(line.bookingId, event.target.value)} className="w-full rounded-md border border-border-grey bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"><option value="">Chọn phòng trống</option>{line.availableRooms.map((room) => { const roomIsSelectedElsewhere = Object.entries(assignmentState.selections).some(([bookingId, roomId]) => Number(bookingId) !== line.bookingId && String(room.id) === roomId); return <option key={room.id} value={room.id} disabled={roomIsSelectedElsewhere}>{room.roomNumber}{room.floor ? ` - Tầng ${room.floor}` : ''}</option>; })}</select>{line.availableRooms.length === 0 && <div className="md:col-start-2 text-xs text-red-600">Không còn phòng trống phù hợp.</div>}</div>;
            })}</div>
            <div className="flex justify-end gap-3 border-t border-border-grey pt-4"><Button variant="secondary" onClick={closeAssignment} disabled={assignmentSubmitting}>Hủy</Button><Button variant="success" icon={IoCheckmarkCircleOutline} onClick={submitAssignment} isLoading={assignmentSubmitting}>Xác nhận gán tất cả</Button></div>
          </>}
        </div>}
      </Modal>
      <Modal
        isOpen={Boolean(invoiceState.group)}
        onClose={closeInvoices}
        title={invoiceState.group ? `Hóa đơn ĐOÀN-${String(invoiceState.group.id).padStart(5, '0')}` : ''}
        maxWidth="max-w-2xl"
      >
        {invoiceLoading ? <div className="py-12 text-center text-on-surface-variant"><IoRefreshOutline className="mx-auto mb-2 animate-spin" size={24} />Đang tải hóa đơn...</div> : <div className="space-y-5">
          {invoiceError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{invoiceError}</div>}
          {invoiceState.data?.invoices?.length ? <><div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="font-semibold">{invoiceState.data.mode === 'COMBINED' ? 'Hóa đơn chung của đoàn' : 'Hóa đơn tách theo từng phòng'}</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><span>Tổng: <strong>{Number(invoiceState.data.totalAmount || 0).toLocaleString('vi-VN')} đ</strong></span><span>Còn phải thu: <strong>{Number(invoiceState.data.outstandingAmount || 0).toLocaleString('vi-VN')} đ</strong></span></div></div><div className="space-y-2">{invoiceState.data.invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between rounded-md border border-border-grey p-3 text-sm"><span>Hóa đơn #{invoice.id}{invoice.bookingId ? ` - Booking #${invoice.bookingId}` : ''}</span><span className="font-semibold">{Number(invoice.totalAmount || 0).toLocaleString('vi-VN')} đ</span></div>)}</div></> : <><div className="rounded-md border border-border-grey bg-surface-container-low p-4 text-sm text-on-surface-variant">Chỉ lập được khi tất cả phòng trong đoàn đã nhận phòng. Cách lập hóa đơn sẽ không thể thay đổi sau khi tạo.</div><div className="grid gap-3 md:grid-cols-2"><label className={`cursor-pointer rounded-md border p-4 ${invoiceState.mode === 'COMBINED' ? 'border-primary bg-primary/5' : 'border-border-grey'}`}><input className="sr-only" type="radio" name="invoice-mode" value="COMBINED" checked={invoiceState.mode === 'COMBINED'} onChange={(event) => setInvoiceState((previous) => ({ ...previous, mode: event.target.value }))} /><div className="font-semibold text-on-surface">Gộp toàn bộ đoàn</div><div className="mt-1 text-sm text-on-surface-variant">Một hóa đơn chung, tự trừ cọc của tất cả phòng.</div></label><label className={`cursor-pointer rounded-md border p-4 ${invoiceState.mode === 'SEPARATE' ? 'border-primary bg-primary/5' : 'border-border-grey'}`}><input className="sr-only" type="radio" name="invoice-mode" value="SEPARATE" checked={invoiceState.mode === 'SEPARATE'} onChange={(event) => setInvoiceState((previous) => ({ ...previous, mode: event.target.value }))} /><div className="font-semibold text-on-surface">Tách từng phòng</div><div className="mt-1 text-sm text-on-surface-variant">Một hóa đơn và cọc riêng cho mỗi booking.</div></label></div><div className="flex justify-end gap-3 border-t border-border-grey pt-4"><Button variant="secondary" onClick={closeInvoices} disabled={invoiceSubmitting}>Hủy</Button><Button icon={IoDocumentOutline} onClick={createInvoices} isLoading={invoiceSubmitting}>Lập hóa đơn</Button></div></>}
        </div>}
      </Modal>

      {/* Modal Hủy một phần số phòng trong đoàn (NCL-13-CN-004) */}
      <Modal
        isOpen={Boolean(cancelPartialState.group)}
        onClose={closeCancelPartial}
        title={cancelPartialState.group ? `Hủy bớt phòng trong ĐOÀN-${String(cancelPartialState.group.id).padStart(5, '0')}` : ''}
        maxWidth="max-w-2xl"
      >
        {cancelPartialState.group && (
          <div className="space-y-4">
            {cancelPartialError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {cancelPartialError}
              </div>
            )}

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
              <IoWarningOutline size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                Chọn các phòng cần hủy bỏ. Hệ thống sẽ giải phóng phòng, tính lại tổng tiền đoàn và áp dụng phí hủy theo chính sách.
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cancelPartialState.group.bookings
                ?.filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
                .map((booking) => {
                  const isChecked = cancelPartialState.selectedIds.has(booking.id);
                  const isCheckedIn = booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT';

                  return (
                    <label
                      key={booking.id}
                      className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                        isChecked
                          ? 'border-red-400 bg-red-50/50'
                          : isCheckedIn
                          ? 'border-border-grey bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-border-grey hover:bg-surface-container-low cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={isCheckedIn}
                          checked={isChecked}
                          onChange={() => toggleSelectBookingToCancel(booking.id)}
                          className="h-4 w-4 rounded border-border-grey text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <div className="font-semibold text-sm text-on-surface">
                            Phòng {booking.roomNumber || 'Chưa gán'} ({booking.roomTypeName})
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            Mã #{booking.id} • Giá: {Number(booking.expectedPrice || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-surface-container text-on-surface-variant">
                        {isCheckedIn ? 'Đã nhận phòng (không thể hủy)' : STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    </label>
                  );
                })}
            </div>

            {cancelPartialState.selectedIds.size > 0 && (
              <div className="text-sm text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                Đã chọn <strong>{cancelPartialState.selectedIds.size}</strong> phòng để hủy bỏ.
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border-grey pt-4">
              <Button variant="secondary" onClick={closeCancelPartial} disabled={cancelPartialSubmitting}>
                Đóng
              </Button>
              <Button
                variant="danger"
                icon={IoTrashOutline}
                onClick={submitCancelPartial}
                isLoading={cancelPartialSubmitting}
                disabled={cancelPartialState.selectedIds.size === 0 || cancelPartialSubmitting}
              >
                Xác nhận hủy phòng đã chọn
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GroupBookingList;