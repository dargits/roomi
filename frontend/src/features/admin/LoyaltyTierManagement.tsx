import React, { useState, useEffect, useMemo } from "react";
import loyaltyApi from "../../services/loyaltyApi";
import { guestApi } from "../../services/guestApi";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LoadingScreen from "../../components/common/LoadingScreen";
import { useToast } from "../../context/ToastContext";

interface TierTheme {
  cardGradient: string;
  accentDot: string;
  cardBorder: string;
  badgeBorder: string;
}

const getTierTheme = (name: string, index: number): TierTheme => {
  const lower = (name || "").toLowerCase();
  if (lower.includes('đồng') || lower.includes('bronze')) {
    return {
      cardGradient: 'from-[#381E10] via-[#542E18] to-[#241208]',
      accentDot: 'bg-[#EA580C]',
      cardBorder: 'border-[#FED7AA]',
      badgeBorder: 'border-[#FDBA74]'
    };
  }
  if (lower.includes('bạc') || lower.includes('silver')) {
    return {
      cardGradient: 'from-[#1E293B] via-[#334155] to-[#0F172A]',
      accentDot: 'bg-[#94A3B8]',
      cardBorder: 'border-[#E2E8F0]',
      badgeBorder: 'border-[#CBD5E1]'
    };
  }
  if (lower.includes('vàng') || lower.includes('gold')) {
    return {
      cardGradient: 'from-[#553106] via-[#78450A] to-[#351C02]',
      accentDot: 'bg-[#F59E0B]',
      cardBorder: 'border-[#FEF08A]',
      badgeBorder: 'border-[#FDE047]'
    };
  }
  if (lower.includes('kim cương') || lower.includes('diamond') || lower.includes('bạch kim') || lower.includes('platinum')) {
    return {
      cardGradient: 'from-[#063327] via-[#094A38] to-[#032019]',
      accentDot: 'bg-[#10B981]',
      cardBorder: 'border-[#A7F3D0]',
      badgeBorder: 'border-[#86EFAC]'
    };
  }

  const fallbacks: TierTheme[] = [
    {
      cardGradient: 'from-[#381E10] via-[#542E18] to-[#241208]',
      accentDot: 'bg-[#EA580C]',
      cardBorder: 'border-[#FED7AA]',
      badgeBorder: 'border-[#FDBA74]'
    },
    {
      cardGradient: 'from-[#1E293B] via-[#334155] to-[#0F172A]',
      accentDot: 'bg-[#94A3B8]',
      cardBorder: 'border-[#E2E8F0]',
      badgeBorder: 'border-[#CBD5E1]'
    },
    {
      cardGradient: 'from-[#553106] via-[#78450A] to-[#351C02]',
      accentDot: 'bg-[#F59E0B]',
      cardBorder: 'border-[#FEF08A]',
      badgeBorder: 'border-[#FDE047]'
    },
    {
      cardGradient: 'from-[#063327] via-[#094A38] to-[#032019]',
      accentDot: 'bg-[#10B981]',
      cardBorder: 'border-[#A7F3D0]',
      badgeBorder: 'border-[#86EFAC]'
    }
  ];
  return fallbacks[index % fallbacks.length];
};

const EMPTY_FORM = { name: "", minPoints: 0, benefitDescription: "" };

