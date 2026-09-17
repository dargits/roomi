import React from 'react';
import {
  IoReceiptOutline,
  IoCallOutline,
  IoTimeOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import {
  CustomerDebtSummaryDto,
  DebtAgingItemResponse
} from '../../types/report';

interface CustomerDebtInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDebtSummaryDto | null;
  items: DebtAgingItemResponse[];
  onOpenCollectionModal: (item: DebtAgingItemResponse) => void;
  onOpenHistoryModal: (item: DebtAgingItemResponse) => void;
  onQuickUpdateResult?: (item: DebtAgingItemResponse, newResult: string, newPromisedDate?: string) => void;
}

const CONTACT_RESULT_OPTIONS = [
  { value: '', label: '— Chưa cập nhật kết quả —' },
  { value: 'PROMISED_TO_PAY', label: '✅ Khách hẹn thanh toán' },
  { value: 'NO_ANSWER', label: '📵 Không nghe máy / Chưa phản hồi' },
  { value: 'COMPLAINT', label: '⚠️ Khách khiếu nại hóa đơn' },
  { value: 'PENDING_APPROVAL', label: '⏳ Chờ kế toán bên khách duyệt' },
  { value: 'OTHER', label: '📋 Khác' }
];

const BUCKET_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  CURRENT: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  OVERDUE_UNDER_15: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800'
  },
  OVERDUE_15_TO_30: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800'
  },
  OVERDUE_OVER_30: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-800'
  }
};

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtDate = (str?: string) => {
  if (!str) return '—';
  const parts = str.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
};

