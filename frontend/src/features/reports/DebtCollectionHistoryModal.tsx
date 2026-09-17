import React, { useEffect, useState } from 'react';
import { IoTimeOutline, IoCalendarOutline, IoPersonOutline, IoCheckmarkCircleOutline, IoCallOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import debtApprovalApi from '../../services/debtApprovalApi';
import { DebtAgingItemResponse, DebtCollectionLogResponse } from '../../types/report';

interface DebtCollectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtItem: DebtAgingItemResponse | null;
}

const METHOD_LABELS: Record<string, string> = {
  PHONE: '📞 Gọi điện',
  ZALO: '💬 Zalo',
  EMAIL: '✉️ Email',
  SMS: '📱 SMS',
  IN_PERSON: '🤝 Gặp trực tiếp',
  OTHER: '📋 Khác'
};

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  PROMISED_TO_PAY: { label: 'Hẹn thanh toán', color: 'bg-emerald-100 text-emerald-800' },
  NO_ANSWER: { label: 'Không nghe máy', color: 'bg-amber-100 text-amber-800' },
  COMPLAINT: { label: 'Khiếu nại', color: 'bg-red-100 text-red-800' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: 'bg-blue-100 text-blue-800' },
  OTHER: { label: 'Khác', color: 'bg-gray-100 text-gray-800' }
};

const fmtDateTime = (str?: string) => {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const fmtDate = (str?: string) => {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
};

const DebtCollectionHistoryModal: React.FC<DebtCollectionHistoryModalProps> = ({
  isOpen,
  onClose,
  debtItem
}) => {
  const [logs, setLogs] = useState<DebtCollectionLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && debtItem) {
      fetchLogs();
    }
  }, [isOpen, debtItem]);

  const fetchLogs = async () => {
    if (!debtItem) return;
    try {
      setLoading(true);
      setError(null);
      const data = await debtApprovalApi.getCollectionLogs(debtItem.id);
      setLogs(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải lịch sử nhắc nợ');
    } finally {
      setLoading(false);
    }
  };

  if (!debtItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <IoTimeOutline className="text-primary text-xl" />
          <span>Lịch sử liên hệ đòi nợ — Hóa đơn {debtItem.invoiceNumber}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Customer subtitle */}
        <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl text-sm border border-border-grey">
          <div>
            <span className="font-semibold text-on-surface">{debtItem.guestName}</span>
            <span className="text-on-surface-variant ml-2">({debtItem.guestPhone || 'Không có SĐT'})</span>
          </div>
          <div className="text-xs text-on-surface-variant">
            Tổng cộng: <span className="font-semibold text-primary">{logs.length}</span> lần liên hệ
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-error border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            Đang tải dữ liệu lịch sử...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            Chưa có lần liên hệ đòi nợ nào được ghi nhận cho khoản này.
          </div>
        ) : (
          <div className="relative border-l-2 border-primary/30 ml-4 space-y-6 py-2">
            {logs.map((log) => {
              const resInfo = log.contactResult ? RESULT_LABELS[log.contactResult] : null;
              return (
                <div key={log.id} className="relative pl-6">
                  {/* Dot */}
                  <span className="absolute -left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-surface" />

                  <div className="bg-surface border border-border-grey rounded-xl p-4 shadow-xs space-y-2">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-grey pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-on-surface px-2 py-0.5 rounded-md bg-surface-container">
                          {METHOD_LABELS[log.channel || (log as any).contactMethod] || log.channel || (log as any).contactMethod}
                        </span>
                        {resInfo && (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${resInfo.color}`}>
                            {resInfo.label}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {fmtDateTime((log as any).contactDate || log.contactedAt)}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                      {log.notes}
                    </p>

                    {/* Footer / Meta */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-on-surface-variant pt-1 gap-2">
                      <div className="flex items-center gap-1">
                        <IoPersonOutline size={13} />
                        <span>Người ghi: <strong className="text-on-surface">{(log as any).recordedByName || log.createdByName || 'Hệ thống'}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        {((log as any).promisedDate) && (
                          <span className="text-emerald-600 font-medium">
                            Hẹn thanh toán: {fmtDate((log as any).promisedDate)}
                          </span>
                        )}
                        {log.nextReminderDate && (
                          <span className="text-amber-600 font-medium">
                            Nhắc lại: {fmtDate(log.nextReminderDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border-grey">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DebtCollectionHistoryModal;
