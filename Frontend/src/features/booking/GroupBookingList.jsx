import React, { useEffect, useState } from 'react';
import { IoBedOutline, IoCallOutline, IoCheckmarkCircleOutline, IoPeopleOutline, IoRefreshOutline } from 'react-icons/io5';
import groupBookingApi from '../../services/groupBookingApi';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
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
  const { success } = useToast();

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
              <td className="p-4 text-center">{group.assignedRooms < group.totalRooms && <Button size="sm" variant="outline" icon={IoBedOutline} onClick={() => openAssignment(group)}>Gán phòng</Button>}</td>
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
    </div>
  );
};

export default GroupBookingList;