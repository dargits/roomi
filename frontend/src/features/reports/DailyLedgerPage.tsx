import React, { useCallback, useEffect, useState } from 'react';
import {
  IoBookOutline,
  IoCheckmarkCircleOutline,
  IoLockClosedOutline,
  IoRefreshOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import dailyLedgerApi, { DailyLedgerResponse } from '../../services/dailyLedgerApi';

const money = (v?: number | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);
const n = (v?: number | null) => Number(v || 0);
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const DailyLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, confirm } = useToast();
  const isOwner = user?.role === 'OWNER';

  const [date, setDate] = useState(toDateInput(new Date()));
  const [ledger, setLedger] = useState<DailyLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dailyLedgerApi.preview(date);
      setLedger(data);
    } catch (e: any) {
      error(e?.response?.data?.message || 'Khong the tai du lieu so ngay.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async () => {
    const ok = await confirm({
      title: 'Chốt sổ quỹ ngày ' + date,
      message: 'Sau khi chốt, các phiếu chốt ca trong ngày sẽ bị khóa và không thể mở lại trừ khi Chủ cơ sở mở lại sổ ngày. Bạn có chắc chắn?',
      confirmText: 'Chốt sổ ngày',
    });
    if (!ok) return;
    try {
      const data = await dailyLedgerApi.close(date);
      setLedger(data);
      success('Đã chốt sổ quỹ ngày ' + date);
    } catch (e: any) {
      error(e?.response?.data?.message || 'Không thể chốt sổ ngày.');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) { error('Vui lòng nhập lý do mở lại.'); return; }
    const ok = await confirm({
      title: 'Mở lại sổ ngày ' + date,
      message: 'Mở lại sổ ngày sẽ cho phép chỉnh sửa lại các phiếu chốt ca trong ngày đó. Bạn có chắc chắn muốn tiếp tục?',
      confirmText: 'Mở lại',
    });
    if (!ok) return;
    try {
      const data = await dailyLedgerApi.reopen(date, reopenReason);
      setLedger(data);
      setReopenReason('');
      setShowReopenForm(false);
      success('Đã mở lại sổ ngày ' + date);
    } catch (e: any) {
      error(e?.response?.data?.message || 'Không thể mở lại sổ ngày.');
    }
  };

  const isClosed = ledger?.status === 'CLOSED';
  const hasOpenShifts = (ledger?.openShifts?.length ?? 0) > 0;
  const hasClosedShifts = (ledger?.shifts?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoBookOutline}
        title="Sổ quỹ theo ngày"
        subtitle="Tổng hợp thu chi từ tất cả các ca trong ngày để đối chiếu sổ sách và báo cáo doanh thu"
        actions={
          <Button variant="outline" size="sm" icon={IoRefreshOutline} onClick={load}>
            Tải lại
          </Button>
        }
      />

      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          label="Ngày đối soát"
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
        />
        {isClosed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            <IoCheckmarkCircleOutline size={14} /> Đã chốt sổ ngày
          </span>
        )}
        {!isClosed && !hasOpenShifts && hasClosedShifts && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            Sẵn sàng chốt sổ
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-sm text-on-surface-variant">Đang tải dữ liệu sổ ngày...</div>
      ) : ledger ? (
        <>
          {/* Canh bao ca con mo */}
          {hasOpenShifts && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
              <IoWarningOutline size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Chưa thể chốt sổ - còn {ledger.openShifts.length} ca chưa chốt:</p>
                <ul className="mt-1 space-y-0.5">
                  {ledger.openShifts.map(s => (
                    <li key={s.shiftId} className="text-sm text-amber-700">
                      Ca #{s.shiftId} - {s.openedByName} (mở lúc {fmtDate(s.openedAt)})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Bang chi tiet tung ca */}
          {hasClosedShifts ? (
            <div className="overflow-x-auto border border-border-grey rounded-lg bg-surface-container-lowest">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="p-3 text-left">Lễ tân</th>
                    <th className="p-3 text-left">Mở ca</th>
                    <th className="p-3 text-left">Chốt ca</th>
                    <th className="p-3 text-right">Thu HĐ (TM)</th>
                    <th className="p-3 text-right">Thu HĐ (CK)</th>
                    <th className="p-3 text-right">Thu cọc (TM)</th>
                    <th className="p-3 text-right">Hoàn cọc (TM)</th>
                    <th className="p-3 text-right">TM lý thuyết</th>
                    <th className="p-3 text-right">TM thực đếm</th>
                    <th className="p-3 text-right">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.shifts.map(s => (
                    <tr key={s.id} className="border-t border-border-grey hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-3 font-medium">{s.openedByName}</td>
                      <td className="p-3 text-on-surface-variant text-xs">{fmtDate(s.openedAt)}</td>
                      <td className="p-3 text-on-surface-variant text-xs">{fmtDate(s.closedAt)}</td>
                      <td className="p-3 text-right">{money(s.invoiceCash)}</td>
                      <td className="p-3 text-right">{money(s.invoiceTransfer)}</td>
                      <td className="p-3 text-right">{money(s.depositCash)}</td>
                      <td className="p-3 text-right text-error">{money(-n(s.refundCash))}</td>
                      <td className="p-3 text-right font-medium">{money(s.expectedCash)}</td>
                      <td className="p-3 text-right">{money(s.actualCash)}</td>
                      <td className={`p-3 text-right font-semibold ${n(s.discrepancy) !== 0 ? 'text-error' : 'text-green-700'}`}>
                        {money(s.discrepancy)}
                      </td>
                    </tr>
                  ))}
                  {/* Footer tong hop */}
                  <tr className="border-t-2 border-border-grey bg-surface-container-low font-bold">
                    <td className="p-3 text-on-surface" colSpan={3}>Tổng cả ngày ({ledger.shifts.length} ca)</td>
                    <td className="p-3 text-right">{money(ledger.totalInvoiceCash)}</td>
                    <td className="p-3 text-right">{money(ledger.totalInvoiceTransfer)}</td>
                    <td className="p-3 text-right">{money(ledger.totalDepositCash)}</td>
                    <td className="p-3 text-right text-error">{money(-n(ledger.totalRefundCash))}</td>
                    <td className="p-3 text-right text-primary">{money(ledger.totalExpectedCash)}</td>
                    <td className="p-3 text-right">{money(ledger.totalActualCash)}</td>
                    <td className={`p-3 text-right ${n(ledger.totalDiscrepancy) !== 0 ? 'text-error' : 'text-green-700'}`}>
                      {money(ledger.totalDiscrepancy)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant text-sm border border-border-grey rounded-lg bg-surface-container-lowest">
              Chưa có ca nào được chốt trong ngày {date}.
            </div>
          )}

          {/* The tong quy ban giao */}
          {hasClosedShifts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest">
                <p className="text-xs text-on-surface-variant">Tổng thu tiền mặt lý thuyết</p>
                <p className="mt-1 text-xl font-bold text-primary">{money(ledger.totalExpectedCash)}</p>
              </div>
              <div className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest">
                <p className="text-xs text-on-surface-variant">Tổng thực đếm tiền mặt (tất cả ca)</p>
                <p className="mt-1 text-xl font-bold text-on-surface">{money(ledger.totalActualCash)}</p>
              </div>
              <div className={`p-4 border rounded-lg ${n(ledger.totalDiscrepancy) !== 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <p className="text-xs text-on-surface-variant">Tổng chênh lệch cả ngày</p>
                <p className={`mt-1 text-xl font-bold ${n(ledger.totalDiscrepancy) !== 0 ? 'text-error' : 'text-green-700'}`}>
                  {money(ledger.totalDiscrepancy)}
                </p>
              </div>
            </div>
          )}

          {/* Trang thai da chot */}
          {isClosed && (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <IoCheckmarkCircleOutline size={18} className="text-green-600" />
                <span className="font-semibold text-green-800">Sổ ngày đã chốt</span>
              </div>
              <p className="text-sm text-green-700">
                Chốt bởi <strong>{ledger.closedByName}</strong> lúc {fmtDate(ledger.closedAt)}
              </p>
              {ledger.openReason && (
                <p className="text-sm text-green-700">Lý do mở lại gần nhất: {ledger.openReason}</p>
              )}
              {isOwner && !showReopenForm && (
                <Button variant="dangerOutline" size="sm" className="mt-2" onClick={() => setShowReopenForm(true)}>
                  Mở lại sổ ngày
                </Button>
              )}
              {isOwner && showReopenForm && (
                <div className="mt-3 space-y-3 max-w-md">
                  <Input label="Lý do mở lại" value={reopenReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReopenReason(e.target.value)} required />
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={handleReopen}>Xác nhận mở lại</Button>
                    <Button variant="ghost" onClick={() => setShowReopenForm(false)}>Hủy</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nut chot so ngay */}
          {!isClosed && !hasOpenShifts && hasClosedShifts && (
            <div className="flex justify-end">
              <Button icon={IoLockClosedOutline} onClick={handleClose}>
                Chốt sổ quỹ ngày {date}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default DailyLedgerPage;
