import React, { useEffect, useState } from 'react';
import { IoCashOutline, IoLockClosedOutline, IoRefreshOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import cashierShiftApi from '../../services/cashierShiftApi';
import { CashierShiftResponse } from '../../types';

const money = (value?: number | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const number = (value?: any) => Number(value || 0);

const Metric: React.FC<{ label: string; value: string | number | undefined | null; emphasize?: boolean }> = ({
  label,
  value,
  emphasize
}) => (
  <div className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest">
    <p className="text-xs text-on-surface-variant">{label}</p>
    <p className={`mt-1 font-bold ${emphasize ? 'text-primary text-lg' : 'text-on-surface'}`}>
      {typeof value === 'string' ? value : money(value)}
    </p>
  </div>
);

const CashierShiftPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, confirm } = useToast();
  const isReceptionist = user?.role === 'RECEPTIONIST';
  const canManage = ['OWNER', 'ACCOUNTANT'].includes(user?.role || '');
  const [shift, setShift] = useState<CashierShiftResponse | null>(null);
  const [history, setHistory] = useState<CashierShiftResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('0');
  const [openingNote, setOpeningNote] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [explanation, setExplanation] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [selectedShift, setSelectedShift] = useState<CashierShiftResponse | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (isReceptionist) {
        try {
          const current = await cashierShiftApi.getCurrent();
          setShift(current);
        } catch (requestError: any) {
          if (requestError?.response?.status === 404) setShift(null);
          else throw requestError;
        }
        const hist = await cashierShiftApi.getHistory();
        setHistory(hist);
      }
      if (canManage) {
        const list = await cashierShiftApi.list({ date: new Date().toISOString().slice(0, 10) });
        setHistory(list);
      }
    } catch (requestError: any) {
      error(requestError.response?.data?.message || 'Không thể tải thông tin ca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role]);

  const openShift = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await cashierShiftApi.open({ openingCash: number(openingCash), openingNote });
      setShift(created);
      success('Đã mở ca mới.');
    } catch (requestError: any) {
      error(requestError.response?.data?.message || 'Không thể mở ca.');
    }
  };

  const closeShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shift) return;
    const expected = number(shift.expectedCash);
    const actual = number(actualCash);
    if (actual !== expected && !explanation.trim()) {
      error('Vui lòng giải thích chênh lệch tiền mặt.');
      return;
    }
    const confirmed = await confirm({
      title: 'Chốt ca',
      message: 'Phiếu chốt ca sẽ được lưu và không thể sửa trực tiếp.',
      confirmText: 'Chốt ca'
    });
    if (!confirmed) return;
    try {
      const closed = await cashierShiftApi.close(shift.id, { actualCash: actual, discrepancyNote: explanation });
      setShift(closed);
      success('Đã chốt ca và lưu phiếu đối soát.');
    } catch (requestError: any) {
      error(requestError.response?.data?.message || 'Không thể chốt ca.');
    }
  };

  const reopenShift = async () => {
    if (!selectedShift || !reopenReason.trim()) {
      error('Vui lòng nhập lý do mở lại ca.');
      return;
    }
    try {
      await cashierShiftApi.reopen(selectedShift.id, { reason: reopenReason });
      setReopenReason('');
      setSelectedShift(null);
      success('Đã mở lại ca.');
      load();
    } catch (requestError: any) {
      error(requestError.response?.data?.message || 'Không thể mở lại ca.');
    }
  };

  const discrepancy = shift ? number(actualCash) - number(shift.expectedCash) : 0;
  const rows = shift
    ? [
        ['Thu hóa đơn', shift.invoiceCash, shift.invoiceTransfer, shift.invoiceCard],
        ['Thu tiền cọc', shift.depositCash, shift.depositTransfer, shift.depositCard],
        ['Hoàn tiền cọc', -number(shift.refundCash), -number(shift.refundTransfer), -number(shift.refundCard)],
      ]
    : [];

  if (!isReceptionist && !canManage) {
    return <div className="p-6 bg-red-50 border border-red-200 text-error text-sm">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoCashOutline}
        title="Chốt ca & đối soát"
        subtitle="Đối chiếu quỹ tiền mặt theo từng ca trực"
        actions={
          <Button variant="outline" size="sm" icon={IoRefreshOutline} onClick={load}>
            Tải lại
          </Button>
        }
      />
      {loading ? (
        <div className="p-6 text-sm text-on-surface-variant">Đang tải dữ liệu ca...</div>
      ) : (
        <>
          {isReceptionist && !shift && (
            <form onSubmit={openShift} className="max-w-xl bg-surface-container-lowest border border-border-grey p-5 rounded-lg space-y-4">
              <h2 className="font-bold text-on-surface">Mở ca mới</h2>
              <Input
                label="Tiền mặt đầu ca"
                type="number"
                min="0"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                required
              />
              <label className="block text-sm text-on-surface-variant">
                Ghi chú đầu ca
                <textarea
                  value={openingNote}
                  onChange={(event) => setOpeningNote(event.target.value)}
                  className="mt-1.5 w-full min-h-20 p-3 border border-border-grey rounded-lg"
                  maxLength={2000}
                />
              </label>
              <Button type="submit" icon={IoCashOutline}>
                Mở ca
              </Button>
            </form>
          )}

          {isReceptionist && shift && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Metric label="Quỹ đầu ca" value={shift.openingCash} />
                <Metric label="Tiền mặt lý thuyết" value={shift.expectedCash} emphasize />
                <Metric label="Trạng thái" value={shift.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'} />
              </div>
              <div className="overflow-x-auto border border-border-grey rounded-lg bg-surface-container-lowest">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="text-left p-3">Khoản mục</th>
                      <th className="text-right p-3">Tiền mặt</th>
                      <th className="text-right p-3">Chuyển khoản</th>
                      <th className="text-right p-3">Thẻ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, cash, transfer, card]) => (
                      <tr key={label as string} className="border-t border-border-grey">
                        <td className="p-3">{label}</td>
                        <td className="p-3 text-right">{money(cash as number)}</td>
                        <td className="p-3 text-right">{money(transfer as number)}</td>
                        <td className="p-3 text-right">{money(card as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shift.status === 'OPEN' ? (
                <form onSubmit={closeShift} className="max-w-xl bg-surface-container-lowest border border-border-grey p-5 rounded-lg space-y-4">
                  <h2 className="font-bold text-on-surface">Nhập tiền đếm thực tế</h2>
                  <Input
                    label="Tiền mặt thực đếm"
                    type="number"
                    min="0"
                    value={actualCash}
                    onChange={(event) => setActualCash(event.target.value)}
                    required
                  />
                  {actualCash !== '' && (
                    <p className={`text-sm font-bold ${discrepancy === 0 ? 'text-green-700' : 'text-error'}`}>
                      Chênh lệch: {money(discrepancy)}
                    </p>
                  )}
                  <label className="block text-sm text-on-surface-variant">
                    Giải thích chênh lệch {discrepancy !== 0 && <span className="text-error">*</span>}
                    <textarea
                      value={explanation}
                      onChange={(event) => setExplanation(event.target.value)}
                      className="mt-1.5 w-full min-h-20 p-3 border border-border-grey rounded-lg"
                      maxLength={2000}
                    />
                  </label>
                  <Button type="submit" icon={IoLockClosedOutline}>
                    Chốt ca
                  </Button>
                </form>
              ) : (
                <div className="p-5 border border-border-grey rounded-lg bg-surface-container-lowest">
                  <p className="font-bold">Phiếu chốt ca đã khóa</p>
                  <p className="mt-2 text-sm">
                    Thực đếm: {money(shift.actualCash)} | Chênh lệch: {money(shift.discrepancy)}
                  </p>
                  {shift.discrepancyNote && (
                    <p className="mt-2 text-sm text-on-surface-variant">Giải thích: {shift.discrepancyNote}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {(isReceptionist || canManage) && (
            <section className="space-y-3">
              <h2 className="font-bold text-on-surface">{isReceptionist ? 'Lịch sử ca đã chốt' : 'Phiếu chốt ca hôm nay'}</h2>
              <div className="overflow-x-auto border border-border-grey rounded-lg bg-surface-container-lowest">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="p-3 text-left">Lễ tân</th>
                      <th className="p-3 text-left">Mở ca</th>
                      <th className="p-3 text-left">Chốt ca</th>
                      <th className="p-3 text-right">Lý thuyết</th>
                      <th className="p-3 text-right">Thực đếm</th>
                      <th className="p-3 text-right">Chênh lệch</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-5 text-center text-on-surface-variant">
                          Chưa có phiếu chốt ca nào.
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.closingId || item.id} className="border-t border-border-grey">
                          <td className="p-3">{item.openedByName}</td>
                          <td className="p-3">{item.openedAt ? new Date(item.openedAt).toLocaleString('vi-VN') : '—'}</td>
                          <td className="p-3">{item.closedAt ? new Date(item.closedAt).toLocaleString('vi-VN') : '—'}</td>
                          <td className="p-3 text-right">{money(item.expectedCash)}</td>
                          <td className="p-3 text-right">{money(item.actualCash)}</td>
                          <td className={`p-3 text-right ${number(item.discrepancy) !== 0 ? 'text-error font-bold' : ''}`}>
                            {money(item.discrepancy)}
                          </td>
                          <td className="p-3 text-right">
                            {user?.role === 'OWNER' && (
                              <Button variant="dangerOutline" size="sm" onClick={() => setSelectedShift(item)}>
                                Mở lại
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {selectedShift && (
                <div className="max-w-xl p-5 border border-warning/40 bg-amber-50 rounded-lg space-y-3">
                  <p className="font-bold">Mở lại ca #{selectedShift.id}</p>
                  <Input
                    label="Lý do mở lại"
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={reopenShift}>
                      Xác nhận mở lại
                    </Button>
                    <Button variant="ghost" onClick={() => setSelectedShift(null)}>
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default CashierShiftPage;
