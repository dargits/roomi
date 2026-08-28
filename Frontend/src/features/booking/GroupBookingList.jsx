import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  IoBedOutline, IoCallOutline, IoCashOutline, IoCheckmarkCircleOutline,
  IoChevronDownOutline, IoChevronForwardOutline, IoDocumentOutline,
  IoEyeOutline, IoListOutline, IoLogOutOutline, IoPeopleOutline, IoPersonOutline,
  IoPrintOutline, IoReceiptOutline, IoRefreshOutline, IoTrashOutline, IoWarningOutline,
  IoQrCodeOutline, IoCopyOutline, IoCheckmarkOutline, IoTicketOutline
} from 'react-icons/io5';
import groupBookingApi from '../../services/groupBookingApi';
import invoiceApi from '../../services/invoiceApi';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BulkCheckInModal from './BulkCheckInModal';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import GroupRoomAssignmentGrid from './GroupRoomAssignmentGrid';
import GroupDepositModal from './GroupDepositModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatDate';
import InvoiceDiscountSection from '../invoice/InvoiceDiscountSection';
import DiscountFormModal from '../invoice/DiscountFormModal';
import LoadingScreen from '../../components/common/LoadingScreen';



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
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [assignmentState, setAssignmentState] = useState({ group: null, suggestion: null, selections: {} });
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [invoiceState, setInvoiceState] = useState({ group: null, data: null, mode: 'COMBINED' });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [printInvoice, setPrintInvoice] = useState(null);
  const [invoiceTab, setInvoiceTab] = useState('combined'); // 'combined' | 'details'
  const [showGroupDiscountModal, setShowGroupDiscountModal] = useState(false);

  // Payment state for combined invoice
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('TRANSFER');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // NCL-13-CN-004: State cho modal hủy một phần
  const [cancelPartialState, setCancelPartialState] = useState({ group: null, selectedIds: new Set() });
  const [cancelPartialSubmitting, setCancelPartialSubmitting] = useState(false);
  const [cancelPartialError, setCancelPartialError] = useState('');

  // Deposit State
  const [depositModalGroup, setDepositModalGroup] = useState(null);

  // Bulk Check-in State
  const [bulkCheckInGroup, setBulkCheckInGroup] = useState(null);

  // Bulk Check-out State
  const [bulkCheckOutGroup, setBulkCheckOutGroup] = useState(null);
  const [bulkCheckOutLoading, setBulkCheckOutLoading] = useState(false);
  const [bulkCheckOutError, setBulkCheckOutError] = useState('');

  const toggleExpandGroup = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  const canManageInvoices = ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);
  const canCancelPartial = ['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT'].includes(user?.role);


  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await groupBookingApi.getAll());
    } catch (error) {
      console.error('Không thể tải hồ sơ đoàn', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [refreshKey, loadGroups]);

  const openAssignment = async (group) => {
    // Bắt buộc thu cọc trước khi gán phòng
    if (!group.depositPaid) {
      if (toastError) {
        toastError(`Đoàn ${group.representativeName} chưa hoàn thành tiền đặt cọc tối thiểu. Vui lòng thu cọc trước khi xếp phòng.`);
      }
      setDepositModalGroup(group);
      return;
    }

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

  const handleApplyAllSuggested = () => {
    const { suggestion } = assignmentState;
    if (!suggestion?.assignments) return;
    const usedRoomIds = new Set();
    const newSelections = {};
    suggestion.assignments.forEach((line) => {
      let chosenRoom = line.availableRooms?.find(r => r.id === line.suggestedRoomId && !usedRoomIds.has(r.id));
      if (!chosenRoom) {
        chosenRoom = line.availableRooms?.find(r => !usedRoomIds.has(r.id));
      }
      if (chosenRoom) {
        usedRoomIds.add(chosenRoom.id);
        newSelections[line.bookingId] = String(chosenRoom.id);
      } else {
        newSelections[line.bookingId] = '';
      }
    });
    setAssignmentState(prev => ({ ...prev, selections: newSelections }));
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
      toastSuccess('Đã gán phòng cho toàn bộ booking còn thiếu của đoàn.');
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
    setPayError('');
    try {
      const data = await groupBookingApi.getInvoices(group.id);
      setInvoiceState((previous) => ({ ...previous, data }));
      const outstanding = Number(data?.outstandingAmount || 0);
      if (outstanding > 0) {
        setPayAmount(String(outstanding));
      }
    } catch (error) {
      setInvoiceError(error.response?.data?.message || 'Không thể tải trạng thái hóa đơn đoàn.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoices = () => {
    if (invoiceSubmitting || paySubmitting) return;
    setInvoiceState({ group: null, data: null, mode: 'COMBINED' });
    setInvoiceError('');
    setPayError('');
    setPayAmount('');
  };

  const createInvoices = async () => {
    const { group, mode } = invoiceState;
    if (!group) return;
    setInvoiceSubmitting(true);
    setInvoiceError('');
    try {
      const data = await groupBookingApi.createInvoices(group.id, { mode: 'COMBINED' });
      setInvoiceState((previous) => ({ ...previous, data }));
      const outstanding = Number(data?.outstandingAmount || 0);
      if (outstanding > 0) {
        setPayAmount(String(outstanding));
      }
      toastSuccess('Đã lập hóa đơn gộp đoàn và tự động cấn trừ tiền cọc!');
      await loadGroups();
    } catch (error) {
      setInvoiceError(error.response?.data?.message || 'Không thể lập hóa đơn đoàn.');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleCreateGroupInvoicesWithDiscount = async (discountPayload) => {
    const { group } = invoiceState;
    if (!group) return { success: false };
    setInvoiceSubmitting(true);
    setInvoiceError('');
    try {
      const data = await groupBookingApi.createInvoices(group.id, { mode: 'COMBINED' });
      toastSuccess('Đã lập hóa đơn gộp đoàn!');

      const combinedInvId = data?.invoices?.[0]?.id;
      if (combinedInvId && discountPayload && discountPayload.discountValue > 0 && discountPayload.reason) {
        try {
          const discRes = await invoiceApi.applyDiscount(combinedInvId, discountPayload);
          toastSuccess(discRes.statusMessage || 'Đã áp dụng giảm giá cho hóa đơn đoàn!');
        } catch (discErr) {
          toastError(discErr.response?.data?.message || 'Lỗi áp dụng giảm giá cho hóa đơn đoàn');
        }
      }

      setShowGroupDiscountModal(false);
      const refreshedData = await groupBookingApi.getInvoices(group.id);
      setInvoiceState((prev) => ({ ...prev, data: refreshedData }));
      const outstanding = Number(refreshedData?.outstandingAmount || 0);
      if (outstanding > 0) {
        setPayAmount(String(outstanding));
      }
      await loadGroups();
      return { success: true };
    } catch (error) {
      setInvoiceError(error.response?.data?.message || 'Không thể lập hóa đơn đoàn.');
      return { success: false };
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleGroupDiscountChange = async () => {
    const { group } = invoiceState;
    if (!group) return;
    try {
      const refreshedData = await groupBookingApi.getInvoices(group.id);
      setInvoiceState((prev) => ({ ...prev, data: refreshedData }));
      const outstanding = Number(refreshedData?.outstandingAmount || 0);
      setPayAmount(outstanding > 0 ? String(outstanding) : '');
      await loadGroups();
    } catch (err) {
      console.error('Lỗi khi tải lại hóa đơn đoàn', err);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      setPayError('Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0.');
      return;
    }
    setPaySubmitting(true);
    setPayError('');
    try {
      await invoiceApi.recordPayment(invoiceId, {
        amount: numAmount,
        method: payMethod,
        note: payNote.trim() || `Thanh toán hóa đơn đoàn #${invoiceState.group?.id}`,
      });
      toastSuccess(`Đã thanh toán thành công ${numAmount.toLocaleString('vi-VN')} đ!`);
      const refreshedData = await groupBookingApi.getInvoices(invoiceState.group.id);
      setInvoiceState((prev) => ({ ...prev, data: refreshedData }));
      setPayAmount(String(Number(refreshedData?.outstandingAmount || 0)));
      setPayNote('');
      await loadGroups();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Không thể thực hiện thanh toán. Vui lòng thử lại.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleBulkCheckOut = async () => {
    if (!bulkCheckOutGroup) return;
    setBulkCheckOutLoading(true);
    setBulkCheckOutError('');
    try {
      await groupBookingApi.bulkCheckOut(bulkCheckOutGroup.id);
      toastSuccess(`Đã trả phòng thành công cho toàn bộ các phòng trong ĐOÀN-${String(bulkCheckOutGroup.id).padStart(5, '0')}!`);
      setBulkCheckOutGroup(null);
      await loadGroups();
    } catch (error) {
      const msg = error.response?.data?.message || 'Không thể trả phòng đoàn. Vui lòng kiểm tra hóa đơn đã thanh toán đầy đủ chưa.';
      setBulkCheckOutError(msg);
    } finally {
      setBulkCheckOutLoading(false);
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
      next.has(bookingId) ? next.delete(bookingId) : next.add(bookingId);
      return { ...prev, selectedIds: next };
    });
  };

  const submitCancelPartial = async () => {
    const { group, selectedIds } = cancelPartialState;
    if (!group || selectedIds.size === 0) { setCancelPartialError('Vui lòng chọn ít nhất một phòng để hủy.'); return; }
    const activeBookings = group.bookings?.filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') || [];
    if (selectedIds.size >= activeBookings.length) {
      setCancelPartialError('Bạn đang chọn hủy toàn bộ phòng. Vui lòng dùng tính năng hủy cả hồ sơ đoàn.');
      return;
    }
    setCancelPartialSubmitting(true);
    setCancelPartialError('');
    try {
      await groupBookingApi.cancelPartial(group.id, Array.from(selectedIds));
      toastSuccess(`Đã hủy thành công ${selectedIds.size} phòng trong đoàn.`);
      closeCancelPartial();
      await loadGroups();
    } catch (error) {
      setCancelPartialError(error.response?.data?.message || 'Không thể hủy phòng. Vui lòng thử lại.');
    } finally {
      setCancelPartialSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen message="Đang tải hồ sơ đoàn..." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
          <th className="p-4 font-semibold">Mã đoàn</th>
          <th className="p-4 font-semibold">Người đại diện</th>
          <th className="p-4 font-semibold">Thời gian</th>
          <th className="p-4 font-semibold">Phòng</th>
          <th className="p-4 font-semibold">Tiền cọc</th>
          <th className="p-4 font-semibold">Dự kiến</th>
          <th className="p-4 font-semibold text-center">Trạng thái</th>
          <th className="p-4 font-semibold text-center">Thao tác</th>
        </tr></thead>
        <tbody>
          {groups.length === 0 ? (
            <tr><td colSpan="8" className="p-10 text-center text-on-surface-variant">Chưa có hồ sơ đặt phòng đoàn.</td></tr>
          ) : groups.map((group) => {
            const isExpanded = expandedGroupIds.has(group.id);
            return (
              <React.Fragment key={group.id}>
                <tr className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpandGroup(group.id)}
                      className="flex items-center gap-1.5 font-title-sm font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer text-left"
                      title={isExpanded ? "Thu gọn danh sách phòng" : "Bấm để xem chi tiết từng phòng trong đoàn"}
                    >
                      {isExpanded ? <IoChevronDownOutline size={16} className="shrink-0" /> : <IoChevronForwardOutline size={16} className="shrink-0" />}
                      <span>ĐOÀN-{String(group.id).padStart(5, '0')}</span>
                    </button>
                    <div className="text-[11px] text-on-surface-variant mt-1 pl-5">
                      {group.bookings?.length || group.totalRooms} phòng
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-title-sm font-semibold text-on-surface flex items-center gap-1.5">
                      <IoPeopleOutline size={16} className="text-primary" />{group.representativeName}
                    </div>
                    <div className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <IoCallOutline size={14} />{group.representativePhone || 'Chưa có SĐT'}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-on-surface-variant">{formatDate(group.checkInDate)} - {formatDate(group.checkOutDate)}</td>
                  <td className="p-4">
                    <div className="font-semibold text-on-surface flex items-center gap-1.5">
                      <IoBedOutline size={16} className="text-primary" />{group.assignedRooms}/{group.totalRooms} đã xếp
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {group.depositPaid ? (
                      <div>
                        <span className="font-semibold text-green-700">{Number(group.depositAmount || 0).toLocaleString('vi-VN')} đ</span>
                        <div className="text-[11px] text-green-600 font-medium">✓ Đã thu cọc</div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-amber-700 font-semibold">{Number(group.depositAmount || 0).toLocaleString('vi-VN')} đ</span>
                        <div className="text-[11px] text-amber-600 font-medium">⚠ Chưa đủ cọc</div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-on-surface">{Number(group.expectedTotal || 0).toLocaleString('vi-VN')} đ</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[group.status] || group.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      {/* Nút Thu cọc: Chỉ hiện khi CHƯA thu đủ cọc */}
                      {!group.depositPaid && group.status !== 'CANCELLED' && group.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={IoCashOutline}
                          className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold"
                          onClick={() => setDepositModalGroup(group)}
                        >
                          Thu cọc
                        </Button>
                      )}

                      {/* Nút Gán phòng: Khi chưa xếp đủ */}
                      {['NEW', 'PARTIALLY_ASSIGNED'].includes(group.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={IoBedOutline}
                          className={!group.depositPaid ? "opacity-75" : "border-primary/40 text-primary hover:bg-primary/10"}
                          onClick={() => openAssignment(group)}
                        >
                          Gán phòng
                        </Button>
                      )}

                      {/* Nút Nhận phòng: Khi đã xếp phòng */}
                      {group.bookings?.some((b) => b.status === 'CONFIRMED' && b.roomId) && (
                        <Button size="sm" variant="outline" icon={IoCheckmarkCircleOutline}
                          className="border-green-200 text-green-700 hover:bg-green-50 font-semibold"
                          onClick={() => setBulkCheckInGroup(group)}>Nhận phòng
                        </Button>
                      )}

                      {/* Nút Gộp hóa đơn */}
                      {canManageInvoices && (group.depositPaid || ['CHECKED_IN', 'COMPLETED', 'CONFIRMED'].includes(group.status)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={IoDocumentOutline}
                          className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                          onClick={() => {
                            setInvoiceTab('combined');
                            openInvoices(group);
                          }}
                          title="Lập hoặc xem hóa đơn gộp toàn bộ đoàn"
                        >
                          Gộp hóa đơn
                        </Button>
                      )}

                      {/* Nút Trả phòng đoàn: Khi đoàn có phòng đang ở */}
                      {group.bookings?.some((b) => b.status === 'CHECKED_IN') && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={IoLogOutOutline}
                          className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                          onClick={() => {
                            setBulkCheckOutError('');
                            setBulkCheckOutGroup(group);
                          }}
                          title="Trả phòng nhanh toàn bộ các phòng trong đoàn khi đã thanh toán hóa đơn gộp"
                        >
                          Trả phòng đoàn
                        </Button>
                      )}

                      {/* Nút Hủy một phần */}
                      {canCancelPartial && ['NEW', 'PARTIALLY_ASSIGNED'].includes(group.status) && (
                        <Button size="sm" variant="outline" icon={IoTrashOutline}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => setCancelPartialState({ group, selectedIds: new Set() })}>Hủy bớt
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Dropdown / Accordion danh sách đặt phòng riêng lẻ */}
                {isExpanded && (
                  <tr className="bg-slate-50/70 border-b border-border-grey">
                    <td colSpan="8" className="p-4">
                      <div className="rounded-xl border border-border-grey bg-white p-4 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-grey pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                            <IoBedOutline className="text-primary" size={16} />
                            Chi tiết danh sách các phòng trong ĐOÀN-{String(group.id).padStart(5, '0')} ({group.bookings?.length || 0} phòng)
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            Thời gian: <strong>{formatDate(group.checkInDate)}</strong> → <strong>{formatDate(group.checkOutDate)}</strong>
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-surface-container-low border-b border-border-grey text-on-surface-variant font-semibold">
                                <th className="p-2.5">Mã Booking</th>
                                <th className="p-2.5">Khách lưu trú</th>
                                <th className="p-2.5">Hạng phòng & Số phòng</th>
                                <th className="p-2.5 text-right">Giá dự kiến</th>
                                <th className="p-2.5 text-center">Trạng thái phòng</th>
                                <th className="p-2.5 text-center">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.bookings?.length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="p-4 text-center text-on-surface-variant italic">
                                    Chưa có thông tin phòng.
                                  </td>
                                </tr>
                              ) : (
                                group.bookings?.map((b) => (
                                  <tr key={b.id} className="border-b border-border-grey/50 hover:bg-slate-50 transition-colors">
                                    <td className="p-2.5 font-bold text-primary">#{b.id}</td>
                                    <td className="p-2.5">
                                      <div className="font-semibold text-on-surface flex items-center gap-1">
                                        <IoPersonOutline size={13} className="text-primary shrink-0" />
                                        <span>{b.guestName || group.representativeName}</span>
                                      </div>
                                      {b.guestPhone && (
                                        <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                                          <IoCallOutline size={11} /> {b.guestPhone}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-2.5">
                                      <div className="font-semibold text-on-surface">{b.roomTypeName}</div>
                                      {b.roomNumber ? (
                                        <div className="font-bold text-primary text-[11px] mt-0.5 flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                          Phòng {b.roomNumber}
                                        </div>
                                      ) : (
                                        <div className="italic text-amber-600 text-[11px] mt-0.5">
                                          ⚠ Chưa gán phòng
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-right font-semibold text-on-surface">
                                      {Number(b.expectedPrice || 0).toLocaleString('vi-VN')} đ
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        b.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
                                        b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                        b.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' :
                                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                        'bg-amber-100 text-amber-800'
                                      }`}>
                                        {b.status === 'NEW' ? 'Chưa xếp' :
                                         b.status === 'CONFIRMED' ? `Đã gán (P.${b.roomNumber || ''})` :
                                         b.status === 'CHECKED_IN' ? `Đang ở (P.${b.roomNumber || ''})` :
                                         b.status === 'CHECKED_OUT' ? 'Đã trả phòng' :
                                         b.status === 'CANCELLED' ? 'Đã hủy' : b.status}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <Link
                                          to={`/manage/bookings/${b.id}?tab=info`}
                                          state={{ from: '/manage/bookings/groups' }}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                                          title="Xem chi tiết đơn đặt phòng"
                                        >
                                          <IoEyeOutline size={13} /> Phòng
                                        </Link>
                                        <Link
                                          to={`/manage/bookings/${b.id}?tab=invoice`}
                                          state={{ from: '/manage/bookings/groups' }}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors"
                                          title="Xem chi tiết hóa đơn và dịch vụ phòng này"
                                        >
                                          <IoReceiptOutline size={13} /> Hóa đơn
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {/* === MODAL 1: GÁN PHÒNG (Sơ đồ trực quan & Gợi ý hệ thống) === */}
      <Modal
        isOpen={Boolean(assignmentState.group)}
        onClose={closeAssignment}
        title={assignmentState.group ? `Gán phòng cho ĐOÀN-${String(assignmentState.group.id).padStart(5, '0')} (${assignmentState.group.representativeName})` : ''}
        maxWidth="max-w-4xl"
      >
        {assignmentLoading ? (
          <div className="py-12 text-center text-on-surface-variant">
            <IoRefreshOutline className="mx-auto mb-2 animate-spin text-primary" size={24} />
            Đang tìm phòng trống & gợi ý tối ưu...
          </div>
        ) : (
          <GroupRoomAssignmentGrid
            group={assignmentState.group}
            suggestion={assignmentState.suggestion}
            selections={assignmentState.selections}
            onUpdateSelection={updateSelection}
            onApplyAllSuggested={handleApplyAllSuggested}
            onClose={closeAssignment}
            onSubmit={submitAssignment}
            isSubmitting={assignmentSubmitting}
            errorMsg={assignmentError}
          />
        )}
      </Modal>

      {/* === MODAL 2: HÓA ĐƠN GỘP & THANH TOÁN ĐOÀN === */}
      <Modal
        isOpen={Boolean(invoiceState.group)}
        onClose={closeInvoices}
        title={invoiceState.group ? `Hóa đơn & Thanh toán — ĐOÀN-${String(invoiceState.group.id).padStart(5, '0')} (${invoiceState.group.representativeName})` : ''}
        maxWidth="max-w-3xl"
      >
        {invoiceLoading ? (
          <div className="py-12 text-center text-on-surface-variant">
            <IoRefreshOutline className="mx-auto mb-2 animate-spin text-primary" size={24} />
            Đang tải hóa đơn đoàn...
          </div>
        ) : (
          <div className="space-y-4">
            {invoiceError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{invoiceError}</div>
            )}

            {invoiceState.data?.invoices?.length ? (
              <>
                {/* Tab Switcher bên trong Modal */}
                <div className="flex border-b border-border-grey">
                  <button
                    type="button"
                    onClick={() => setInvoiceTab('combined')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      invoiceTab === 'combined'
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <IoDocumentOutline size={16} /> Gộp hóa đơn & Thanh toán
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceTab('details')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      invoiceTab === 'details'
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <IoListOutline size={16} /> Chi tiết phí từng phòng ({invoiceState.group?.bookings?.length || 0})
                  </button>
                </div>

                {invoiceTab === 'combined' ? (
                  <>
                    {/* Thẻ tổng hợp hóa đơn gộp */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 space-y-3">
                      <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                        <span className="font-bold text-base flex items-center gap-2">
                          <IoDocumentOutline className="text-primary" size={20} />
                          Hóa đơn gộp toàn bộ đoàn
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${Number(invoiceState.data.outstandingAmount || 0) === 0 ? 'bg-green-200 text-green-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                          {Number(invoiceState.data.outstandingAmount || 0) === 0 ? '✓ ĐÃ THANH TOÁN ĐỦ' : 'CHỜ THANH TOÁN'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-surface p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-on-surface-variant block mb-0.5">Tiền phòng & Dịch vụ:</span>
                          <strong className="text-on-surface font-bold text-sm">
                            {(Number(invoiceState.data.roomAmount || 0) + Number(invoiceState.data.serviceAmount || 0)).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                        {Number(invoiceState.data.discountAmount || 0) > 0 ? (
                          <div className="bg-surface p-2.5 rounded-lg border border-green-200 text-green-700">
                            <span className="block mb-0.5 font-medium">Giảm giá hóa đơn:</span>
                            <strong className="font-bold text-sm">
                              -{Number(invoiceState.data.discountAmount).toLocaleString('vi-VN')} đ
                            </strong>
                          </div>
                        ) : (
                          <div className="bg-surface p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-on-surface-variant block mb-0.5">Tổng hóa đơn:</span>
                            <strong className="text-on-surface font-bold text-sm">{Number(invoiceState.data.totalAmount || 0).toLocaleString('vi-VN')} đ</strong>
                          </div>
                        )}
                        <div className="bg-surface p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-green-700 block mb-0.5">Tiền cọc & Đã thanh toán:</span>
                          <strong className="text-green-800 font-bold text-sm">{Number(invoiceState.data.paidAmount || 0).toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div className={`p-2.5 rounded-lg border col-span-2 sm:col-span-1 ${Number(invoiceState.data.outstandingAmount || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-100 border-green-300'}`}>
                          <span className={`block mb-0.5 ${Number(invoiceState.data.outstandingAmount || 0) > 0 ? 'text-red-700 font-semibold' : 'text-green-800 font-semibold'}`}>
                            Còn lại phải thu:
                          </span>
                          <strong className={`font-bold text-sm ${Number(invoiceState.data.outstandingAmount || 0) > 0 ? 'text-red-700' : 'text-green-800'}`}>
                            {Number(invoiceState.data.outstandingAmount || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Khu vực Giảm giá hóa đơn gộp đoàn */}
                    {invoiceState.data?.invoices?.[0] && (
                      <div className="bg-surface p-4 rounded-xl border border-border-grey shadow-2xs">
                        <InvoiceDiscountSection
                          invoice={invoiceState.data.invoices[0]}
                          userRole={user?.role}
                          onInvoiceChange={handleGroupDiscountChange}
                          remainingAmount={Number(invoiceState.data.outstandingAmount || 0)}
                        />
                      </div>
                    )}

                    {invoiceState.data?.invoices?.[0]?.status === 'PENDING_DISCOUNT_APPROVAL' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg text-center font-medium">
                        ⚠️ Tạm khóa thanh toán: Khoản giảm giá hóa đơn đoàn đang chờ Chủ cơ sở (Owner) phê duyệt.
                      </div>
                    )}

                    {/* Form thanh toán trực tiếp khi còn nợ */}
                    {Number(invoiceState.data.outstandingAmount || 0) > 0 && invoiceState.data?.invoices?.[0]?.status !== 'PENDING_DISCOUNT_APPROVAL' && (
                      <div className="p-4 bg-surface-container-low rounded-xl border border-primary/30 space-y-3">
                        <div className="font-semibold text-sm text-primary flex items-center gap-1.5">
                          <IoCashOutline size={18} /> Thu tiền thanh toán hóa đơn đoàn
                        </div>
                        {payError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{payError}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                              Số tiền thanh toán (VNĐ) <span className="text-red-500">*</span>
                            </label>
                            <Input type="number" min="1000" step="1000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Phương thức</label>
                            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full py-2.5 px-3 bg-surface border border-border-grey rounded-lg text-sm outline-none focus:border-primary">
                              <option value="TRANSFER">Chuyển khoản (VietQR)</option>
                              <option value="CASH">Tiền mặt</option>
                            </select>
                          </div>
                          {payMethod === 'TRANSFER' && parseFloat(payAmount) > 0 && (() => {
                            const currentPayAmountGroup = parseFloat(payAmount) || 0;
                            const invCodeGroup = invoiceState.data?.invoices?.[0]?.id ? `INV${String(invoiceState.data.invoices[0].id).padStart(6, '0')}` : '';
                            const qrImageUrlGroup = `https://img.vietqr.io/image/MB-0365221338-compact2.png?amount=${currentPayAmountGroup}&addInfo=${invCodeGroup}&accountName=BAN%20HUU%20SU`;

                            return (
                              <div className="sm:col-span-2 bg-white p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-3 mt-1">
                                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                  <IoQrCodeOutline size={16} className="text-blue-600" /> Quét mã VietQR chuyển khoản nhanh
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                  <img
                                    src={qrImageUrlGroup}
                                    alt="VietQR Payment"
                                    className="w-36 h-36 object-contain rounded-lg border border-border-grey bg-white p-1 shadow-xs shrink-0"
                                    loading="lazy"
                                  />
                                  <div className="space-y-1.5 text-xs text-on-surface flex-1 w-full">
                                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                                      <span className="text-on-surface-variant">Ngân hàng:</span>
                                      <strong className="font-semibold">MBBank</strong>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                                      <span className="text-on-surface-variant">Chủ tài khoản:</span>
                                      <strong className="font-semibold uppercase text-primary">BAN HUU SU</strong>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                                      <span className="text-on-surface-variant">Số TK:</span>
                                      <div className="flex items-center gap-1">
                                        <strong className="font-mono font-bold text-primary">0365221338</strong>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard('0365221338', 'acc')}
                                          className="text-on-surface-variant hover:text-primary p-0.5 cursor-pointer"
                                          title="Sao chép số TK"
                                        >
                                          {copiedField === 'acc' ? <IoCheckmarkOutline className="text-green-600" size={14}/> : <IoCopyOutline size={13}/>}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                                      <span className="text-on-surface-variant">Số tiền:</span>
                                      <strong className="text-green-600 font-bold">{currentPayAmountGroup.toLocaleString('vi-VN')} đ</strong>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                                      <span className="text-on-surface-variant">Nội dung:</span>
                                      <div className="flex items-center gap-1">
                                        <strong className="font-mono font-bold text-primary">{invCodeGroup}</strong>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(invCodeGroup, 'memo')}
                                          className="text-on-surface-variant hover:text-primary p-0.5"
                                          title="Sao chép nội dung"
                                        >
                                          {copiedField === 'memo' ? <IoCheckmarkOutline className="text-green-600" size={14}/> : <IoCopyOutline size={13}/>}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Ghi chú</label>
                            <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="VD: Thu nốt tiền khi đoàn trả phòng..." />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button size="sm" variant="primary" icon={IoCheckmarkCircleOutline} isLoading={paySubmitting}
                            onClick={() => {
                              const id = invoiceState.data.invoices[0]?.id;
                              if (id) handlePayInvoice(id);
                            }}
                          >
                            Xác nhận thanh toán ({Number(payAmount || 0).toLocaleString('vi-VN')} đ)
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Danh sách hóa đơn và nút In */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex justify-between items-center">
                        <span>Chi tiết hóa đơn ({invoiceState.data.invoices.length})</span>
                        {invoiceState.data.invoices.length > 1 && (
                          <span className="text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Đoàn đang có {invoiceState.data.invoices.length} hóa đơn tách theo phòng
                          </span>
                        )}
                      </div>
                      {invoiceState.data.invoices.map((invoice, idx) => (
                        <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border-grey bg-surface p-3 text-sm gap-2">
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-2">
                              <span>
                                Hóa đơn #{invoice.id} {invoiceState.data.invoices.length === 1 ? '(Gộp cả đoàn)' : `(Phòng #${invoice.bookingId || idx + 1})`}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {invoice.status === 'PAID' ? '✓ Đã thanh toán đủ' : invoice.status === 'PENDING_DISCOUNT_APPROVAL' ? 'Chờ duyệt giảm giá' : 'Chờ thanh toán'}
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant mt-1 flex flex-wrap gap-x-2">
                              <span>Tiền phòng: {Number(invoice.roomAmount || 0).toLocaleString('vi-VN')} đ</span>
                              {Number(invoice.serviceAmount || 0) > 0 && <span>• Dịch vụ: {Number(invoice.serviceAmount || 0).toLocaleString('vi-VN')} đ</span>}
                              {Number(invoice.discountAmount || 0) > 0 && <span className="text-green-700 font-medium">• Giảm giá: -{Number(invoice.discountAmount).toLocaleString('vi-VN')} đ</span>}
                              {Number(invoice.paidAmount || 0) > 0 && <span className="text-green-700">• Đã trừ cọc / thanh toán: {Number(invoice.paidAmount || 0).toLocaleString('vi-VN')} đ</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <div className="font-bold text-on-surface text-sm">{Number(invoice.totalAmount || 0).toLocaleString('vi-VN')} đ</div>
                            </div>
                            <Button size="sm" variant="outline" icon={IoPrintOutline} onClick={() => setPrintInvoice(invoice)}>In hóa đơn</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Tab Chi tiết từng phòng & dịch vụ */
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border-grey bg-surface p-3 text-xs overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-grey font-semibold text-on-surface-variant">
                            <th className="p-2">Mã phòng</th>
                            <th className="p-2">Khách ở</th>
                            <th className="p-2">Hạng phòng</th>
                            <th className="p-2 text-right">Tiền phòng</th>
                            <th className="p-2 text-center">Trạng thái</th>
                            <th className="p-2 text-center">Hóa đơn lẻ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceState.group?.bookings?.map((b) => (
                            <tr key={b.id} className="border-b border-border-grey/50 hover:bg-slate-50">
                              <td className="p-2 font-bold text-primary">
                                {b.roomNumber ? `P.${b.roomNumber}` : `#${b.id}`}
                              </td>
                              <td className="p-2 text-on-surface font-medium">
                                {b.guestName || invoiceState.group.representativeName}
                              </td>
                              <td className="p-2 text-on-surface-variant">{b.roomTypeName}</td>
                              <td className="p-2 text-right font-semibold text-on-surface">
                                {Number(b.expectedPrice || 0).toLocaleString('vi-VN')} đ
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  b.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
                                  b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                  b.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' :
                                  b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {b.status === 'NEW' ? 'Chưa xếp' :
                                   b.status === 'CONFIRMED' ? 'Đã gán' :
                                   b.status === 'CHECKED_IN' ? 'Đang ở' :
                                   b.status === 'CHECKED_OUT' ? 'Đã trả phòng' :
                                   b.status === 'CANCELLED' ? 'Đã hủy' : b.status}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <Link
                                  to={`/manage/bookings/${b.id}?tab=invoice`}
                                  state={{ from: '/manage/bookings/groups' }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  <IoReceiptOutline size={12} /> Chi tiết
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t border-border-grey pt-3">
                  <Button variant="secondary" onClick={closeInvoices}>Đóng</Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-border-grey bg-surface-container-low p-4 text-xs text-on-surface-variant leading-relaxed space-y-2">
                  <div className="font-semibold text-on-surface text-sm">Lập hóa đơn gộp cho toàn bộ đoàn:</div>
                  <div>• Hệ thống sẽ tự động gộp tiền phòng của tất cả các booking trong đoàn và các dịch vụ đã sử dụng.</div>
                  <div>• Toàn bộ số tiền cọc đoàn đã thu ({Number(invoiceState.group?.depositAmount || 0).toLocaleString('vi-VN')} đ) sẽ <strong>tự động cấn trừ trực tiếp</strong> vào hóa đơn.</div>
                  <div>• Lễ tân có thể thu nốt phần chênh lệch còn lại ngay sau khi tạo hóa đơn.</div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-border-grey pt-4">
                  <Button variant="ghost" onClick={closeInvoices} disabled={invoiceSubmitting}>Hủy</Button>
                  <Button
                    variant="outline"
                    icon={IoTicketOutline}
                    onClick={() => setShowGroupDiscountModal(true)}
                    isLoading={invoiceSubmitting}
                    className="text-primary border-primary hover:bg-primary/5"
                  >
                    Tạo hóa đơn gộp kèm giảm giá
                  </Button>
                  <Button variant="primary" icon={IoDocumentOutline} onClick={createInvoices} isLoading={invoiceSubmitting}>
                    Tạo hóa đơn gộp đoàn
                  </Button>
                </div>

                {/* Modal nhập giảm giá trực tiếp trong quá trình lập hóa đơn gộp đoàn */}
                {(() => {
                  const groupRoomTotal = invoiceState.group?.totalRoomCharge
                    || invoiceState.group?.bookings?.reduce((sum, b) => sum + (Number(b.expectedPrice) || 0), 0)
                    || 0;
                  const groupDeposit = Number(invoiceState.group?.depositAmount || 0);
                  const groupRemaining = Math.max(0, groupRoomTotal - groupDeposit);
                  return (
                    <DiscountFormModal
                      isOpen={showGroupDiscountModal}
                      onClose={() => setShowGroupDiscountModal(false)}
                      onSubmit={handleCreateGroupInvoicesWithDiscount}
                      isLoading={invoiceSubmitting}
                      invoice={{
                        roomAmount: groupRoomTotal,
                        serviceAmount: 0,
                        totalAmount: groupRoomTotal,
                        remainingAmount: groupRemaining
                      }}
                      remainingAmount={groupRemaining}
                    />
                  );
                })()}
              </>
            )}
          </div>
        )}
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
                      className={`flex items-center justify-between p-3 rounded-md border transition-colors ${isChecked
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

      {/* Modal Nhận phòng đoàn */}
      <BulkCheckInModal
        isOpen={Boolean(bulkCheckInGroup)}
        onClose={() => setBulkCheckInGroup(null)}
        group={bulkCheckInGroup}
        onSuccess={() => {
          loadGroups();
        }}
      />

      {/* Modal Thu tiền đặt cọc đoàn */}
      <GroupDepositModal
        isOpen={Boolean(depositModalGroup)}
        onClose={() => setDepositModalGroup(null)}
        group={depositModalGroup}
        onSuccess={() => {
          loadGroups();
        }}
      />

      {/* Modal In Hóa đơn */}
      {printInvoice && (
        <InvoicePrintTemplate
          invoice={printInvoice}
          group={invoiceState.group}
          booking={invoiceState.group?.bookings?.find(b => b.id === printInvoice.bookingId)}
          onClose={() => setPrintInvoice(null)}
        />
      )}

      {/* === MODAL 4: XÁC NHẬN TRẢ PHÒNG ĐOÀN (BULK CHECK-OUT) === */}
      <Modal
        isOpen={Boolean(bulkCheckOutGroup)}
        onClose={() => {
          if (!bulkCheckOutLoading) {
            setBulkCheckOutGroup(null);
            setBulkCheckOutError('');
          }
        }}
        title={bulkCheckOutGroup ? `Trả phòng — ĐOÀN-${String(bulkCheckOutGroup.id).padStart(5, '0')} (${bulkCheckOutGroup.representativeName})` : ''}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {bulkCheckOutError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1">
                <IoWarningOutline size={16} /> Không thể trả phòng:
              </div>
              <div>{bulkCheckOutError}</div>
              {bulkCheckOutError.includes('hóa đơn') && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={IoDocumentOutline}
                  className="mt-1 border-emerald-400 text-emerald-800 bg-white"
                  onClick={() => {
                    const g = bulkCheckOutGroup;
                    setBulkCheckOutGroup(null);
                    openInvoices(g);
                  }}
                >
                  Mở Gộp hóa đơn để thanh toán ngay
                </Button>
              )}
            </div>
          )}

          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-2">
            <div className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
              <IoLogOutOutline size={18} /> Trả phòng nhanh toàn bộ đoàn
            </div>
            <div>
              Hệ thống sẽ thực hiện trả phòng (Check-out) cho tất cả các phòng đang ở trong đoàn và chuyển trạng thái phòng sang cần dọn dẹp (Dirty).
            </div>
            <div className="font-semibold text-purple-800">
              Yêu cầu: Hóa đơn gộp của đoàn đã được tạo và thanh toán đầy đủ.
            </div>
          </div>

          {bulkCheckOutGroup && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Danh sách phòng sẽ trả ({bulkCheckOutGroup.bookings?.filter(b => b.status === 'CHECKED_IN').length || 0} phòng)
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border-grey p-2 bg-surface">
                {bulkCheckOutGroup.bookings?.filter(b => b.status === 'CHECKED_IN').map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded bg-surface-container-low text-xs">
                    <span className="font-bold text-primary">Phòng {b.roomNumber || `#${b.id}`} ({b.roomTypeName})</span>
                    <span className="text-on-surface-variant">{b.guestName || bulkCheckOutGroup.representativeName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button
              variant="ghost"
              disabled={bulkCheckOutLoading}
              onClick={() => {
                setBulkCheckOutGroup(null);
                setBulkCheckOutError('');
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={IoLogOutOutline}
              isLoading={bulkCheckOutLoading}
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              onClick={handleBulkCheckOut}
            >
              Xác nhận trả phòng tất cả
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupBookingList;