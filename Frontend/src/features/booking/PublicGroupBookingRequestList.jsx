import React, { useEffect, useState } from 'react';
import { IoCallOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPeopleOutline, IoAlertCircleOutline, IoCloseOutline } from 'react-icons/io5';
import publicGroupBookingRequestApi from '../../services/publicGroupBookingRequestApi';
import { calculateNights, formatStayDateTime } from '../../utils/formatDate';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

const statusStyle = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const PublicGroupBookingRequestList = () => {
  const { success: toastSuccess } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'APPROVE' | 'REJECT'
    request: null,
    reason: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await publicGroupBookingRequestApi.getAll());
    } catch (error) {
      console.error('Không thể tải yêu cầu đặt đoàn', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const openApproveModal = (request) => {
    setErrorMsg('');
    setModalState({
      isOpen: true,
      type: 'APPROVE',
      request,
      reason: ''
    });
  };

  const openRejectModal = (request) => {
    setErrorMsg('');
    setModalState({
      isOpen: true,
      type: 'REJECT',
      request,
      reason: ''
    });
  };

  const closeModal = () => {
    if (processing) return;
    setModalState({ isOpen: false, type: null, request: null, reason: '' });
    setErrorMsg('');
  };

  const handleConfirmAction = async () => {
    const { type, request, reason } = modalState;
    if (!request) return;

    setProcessing(true);
    setErrorMsg('');
    try {
      if (type === 'APPROVE') {
        await publicGroupBookingRequestApi.approve(request.id);
        toastSuccess(`Đã duyệt yêu cầu đặt đoàn của ${request.representativeName} thành công!`);
      } else if (type === 'REJECT') {
        await publicGroupBookingRequestApi.reject(request.id, reason);
        toastSuccess(`Đã từ chối yêu cầu đặt đoàn của ${request.representativeName} thành công!`);
      }
      closeModal();
      await loadRequests();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Không thể thực hiện thao tác.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="border-t-8 border-surface-container-low bg-surface-container-lowest p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-lg font-bold text-on-surface"><IoPeopleOutline className="text-primary" /> Yêu cầu đặt đoàn từ StayAway</h3><p className="mt-1 text-sm text-on-surface-variant">Duyệt yêu cầu để tạo hồ sơ đoàn và các booking chưa gán phòng.</p></div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-grey">
        <table className="w-full text-left"><thead><tr className="bg-surface-container-low text-xs uppercase text-on-surface-variant"><th className="p-3">Đại diện</th><th className="p-3">Nhu cầu phòng</th><th className="p-3">Thời gian</th><th className="p-3 text-center">Trạng thái</th><th className="p-3 text-center">Thao tác</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="5" className="p-6 text-center text-on-surface-variant">Đang tải yêu cầu đoàn...</td></tr> : requests.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-on-surface-variant">Chưa có yêu cầu đoàn từ StayAway.</td></tr> : requests.map((request) => <tr key={request.id} className="border-t border-border-grey align-top"><td className="p-3"><div className="font-semibold text-on-surface">{request.representativeName}</div><div className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant"><IoCallOutline size={14} />{request.phone}</div>{request.note && <div className="mt-2 text-xs italic text-on-surface-variant">{request.note}</div>}</td><td className="p-3 text-sm text-on-surface">{request.rooms.map((room) => <div key={room.roomTypeId}>{room.roomTypeName}: <strong>{room.quantity}</strong> phòng</div>)}</td><td className="p-3 text-sm text-on-surface">{formatStayDateTime(request.checkInDate, 'checkin')} - {formatStayDateTime(request.checkOutDate, 'checkout')}<div className="mt-1 text-xs text-on-surface-variant">{calculateNights(request.checkInDate, request.checkOutDate)} đêm</div></td><td className="p-3 text-center"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyle[request.status]}`}>{request.status === 'PENDING' ? 'Chờ duyệt' : request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}</span>{request.rejectReason && <div className="mt-2 text-xs text-red-600">{request.rejectReason}</div>}</td><td className="p-3 text-center">{request.status === 'PENDING' && <div className="flex justify-center gap-2"><button onClick={() => openApproveModal(request)} disabled={processing} className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 disabled:opacity-50"><IoCheckmarkCircleOutline size={15} />Duyệt</button><button onClick={() => openRejectModal(request)} disabled={processing} className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"><IoCloseCircleOutline size={15} />Từ chối</button></div>}{request.convertedGroupBookingId && <span className="text-xs text-primary">Đoàn #{request.convertedGroupBookingId}</span>}</td></tr>)}</tbody>
        </table>
      </div>

      {/* Modal xác nhận Duyệt / Từ chối */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.type === 'APPROVE' ? 'Duyệt yêu cầu đoàn' : 'Từ chối yêu cầu đoàn'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {modalState.request && (
            <div className="bg-surface-container-low p-4 rounded-lg space-y-2 text-sm border border-border-grey">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Đại diện đoàn:</span>
                <span className="font-semibold text-on-surface">{modalState.request.representativeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Số điện thoại:</span>
                <span className="font-semibold text-on-surface">{modalState.request.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Nhu cầu phòng:</span>
                <span className="font-semibold text-on-surface text-right">
                  {modalState.request.rooms.map(room => (
                    <div key={room.roomTypeId}>{room.roomTypeName}: {room.quantity} phòng</div>
                  ))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Thời gian:</span>
                <span className="font-semibold text-on-surface">
                  {formatStayDateTime(modalState.request.checkInDate, 'checkin')} → {formatStayDateTime(modalState.request.checkOutDate, 'checkout')} ({calculateNights(modalState.request.checkInDate, modalState.request.checkOutDate)} đêm)
                </span>
              </div>
              {modalState.request.note && (
                <div className="pt-2 border-t border-border-grey text-xs text-on-surface-variant italic">
                  Ghi chú: "{modalState.request.note}"
                </div>
              )}
            </div>
          )}

          {modalState.type === 'APPROVE' ? (
            <p className="text-sm text-on-surface">
              Yêu cầu đặt phòng này sẽ được chuyển thành <strong>Hồ sơ đoàn (Đã xác nhận)</strong>. Hệ thống sẽ kiểm tra số lượng và tạo hồ sơ. Bạn có chắc chắn muốn duyệt?
            </p>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">
                Lý do từ chối:
              </label>
              <textarea
                rows={3}
                className="w-full p-2.5 border border-border-grey rounded-lg text-sm bg-surface focus:outline-none focus:border-primary"
                placeholder="Nhập lý do từ chối (vd: Hết phòng vào ngày yêu cầu, không liên lạc được...)"
                value={modalState.reason}
                onChange={(e) => setModalState(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={processing}
              icon={IoCloseOutline}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={modalState.type === 'APPROVE' ? 'primary' : 'danger'}
              onClick={handleConfirmAction}
              disabled={processing}
              icon={modalState.type === 'APPROVE' ? IoCheckmarkCircleOutline : IoCloseCircleOutline}
            >
              {processing ? 'Đang xử lý...' : (modalState.type === 'APPROVE' ? 'Xác nhận Duyệt' : 'Xác nhận Từ chối')}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default PublicGroupBookingRequestList;