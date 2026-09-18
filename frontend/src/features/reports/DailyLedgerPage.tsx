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
      title: 'Chot so quy ngay ' + date,
      message: 'Sau khi chot, cac phieu chot ca trong ngay se bi khoa. Ban chac chan?',
      confirmText: 'Chot so ngay',
    });
    if (!ok) return;
    try {
      const data = await dailyLedgerApi.close(date);
      setLedger(data);
      success('Da chot so quy ngay ' + date);
    } catch (e: any) {
      error(e?.response?.data?.message || 'Khong the chot so ngay.');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) { error('Vui long nhap ly do mo lai.'); return; }
    const ok = await confirm({
      title: 'Mo lai so ngay ' + date,
      message: 'Mo lai so ngay se cho phep chinh sua lai phieu chot ca. Tiep tuc?',
      confirmText: 'Mo lai',
    });
    if (!ok) return;
    try {
      const data = await dailyLedgerApi.reopen(date, reopenReason);
      setLedger(data);
      setReopenReason('');
      setShowReopenForm(false);
      success('Da mo lai so ngay ' + date);
    } catch (e: any) {
      error(e?.response?.data?.message || 'Khong the mo lai so ngay.');
    }
  };

  const isClosed = ledger?.status === 'CLOSED';
  const hasOpenShifts = (ledger?.openShifts?.length ?? 0) > 0;
  const hasClosedShifts = (ledger?.shifts?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoBookOutline}
        title="So quy theo ngay"
        subtitle="Tong hop thu chi tu tat ca ca trong ngay de doi chieu so sach"
        actions={
          <Button variant="outline" size="sm" icon={IoRefreshOutline} onClick={load}>
            Tai lai
          </Button>
        }
      />

      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          label="Ngay"
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
        />
        {isClosed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            <IoCheckmarkCircleOutline size={14} /> Da chot so ngay
          </span>
        )}
        {!isClosed && !hasOpenShifts && hasClosedShifts && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            San sang chot so
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-sm text-on-surface-variant">Dang tai du lieu so ngay...</div>
      ) : ledger ? (
        <>
          {/* Canh bao ca con mo */}
          {hasOpenShifts && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
              <IoWarningOutline size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Chua the chot so - con {ledger.openShifts.length} ca chua chot:</p>
                <ul className="mt-1 space-y-0.5">
                  {ledger.openShifts.map(s => (
                    <li key={s.shiftId} className="text-sm text-amber-700">
                      Ca #{s.shiftId} - {s.openedByName} (mo luc {fmtDate(s.openedAt)})
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
                    <th className="p-3 text-left">Le tan</th>
                    <th className="p-3 text-left">Mo ca</th>
                    <th className="p-3 text-left">Chot ca</th>
                    <th className="p-3 text-right">Thu HD (TM)</th>
                    <th className="p-3 text-right">Thu HD (CK)</th>
                    <th className="p-3 text-right">Thu coc (TM)</th>
                    <th className="p-3 text-right">Hoan coc (TM)</th>
                    <th className="p-3 text-right">TM ly thuyet</th>
                    <th className="p-3 text-right">TM thuc dem</th>
                    <th className="p-3 text-right">Chenh lech</th>
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
                    <td className="p-3 text-on-surface" colSpan={3}>Tong ca ngay ({ledger.shifts.length} ca)</td>
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
              Chua co ca nao duoc chot trong ngay {date}.
            </div>
          )}

          {/* The tong quy ban giao */}
          {hasClosedShifts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest">
                <p className="text-xs text-on-surface-variant">Tong thu tien mat ly thuyet</p>
                <p className="mt-1 text-xl font-bold text-primary">{money(ledger.totalExpectedCash)}</p>
              </div>
              <div className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest">
                <p className="text-xs text-on-surface-variant">Tong thuc dem tien mat (tat ca ca)</p>
                <p className="mt-1 text-xl font-bold text-on-surface">{money(ledger.totalActualCash)}</p>
              </div>
              <div className={`p-4 border rounded-lg ${n(ledger.totalDiscrepancy) !== 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <p className="text-xs text-on-surface-variant">Tong chenh lech ca ngay</p>
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
                <span className="font-semibold text-green-800">So ngay da chot</span>
              </div>
              <p className="text-sm text-green-700">
                Chot boi <strong>{ledger.closedByName}</strong> luc {fmtDate(ledger.closedAt)}
              </p>
              {ledger.openReason && (
                <p className="text-sm text-green-700">Ly do mo lai gan nhat: {ledger.openReason}</p>
              )}
              {isOwner && !showReopenForm && (
                <Button variant="dangerOutline" size="sm" className="mt-2" onClick={() => setShowReopenForm(true)}>
                  Mo lai so ngay
                </Button>
              )}
              {isOwner && showReopenForm && (
                <div className="mt-3 space-y-3 max-w-md">
                  <Input label="Ly do mo lai" value={reopenReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReopenReason(e.target.value)} required />
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={handleReopen}>Xac nhan mo lai</Button>
                    <Button variant="ghost" onClick={() => setShowReopenForm(false)}>Huy</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nut chot so ngay */}
          {!isClosed && !hasOpenShifts && hasClosedShifts && (
            <div className="flex justify-end">
              <Button icon={IoLockClosedOutline} onClick={handleClose}>
                Chot so quy ngay {date}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default DailyLedgerPage;
