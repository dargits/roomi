import React, { useState, useEffect } from 'react';
import { 
  IoCloseOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline,
  IoTimeOutline,
  IoCashOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';

const fmtCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const EarlyCheckoutModal = ({ isOpen, onClose, bookingId, guestName, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchPreview();
    }
  }, [isOpen, bookingId]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setErrorMsg('');
    try {
      const data = await bookingApi.previewEarlyCheckout(bookingId);
      setPreviewData(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể xem trước thông tin trả phòng sớm.';
      setErrorMsg(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setErrorMsg('');
    try {
      await bookingApi.confirmEarlyCheckout(bookingId);
      toastSuccess(`Đã hoàn tất trả phòng sớm cho khách ${guestName || ''}!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message || '';
      setErrorMsg(serverMsg || 'Lỗi khi xác nhận trả phòng sớm.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận Trả phòng sớm" maxWidth="max-w-lg">
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <IoAlertCircleOutline size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loadingPreview ? (
          <div className="py-8 text-center text-on-surface-variant">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Đang tính toán số đêm thực tế và điều chỉnh tiền phòng...
          </div>
        ) : previewData ? (
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-start gap-2.5">
              <IoInformationCircleOutline size={20} className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <div className="font-semibold">Khách trả phòng trước ngày dự kiến</div>
                <div className="text-xs mt-0.5 text-amber-800">
                  Hệ thống sẽ cập nhật ngày trả phòng về hôm nay ({previewData.newCheckOut}) và tự động tính lại tiền phòng theo số đêm thực tế.
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 rounded-lg border border-border-grey space-y-2.5">
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Ngày trả phòng ban đầu:</span>
                <span className="font-medium text-on-surface">{previewData.originalCheckOut}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Ngày trả phòng thực tế:</span>
                <span className="font-semibold text-primary">{previewData.newCheckOut} (Hôm nay)</span>
              </div>
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Số đêm ban đầu:</span>
                <span>{previewData.originalNights} đêm</span>
              </div>
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Số đêm thực tế lưu trú:</span>
                <span className="font-bold text-on-surface">{previewData.actualNights} đêm</span>
              </div>
              <div className="pt-2 border-t border-border-grey flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Tiền phòng ban đầu:</span>
                <span className="text-on-surface-variant line-through">{fmtCurrency(previewData.originalRoomAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold text-primary">
                <span>Tiền phòng điều chỉnh lại:</span>
                <span>{fmtCurrency(previewData.actualRoomAmount)}</span>
              </div>
              {previewData.difference > 0 && (
                <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded text-xs flex justify-between items-center font-medium">
                  <span>Khoản chênh lệch được giảm:</span>
                  <span>- {fmtCurrency(previewData.difference)}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-on-surface-variant">
              * Lưu ý: Sau khi xác nhận, hóa đơn PENDING sẽ được cập nhật số tiền phòng mới và booking sẽ chuyển sang trạng thái đã trả phòng.
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={processing} icon={IoCloseOutline}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm} 
            disabled={processing || loadingPreview || !previewData} 
            icon={IoCheckmarkCircleOutline}
          >
            {processing ? 'Đang xử lý...' : 'Xác nhận Trả phòng sớm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EarlyCheckoutModal;