const CustomerDebtInvoicesModal: React.FC<CustomerDebtInvoicesModalProps> = ({
  isOpen,
  onClose,
  customer,
  items,
  onOpenCollectionModal,
  onOpenHistoryModal,
  onQuickUpdateResult
}) => {
  if (!customer) return null;

  // Filter items belonging to this customer
  const customerItems = items.filter(
    (item) => (customer.guestId ? item.guestId === customer.guestId : item.guestName === customer.guestName)
  );

  const totalDebt = customer.totalDebt || customerItems.reduce((acc, curr) => acc + (curr.debtAmount || 0), 0);
  const invoiceCount = customerItems.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <IoReceiptOutline className="text-primary text-xl" />
          <span>Danh sách hóa đơn nợ — {customer.guestName}</span>
        </div>
      }
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4">
        {/* Customer Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-grey">
            <div className="text-xs text-on-surface-variant font-medium">Khách hàng / SĐT</div>
            <div className="font-semibold text-on-surface text-sm truncate mt-0.5">{customer.guestName}</div>
            <div className="text-xs text-primary font-mono">{customer.guestPhone || 'Chưa có SĐT'}</div>
          </div>

          <div className="bg-red-50/70 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-200 dark:border-red-900/40">
            <div className="text-xs text-red-700 dark:text-red-400 font-medium">Tổng dư nợ</div>
            <div className="font-extrabold text-error text-base mt-0.5">{fmtCurrency(totalDebt)}</div>
            <div className="text-[11px] text-red-600 dark:text-red-400">{invoiceCount} hóa đơn còn nợ</div>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-grey">
            <div className="text-xs text-on-surface-variant font-medium">Hạn cam kết sớm nhất</div>
            <div className="font-semibold text-on-surface text-sm mt-0.5">{fmtDate(customer.earliestDueDate)}</div>
            <div className="text-[11px] text-on-surface-variant">Ngày thanh toán dự kiến</div>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-grey">
            <div className="text-xs text-on-surface-variant font-medium">Mức rủi ro / Quá hạn</div>
            <div className="mt-0.5">
              {(customer as any).maxDaysOverdue > 0 ? (
                <span className="text-rose-600 font-bold text-sm">
                  Quá hạn {(customer as any).maxDaysOverdue} ngày
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold text-sm">Trong hạn</span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {(customer as any).highestRiskBucket === 'OVERDUE_OVER_30'
                ? 'Rất cao (>30 ngày)'
                : (customer as any).highestRiskBucket === 'OVERDUE_15_TO_30'
                ? 'Cao (15 - 30 ngày)'
                : (customer as any).highestRiskBucket === 'OVERDUE_UNDER_15'
                ? 'Vừa (< 15 ngày)'
                : 'Trong hạn'}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="border border-border-grey rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container text-on-surface-variant text-xs border-b border-border-grey shadow-2xs">
                <tr>
                  <th className="p-3 font-semibold">Mã HĐ</th>
                  <th className="p-3 font-semibold">Phòng</th>
                  <th className="p-3 font-semibold">Ngày trả phòng</th>
                  <th className="p-3 font-semibold">Hạn cam kết</th>
                  <th className="p-3 font-semibold text-center">Quá hạn</th>
                  <th className="p-3 font-semibold text-right">Còn nợ</th>
                  <th className="p-3 font-semibold">Trạng thái nhắc</th>
                  <th className="p-3 font-semibold">Kết quả liên hệ</th>
                  <th className="p-3 font-semibold">Liên hệ gần nhất</th>
                  <th className="p-3 font-semibold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey bg-surface-container-lowest">
                {customerItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-on-surface-variant text-sm">
                      Không tìm thấy hóa đơn nợ chi tiết nào của khách hàng này.
                    </td>
                  </tr>
                ) : (
                  customerItems.map((item) => {
                    const bucket = BUCKET_COLORS[item.agingBucket] || BUCKET_COLORS.CURRENT;
                    const isDueToday = item.reminderStatus === 'DUE_TODAY';
                    const isOverdueReminder = item.reminderStatus === 'OVERDUE_REMINDER';

                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">
                          {item.invoiceNumber}
                        </td>
                        <td className="p-3 font-medium text-on-surface">
                          {item.roomNumber || '—'}
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          {fmtDate(item.checkOutDate)}
                        </td>
                        <td className="p-3 text-xs font-medium text-on-surface">
                          {fmtDate(item.dueDate)}
                        </td>
                        <td className="p-3 text-center">
                          {item.daysOverdue > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${bucket.badge}`}>
                              +{item.daysOverdue}d
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-medium">
                              Trong hạn
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-extrabold text-error">
                          {fmtCurrency(item.debtAmount)}
                        </td>
                        <td className="p-3 text-xs">
                          {isDueToday ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800 animate-pulse">
                              🔔 Cần nhắc hôm nay
                            </span>
                          ) : isOverdueReminder ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-800">
                              ⚠️ Quá hẹn nhắc
                            </span>
                          ) : item.nextReminderDate ? (
                            <span className="text-[11px] text-on-surface-variant">
                              Hẹn: {fmtDate(item.nextReminderDate)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-on-surface-variant/60">
                              Chưa đặt lịch
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 min-w-[180px]">
                            <select
                              aria-label="Kết quả liên hệ"
                              className={`w-full text-xs py-1 px-2 rounded-lg border focus:outline-hidden font-medium transition-colors ${
                                item.lastContactResult === 'PROMISED_TO_PAY'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : item.lastContactResult === 'NO_ANSWER'
                                  ? 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300'
                                  : item.lastContactResult === 'COMPLAINT'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                  : item.lastContactResult === 'PENDING_APPROVAL'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-surface text-on-surface border-border-grey'
                              }`}
                              value={item.lastContactResult || ''}
                              onChange={(e) => onQuickUpdateResult?.(item, e.target.value, item.promisedDate)}
                            >
                              {CONTACT_RESULT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            {item.lastContactResult === 'PROMISED_TO_PAY' && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">Hẹn:</span>
                                <input
                                  type="date"
                                  className="text-xs py-0.5 px-1.5 rounded border border-emerald-300 bg-white dark:bg-surface text-on-surface w-full focus:outline-hidden"
                                  value={item.promisedDate || ''}
                                  onChange={(e) => onQuickUpdateResult?.(item, 'PROMISED_TO_PAY', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          {item.lastContactedAt ? (
                            <div className="max-w-[140px]">
                              <div className="text-on-surface-variant text-[11px] font-medium">
                                {fmtDate(item.lastContactedAt.slice(0, 10))}
                              </div>
                              <div className="text-on-surface truncate text-xs" title={item.lastContactNote}>
                                {item.lastContactNote || '—'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant/60 italic text-xs">Chưa liên hệ</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenCollectionModal(item);
                              }}
                              title="Ghi nhận liên hệ đòi nợ"
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <IoCallOutline size={13} />
                              Nhắc thu
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenHistoryModal(item);
                              }}
                              title="Xem lịch sử các lần đòi nợ"
                              className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-medium transition-colors cursor-pointer"
                            >
                              Lịch sử ({item.contactCount || (item as any).collectionCount || 0})
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-border-grey">
          <div className="text-xs text-on-surface-variant">
            Hiển thị <strong>{customerItems.length}</strong> hóa đơn nợ của khách hàng <strong>{customer.guestName}</strong>
          </div>
          <Button type="button" variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerDebtInvoicesModal;
