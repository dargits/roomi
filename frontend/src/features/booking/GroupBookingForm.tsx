import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IoRemoveOutline, IoWalletOutline, IoInformationCircleOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { roomTypeApi } from '../../services/roomTypeApi';
import groupBookingApi from '../../services/groupBookingApi';
import { corporateClientApi, CorporateClient } from '../../services/corporateClientApi';
import { RoomTypeResponse, GroupBookingResponse } from '../../types';

interface RoomLine { roomTypeId: string | number; quantity: number | string; }
const emptyRoomLine = (): RoomLine => ({ roomTypeId: '', quantity: 1 });
interface GroupBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: GroupBookingResponse, isDraft?: boolean) => void;
}
const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v));

const GroupBookingForm: React.FC<GroupBookingFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [corporateClients, setCorporateClients] = useState<CorporateClient[]>([]);
  const [formData, setFormData] = useState({
    representativeName: '', representativePhone: '', representativeEmail: '',
    checkInDate: '', checkOutDate: '', note: '', corporateClientId: '', rooms: [emptyRoomLine()],
  });
  const [loading, setLoading] = useState(false);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({ representativeName: '', representativePhone: '', representativeEmail: '', checkInDate: '', checkOutDate: '', note: '', corporateClientId: '', rooms: [emptyRoomLine()] });
    setError(''); setPreview(null);
    setLoadingRoomTypes(true);
    roomTypeApi.getAllRoomTypes().then((d: RoomTypeResponse[]) => setRoomTypes((d || []).filter((r: any) => r.active))).catch(() => {}).finally(() => setLoadingRoomTypes(false));
    corporateClientApi.getAll(undefined, true).then(setCorporateClients).catch(() => {});
  }, [isOpen]);

  const runPreview = useCallback((data: typeof formData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const valid = data.checkInDate && data.checkOutDate && data.checkInDate < data.checkOutDate
      && data.rooms.length > 0 && data.rooms.every(r => r.roomTypeId && Number(r.quantity) >= 1);
    if (!valid) { setPreview(null); return; }
    timerRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await groupBookingApi.preview({
          representativeName: data.representativeName || 'preview',
          checkInDate: data.checkInDate, checkOutDate: data.checkOutDate,
          corporateClientId: data.corporateClientId ? Number(data.corporateClientId) : undefined,
          rooms: data.rooms.map(r => ({ roomTypeId: Number(r.roomTypeId), quantity: Number(r.quantity) })),
        });
        setPreview(result);
      } catch { setPreview(null); } finally { setPreviewLoading(false); }
    }, 700);
  }, []);

  const upd = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const n = { ...formData, [e.target.name]: e.target.value }; setFormData(n); runPreview(n);
  };
  const updRoom = (idx: number, f: keyof RoomLine, v: any) => {
    const n = { ...formData, rooms: formData.rooms.map((l, i) => i === idx ? { ...l, [f]: v } : l) }; setFormData(n); runPreview(n);
  };
  const addRoom = () => { const n = { ...formData, rooms: [...formData.rooms, emptyRoomLine()] }; setFormData(n); runPreview(n); };
  const remRoom = (idx: number) => { const n = { ...formData, rooms: formData.rooms.filter((_, i) => i !== idx) }; setFormData(n); runPreview(n); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (formData.checkInDate >= formData.checkOutDate) { setError('Ngày trả phòng phải sau ngày nhận phòng'); return; }
    if (formData.rooms.some(l => !l.roomTypeId || Number(l.quantity) < 1)) { setError('Vui lòng chọn loại phòng và số lượng'); return; }
    setLoading(true);
    try {
      const created = await groupBookingApi.create({
        ...formData,
        corporateClientId: formData.corporateClientId ? Number(formData.corporateClientId) : undefined,
        rooms: formData.rooms.map(l => ({ roomTypeId: Number(l.roomTypeId), quantity: Number(l.quantity) })),
      });
      if (onSuccess) onSuccess(created, false);
    } catch (err: any) { setError(err.response?.data?.message || 'Không thể tạo hồ sơ đoàn'); } finally { setLoading(false); }
  };

  const total = formData.rooms.reduce((s, l) => s + Number(l.quantity || 0), 0);
  const depositPos = Boolean(preview && preview.aboveThreshold && preview.requiredDepositAmount > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo hồ sơ đặt phòng đoàn" maxWidth="max-w-3xl">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">{error}</div>}
      <form id="groupBookingForm" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FBFDF9] border border-border-grey rounded-xl">
          <div className="md:col-span-2 font-bold text-xs uppercase tracking-wider text-[#586650]">Người đại diện đoàn</div>
          <Input label="Họ và tên" name="representativeName" value={formData.representativeName} onChange={upd} required />
          <Input label="Số điện thoại" name="representativePhone" value={formData.representativePhone} onChange={upd} placeholder="Dùng để tìm hoặc tạo hồ sơ khách" />
          <Input label="Email" type="email" name="representativeEmail" value={formData.representativeEmail} onChange={upd} />
          <div className="md:col-span-2">
            <label className="block text-sm font-label-md mb-1.5 text-on-surface-variant">
              Khách hàng công ty <span className="text-xs font-normal">(nếu đoàn có thỏa thuận giá)</span>
            </label>
            <select value={formData.corporateClientId}
              onChange={e => { const n = { ...formData, corporateClientId: e.target.value }; setFormData(n); runPreview(n); }}
              className="w-full px-3.5 py-2.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none text-sm text-[#002146] transition-all">
              <option value="">-- Khách lẻ / Không có thỏa thuận --</option>
              {corporateClients.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}{c.taxCode ? ` (MST: ${c.taxCode})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Ngày nhận phòng" type="date" name="checkInDate" value={formData.checkInDate} onChange={upd} required />
          <Input label="Ngày trả phòng" type="date" name="checkOutDate" value={formData.checkOutDate} onChange={upd} required />
        </div>

        <div className="border border-border-grey rounded-xl overflow-hidden">
          <div className="p-4 bg-[#FBFDF9] flex items-center justify-between border-b border-border-grey">
            <div className="font-bold text-xs uppercase tracking-wider text-[#586650]">Nhu cầu phòng</div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{total} phòng</span>
          </div>
          <div className="p-4 space-y-3">
            {formData.rooms.map((line, index) => {
              const usedIds = new Set(formData.rooms.filter((_, i) => i !== index && _.roomTypeId).map(r => Number(r.roomTypeId)));
              const opts = roomTypes.filter(rt => !usedIds.has(Number(rt.id)) || Number(rt.id) === Number(line.roomTypeId));
              return (
                <div key={index} className="grid grid-cols-[1fr_90px_38px] gap-3 items-end">
                  <label className="block text-sm text-on-surface-variant">
                    <span className="block font-label-md mb-1.5">Loại phòng</span>
                    <select value={line.roomTypeId} onChange={e => updRoom(index, 'roomTypeId', e.target.value)}
                      className="w-full py-2.5 px-3 bg-surface border border-border-grey rounded-lg outline-none focus:border-primary"
                      required disabled={loadingRoomTypes}>
                      <option value="">{loadingRoomTypes ? 'Đang tải...' : 'Chọn loại phòng'}</option>
                      {opts.map(rt => (<option key={rt.id} value={rt.id}>{rt.name}</option>))}
                    </select>
                  </label>
                  <Input label="Số lượng" type="number" min="1" step="1" value={String(line.quantity)} onChange={e => updRoom(index, 'quantity', e.target.value)} required />
                  <button type="button" onClick={() => remRoom(index)} disabled={formData.rooms.length === 1}
                    className="h-[42px] border border-red-200 text-error rounded-xl hover:bg-red-50 disabled:opacity-40 cursor-pointer">
                    <IoRemoveOutline className="mx-auto" size={18} />
                  </button>
                </div>
              );
            })}
            {formData.rooms.length < roomTypes.length && (
              <Button type="button" variant="outline" size="sm" onClick={addRoom}>Thêm loại phòng</Button>
            )}
          </div>
        </div>

        <Input label="Ghi chú" name="note" value={formData.note} onChange={upd} placeholder="Yêu cầu chung của đoàn..." />

        {/* ====== Preview Tiền Cọc Bắt Buộc (tính theo DepositPolicy) ====== */}
        {(previewLoading || preview) && (
          <div className={`rounded-xl border p-4 transition-all ${depositPos ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <IoWalletOutline size={18} className={depositPos ? 'text-amber-600' : 'text-emerald-600'} />
              <span className="font-semibold text-sm text-on-surface">Dự kiến tiền phòng &amp; đặt cọc</span>
              {previewLoading && <span className="text-xs text-on-surface-variant animate-pulse ml-1">Đang tính...</span>}
            </div>
            {preview && !previewLoading && (
              <>
                {preview.appliedAgreementName && (
                  <div className="mb-3 px-3 py-2 bg-blue-100/70 border border-blue-300 rounded-lg text-xs text-blue-900 flex items-center gap-2 font-medium">
                    <span className="text-base">🏷️</span>
                    <span>Áp dụng thỏa thuận giá công ty: <strong>{preview.appliedAgreementName}</strong> (giá phòng đã tự động tính theo thỏa thuận)</span>
                  </div>
                )}
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-amber-200 text-on-surface-variant">
                        <th className="py-1.5 pr-3 text-left font-semibold">Loại phòng</th>
                        <th className="py-1.5 pr-3 text-center font-semibold">SL</th>
                        <th className="py-1.5 pr-3 text-right font-semibold">Tổng tiền</th>
                        <th className="py-1.5 text-right font-semibold">Tiền cọc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.roomLines || []).map((rl: any, i: number) => (
                        <tr key={i} className="border-b border-amber-100 last:border-0">
                          <td className="py-1.5 pr-3 font-medium text-on-surface">{rl.roomTypeName}</td>
                          <td className="py-1.5 pr-3 text-center text-on-surface-variant">{rl.quantity}</td>
                          <td className="py-1.5 pr-3 text-right font-semibold text-on-surface">{fmt(rl.totalPrice)} đ</td>
                          <td className="py-1.5 text-right">
                            {depositPos ? (
                              <span className="font-bold text-amber-700">
                                {fmt(rl.depositAmount)} đ
                                <span className="font-normal text-on-surface-variant ml-1">({Number(rl.depositPercent || 0).toFixed(0)}%)</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-xs font-medium">
                                Miễn cọc
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200">
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{preview.nights} đêm</span>
                    {' · '}{preview.totalRooms} phòng
                    {' · '}Tổng: <span className="font-semibold text-on-surface">{fmt(preview.expectedTotal)} đ</span>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1.5 rounded-lg ${depositPos ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {depositPos ? (
                      <>💰 Cọc bắt buộc: {fmt(preview.requiredDepositAmount)} đ {preview.globalThreshold && Number(preview.globalThreshold) > 0 ? <span className="text-xs font-normal text-amber-700 ml-1">(đạt ngưỡng ≥ {fmt(Number(preview.globalThreshold))} đ)</span> : null}</>
                    ) : (
                      <>
                        ✅ Không bắt buộc cọc để xếp phòng {preview.globalThreshold && Number(preview.globalThreshold) > 0 ? <span className="text-xs font-normal text-emerald-700 ml-1">(tổng tiền &lt; {fmt(Number(preview.globalThreshold))} đ)</span> : null}
                        {preview.requiredDepositAmount > 0 && <span className="text-xs font-normal text-emerald-800 ml-1.5">· Cọc theo chính sách: {fmt(preview.requiredDepositAmount)} đ</span>}
                      </>
                    )}
                  </div>
                </div>
                {depositPos ? (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                    <IoInformationCircleOutline size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Cần thu đủ số tiền cọc bắt buộc trước khi xếp phòng.</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700">
                    <IoInformationCircleOutline size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Đoàn có thể được xếp phòng trực tiếp mà không bắt buộc đặt cọc trước.</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </form>
      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border-grey">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button type="submit" form="groupBookingForm" isLoading={loading}>Tạo hồ sơ đoàn</Button>
      </div>
    </Modal>
  );
};
export default GroupBookingForm;