const LoyaltyTierManagement: React.FC = () => {
  const [tiers, setTiers] = useState<any[]>([]);
  const [guestStats, setGuestStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { success: toastSuccess, error: toastError, confirm } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersData, guestsData] = await Promise.all([
        loyaltyApi.getTiers(),
        guestApi.getGuests(),
      ]);
      setTiers(tiersData || []);
      // Thống kê số khách mỗi hạng
      const stats = (tiersData || []).map((tier: any) => ({
        ...tier,
        guestCount: (guestsData || []).filter((g: any) => g.loyaltyTierId === tier.id).length,
      }));
      setGuestStats(stats);
    } catch { setError("Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  };

  const totalMembers = useMemo(() => {
    return guestStats.reduce((acc, curr) => acc + (curr.guestCount || 0), 0);
  }, [guestStats]);

  const openCreate = () => { 
    setEditingTier(null); 
    setForm(EMPTY_FORM); 
    setError(""); 
    setShowModal(true); 
  };

  const openEdit = (tier: any) => {
    setEditingTier(tier);
    setForm({ name: tier.name, minPoints: tier.minPoints, benefitDescription: tier.benefitDescription || "" });
    setError(""); 
    setShowModal(true);
  };

  const closeModal = () => { 
    setShowModal(false); 
    setEditingTier(null); 
    setError(""); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "minPoints" ? Number(value) : value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên hạng."); return; }
    setSaving(true); setError("");
    try {
      if (editingTier) { 
        await loyaltyApi.updateTier(editingTier.id, form); 
        toastSuccess(`Đã cập nhật hạng "${form.name}" thành công!`);
      } else { 
        await loyaltyApi.createTier(form); 
        toastSuccess(`Đã tạo hạng "${form.name}" thành công!`);
      }
      closeModal(); 
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi lưu dữ liệu.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (tier: any) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận xóa hạng thành viên',
      message: `Bạn có chắc chắn muốn xóa hạng "${tier.name}"? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa hạng',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try { 
      await loyaltyApi.deleteTier(tier.id); 
      toastSuccess(`Đã xóa hạng "${tier.name}" thành công!`);
      fetchData(); 
    } catch (err: any) { 
      toastError(err.response?.data?.message || "Không thể xóa hạng này."); 
    }
  };

  // Tách quyền lợi thành các gạch đầu dòng ngắn gọn
  const parseBenefits = (desc: string) => {
    if (!desc || !desc.trim()) return [];
    return desc
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-grey">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#16220E] tracking-tight">
            Hạng Thành Viên & Khách Thân Thiết
          </h1>
          <p className="text-xs sm:text-sm text-[#606D56] mt-1 font-medium">
            Thiết lập danh mục cấp bậc khách hàng, ngưỡng điểm tích lũy và đặc quyền ưu đãi dành riêng.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate} className="shrink-0 shadow-xs">
          Thêm hạng mới
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-error rounded-2xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Overview Metric Bar & View Switcher */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border-grey">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF5CD] text-[#3F4F24] flex items-center justify-center font-extrabold text-sm shadow-2xs">
              {tiers.length}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Quy Mô Cấp Bậc</p>
              <p className="text-xs font-extrabold text-[#1A2411]">
                {tiers.length} hạng thành viên
              </p>
            </div>
          </div>

          <div className="sm:pl-6 pt-3 sm:pt-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F0FA] text-[#1E40AF] flex items-center justify-center font-extrabold text-sm shadow-2xs">
              {totalMembers}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Hội Viên Đang Sở Hữu</p>
              <p className="text-xs font-extrabold text-[#1A2411]">
                {totalMembers} khách hàng
              </p>
            </div>
          </div>

          <div className="sm:pl-6 pt-3 sm:pt-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center font-extrabold text-xs shadow-2xs">
              100k
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Quy Tắc Đổi Điểm</p>
              <p className="text-xs font-extrabold text-[#1A2411]">
                100.000 đ = 1 điểm
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-[#F2F6ED] p-1 rounded-xl border border-border-grey self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'cards' 
                ? 'bg-white text-[#1A2411] shadow-2xs' 
                : 'text-[#606D56] hover:text-[#1A2411]'
            }`}
          >
            Thẻ Hội Viên VIP
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table' 
                ? 'bg-white text-[#1A2411] shadow-2xs' 
                : 'text-[#606D56] hover:text-[#1A2411]'
            }`}
          >
            Bảng So Sánh Quyền Lợi
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center"><LoadingScreen message="Đang tải danh mục hạng thành viên..." /></div>
      ) : tiers.length === 0 ? (
        <div className="p-12 text-center text-[#606D56] text-sm bg-white border border-border-grey rounded-2xl shadow-2xs">
          Chưa có hạng thành viên nào được tạo. Bấm "Thêm hạng mới" để bắt đầu xây dựng chương trình khách thân thiết.
        </div>
      ) : viewMode === 'cards' ? (
        /* DẠNG THẺ VIP CHUYÊN NGHIỆP */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {tiers.map((tier, idx) => {
            const stat = guestStats.find(s => s.id === tier.id);
            const theme = getTierTheme(tier.name, idx);
            const benefits = parseBenefits(tier.benefitDescription);

            return (
              <div
                key={tier.id}
                className="group bg-white border border-border-grey rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Phần mặt thẻ VIP sang trọng */}
                <div className={`p-5 bg-gradient-to-br ${theme.cardGradient} text-white relative overflow-hidden shadow-inner`}>
                  {/* Họa tiết chìm tinh tế */}
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute right-8 -top-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white/75 font-mono">
                        STAY AWAY • CẤP 0{idx + 1}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-xs text-white border border-white/20 font-mono shadow-2xs">
                      {tier.minPoints.toLocaleString("vi-VN")} ĐIỂM
                    </span>
                  </div>

                  <div className="mt-4 relative z-10">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-white/80 mt-1 font-medium">
                      Tích lũy từ: <strong className="text-white">{(tier.minPoints * 100000).toLocaleString("vi-VN")} đ</strong>
                    </p>
                  </div>
                </div>

                {/* Danh sách đặc quyền & footer */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#606D56] mb-2.5 flex items-center justify-between">
                      <span>Đặc Quyền Dành Riêng</span>
                      <span className="text-[10px] text-[#8A9A7D] font-normal">{benefits.length} quyền lợi</span>
                    </div>

                    <div className="space-y-2">
                      {benefits.length > 0 ? (
                        benefits.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs text-[#1A2411] leading-relaxed">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.accentDot} mt-1.5 shrink-0`} />
                            <span className="font-medium">{b}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#8A9A7D] italic">Chưa cấu hình đặc quyền.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-border-grey/70 flex items-center justify-between text-xs">
                    <div className="text-[#606D56]">
                      <strong className="text-[#1A2411] font-extrabold text-sm font-mono mr-1">
                        {stat ? stat.guestCount : 0}
                      </strong>
                      <span>hội viên</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(tier)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tier)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DẠNG BẢNG SO SÁNH QUYỀN LỢI CHI TIẾT */
        <div className="bg-white border border-border-grey rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-grey bg-[#FAFDF7] text-[11px] font-bold uppercase tracking-wider text-[#606D56]">
                  <th className="p-4">Cấp Bậc</th>
                  <th className="p-4">Tên Hạng</th>
                  <th className="p-4">Ngưỡng Điểm</th>
                  <th className="p-4">Chi Tiêu Tích Lũy</th>
                  <th className="p-4">Số Hội Viên</th>
                  <th className="p-4">Đặc Quyền & Ưu Đãi</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {tiers.map((tier, idx) => {
                  const stat = guestStats.find(s => s.id === tier.id);
                  const theme = getTierTheme(tier.name, idx);
                  const benefits = parseBenefits(tier.benefitDescription);

                  return (
                    <tr key={tier.id} className="hover:bg-[#F7FAF4] transition-colors">
                      <td className="p-4 font-mono font-bold text-[#606D56]">
                        CẤP 0{idx + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-sm text-[#1A2411]">{tier.name}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                          {tier.minPoints.toLocaleString("vi-VN")} điểm
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[#606D56]">
                        {(tier.minPoints * 100000).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#EAF5CD] text-[#3F4F24]">
                          {stat ? stat.guestCount : 0} hội viên
                        </span>
                      </td>
                      <td className="p-4 max-w-md">
                        <div className="space-y-1">
                          {benefits.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1.5 text-[#2A3820] font-medium leading-relaxed">
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.accentDot} mt-1.5 shrink-0`} />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(tier)}
                            className="px-2.5 py-1 font-bold text-xs rounded-lg hover:bg-surface-container text-primary cursor-pointer transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tier)}
                            className="px-2.5 py-1 font-bold text-xs rounded-lg hover:bg-red-50 text-error cursor-pointer transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa Hạng */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingTier ? `Chỉnh sửa hạng: ${editingTier.name}` : "Tạo Hạng Thành Viên Mới"}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#606D56] mb-1.5">
                Tên Hạng Thành Viên *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: Hội viên Vàng, Kim Cương, VIP..."
                required
                className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl text-sm bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#606D56]">
                  Điểm Tối Thiểu Đạt Hạng *
                </label>
                <span className="text-[11px] text-[#8A9A7D] font-medium">
                  1 điểm = 100.000 đ chi tiêu
                </span>
              </div>
              <input
                type="number"
                name="minPoints"
                min="0"
                value={form.minPoints}
                onChange={handleChange}
                placeholder="VD: 500"
                className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl text-sm bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium font-mono"
              />
              <p className="text-xs text-[#8A9A7D] mt-1 font-medium">
                Tương đương chi tiêu tích lũy từ: <strong className="text-[#1A2411]">{(Number(form.minPoints || 0) * 100000).toLocaleString("vi-VN")} đ</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#606D56] mb-1.5">
                Đặc Quyền & Ưu Đãi Dành Riêng
              </label>
              <textarea
                name="benefitDescription"
                value={form.benefitDescription}
                onChange={handleChange}
                rows={3}
                placeholder="Nhập các quyền lợi cách nhau bằng dấu phẩy hoặc xuống dòng (VD: Giảm 10% tiền phòng, Miễn phí nhận phòng sớm, Nâng hạng phòng miễn phí)"
                className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl text-sm bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium resize-none leading-relaxed"
              />
              <p className="text-[11px] text-[#8A9A7D] mt-1">
                Gợi ý: Các quyền lợi phân cách bằng dấu phẩy sẽ được tự động hiển thị dạng danh sách gạch đầu dòng chuyên nghiệp.
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-border-grey">
              <Button type="button" variant="ghost" size="md" onClick={closeModal}>
                Hủy bỏ
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={saving}>
                {editingTier ? "Lưu thay đổi" : "Tạo hạng thành viên"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LoyaltyTierManagement;
