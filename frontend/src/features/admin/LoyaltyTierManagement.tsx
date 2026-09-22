import React, { useState, useEffect, useMemo } from "react";
import loyaltyApi from "../../services/loyaltyApi";
import { guestApi } from "../../services/guestApi";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LoadingScreen from "../../components/common/LoadingScreen";
import { useToast } from "../../context/ToastContext";

interface TierTheme {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  gradientHeader: string;
  cardBorder: string;
  cardHoverBorder: string;
  accentBar: string;
  pointPill: string;
}

const getTierTheme = (name: string, index: number): TierTheme => {
  const lower = (name || "").toLowerCase();
  if (lower.includes('đồng') || lower.includes('bronze')) {
    return {
      badgeBg: 'bg-[#FDF4EB]',
      badgeText: 'text-[#9A3412]',
      badgeBorder: 'border-[#FDBA74]',
      gradientHeader: 'from-[#7C2D12] via-[#9A3412] to-[#C2410C]',
      cardBorder: 'border-[#FED7AA]',
      cardHoverBorder: 'hover:border-[#FB923C]',
      accentBar: 'bg-[#EA580C]',
      pointPill: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]'
    };
  }
  if (lower.includes('bạc') || lower.includes('silver')) {
    return {
      badgeBg: 'bg-[#F1F5F9]',
      badgeText: 'text-[#334155]',
      badgeBorder: 'border-[#CBD5E1]',
      gradientHeader: 'from-[#334155] via-[#475569] to-[#64748B]',
      cardBorder: 'border-[#E2E8F0]',
      cardHoverBorder: 'hover:border-[#94A3B8]',
      accentBar: 'bg-[#64748B]',
      pointPill: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
    };
  }
  if (lower.includes('vàng') || lower.includes('gold')) {
    return {
      badgeBg: 'bg-[#FEFCE8]',
      badgeText: 'text-[#854D0E]',
      badgeBorder: 'border-[#FDE047]',
      gradientHeader: 'from-[#854D0E] via-[#B45309] to-[#D97706]',
      cardBorder: 'border-[#FEF08A]',
      cardHoverBorder: 'hover:border-[#FACC15]',
      accentBar: 'bg-[#EAB308]',
      pointPill: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
    };
  }
  if (lower.includes('kim cương') || lower.includes('diamond') || lower.includes('bạch kim') || lower.includes('platinum')) {
    return {
      badgeBg: 'bg-[#F0FDF4]',
      badgeText: 'text-[#166534]',
      badgeBorder: 'border-[#86EFAC]',
      gradientHeader: 'from-[#064E3B] via-[#047857] to-[#0D9488]',
      cardBorder: 'border-[#A7F3D0]',
      cardHoverBorder: 'hover:border-[#34D399]',
      accentBar: 'bg-[#10B981]',
      pointPill: 'bg-[#F0FDF4] text-[#047857] border-[#BBF7D0]'
    };
  }

  const fallbacks: TierTheme[] = [
    {
      badgeBg: 'bg-[#FDF4EB]',
      badgeText: 'text-[#9A3412]',
      badgeBorder: 'border-[#FDBA74]',
      gradientHeader: 'from-[#7C2D12] via-[#9A3412] to-[#C2410C]',
      cardBorder: 'border-[#FED7AA]',
      cardHoverBorder: 'hover:border-[#FB923C]',
      accentBar: 'bg-[#EA580C]',
      pointPill: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]'
    },
    {
      badgeBg: 'bg-[#F1F5F9]',
      badgeText: 'text-[#334155]',
      badgeBorder: 'border-[#CBD5E1]',
      gradientHeader: 'from-[#334155] via-[#475569] to-[#64748B]',
      cardBorder: 'border-[#E2E8F0]',
      cardHoverBorder: 'hover:border-[#94A3B8]',
      accentBar: 'bg-[#64748B]',
      pointPill: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
    },
    {
      badgeBg: 'bg-[#FEFCE8]',
      badgeText: 'text-[#854D0E]',
      badgeBorder: 'border-[#FDE047]',
      gradientHeader: 'from-[#854D0E] via-[#B45309] to-[#D97706]',
      cardBorder: 'border-[#FEF08A]',
      cardHoverBorder: 'hover:border-[#FACC15]',
      accentBar: 'bg-[#EAB308]',
      pointPill: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
    },
    {
      badgeBg: 'bg-[#F0FDF4]',
      badgeText: 'text-[#166534]',
      badgeBorder: 'border-[#86EFAC]',
      gradientHeader: 'from-[#064E3B] via-[#047857] to-[#0D9488]',
      cardBorder: 'border-[#A7F3D0]',
      cardHoverBorder: 'hover:border-[#34D399]',
      accentBar: 'bg-[#10B981]',
      pointPill: 'bg-[#F0FDF4] text-[#047857] border-[#BBF7D0]'
    }
  ];
  return fallbacks[index % fallbacks.length];
};

const EMPTY_FORM = { name: "", minPoints: 0, benefitDescription: "" };

const LoyaltyTierManagement: React.FC = () => {
  const [tiers, setTiers] = useState<any[]>([]);
  const [guestStats, setGuestStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Helper tách quyền lợi thành các dòng
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

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border-grey rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Quy Mô Cấp Bậc</p>
          <div className="text-2xl font-extrabold text-[#1A2411] mt-1 tracking-tight">
            {tiers.length} <span className="text-xs font-medium text-[#606D56]">hạng thành viên</span>
          </div>
          <p className="text-xs text-[#8A9A7D] mt-1">Từ hạng cơ bản đến VIP cao cấp</p>
        </div>

        <div className="bg-white border border-border-grey rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Tổng Hội Viên Đang Sở Hữu</p>
          <div className="text-2xl font-extrabold text-[#1A2411] mt-1 tracking-tight">
            {totalMembers} <span className="text-xs font-medium text-[#606D56]">khách hàng</span>
          </div>
          <p className="text-xs text-[#8A9A7D] mt-1">Được tự động xếp hạng khi tích lũy đủ điểm</p>
        </div>

        <div className="bg-white border border-border-grey rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#606D56]">Quy Tắc Đổi Điểm</p>
          <div className="text-xl font-extrabold text-[#1A2411] mt-1 tracking-tight">
            100.000 đ = 1 điểm
          </div>
          <p className="text-xs text-[#8A9A7D] mt-1">Hệ thống tự động cộng điểm sau mỗi kỳ lưu trú</p>
        </div>
      </div>

      {/* Danh sách các hạng dạng thẻ Luxury */}
      {loading ? (
        <div className="p-12 text-center"><LoadingScreen message="Đang tải danh mục hạng thành viên..." /></div>
      ) : tiers.length === 0 ? (
        <div className="p-12 text-center text-[#606D56] text-sm bg-white border border-border-grey rounded-2xl shadow-2xs">
          Chưa có hạng thành viên nào được tạo. Bấm "Thêm hạng mới" để bắt đầu xây dựng chương trình khách thân thiết.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tiers.map((tier, idx) => {
            const stat = guestStats.find(s => s.id === tier.id);
            const theme = getTierTheme(tier.name, idx);
            const benefits = parseBenefits(tier.benefitDescription);

            return (
              <div
                key={tier.id}
                className={`group relative bg-white border ${theme.cardBorder} ${theme.cardHoverBorder} rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between`}
              >
                {/* Top Luxury Banner Strip */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradientHeader}`} />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Tier Header: Rank badge & Points requirement */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider font-mono border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                        CẤP 0{idx + 1}
                      </span>
                      <h3 className="font-extrabold text-lg text-[#16220E] tracking-tight mt-1.5 group-hover:text-primary transition-colors">
                        {tier.name}
                      </h3>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full border text-xs font-extrabold tracking-tight shrink-0 shadow-2xs ${theme.pointPill}`}>
                      Từ {tier.minPoints.toLocaleString("vi-VN")} điểm
                    </div>
                  </div>

                  {/* Chi tiêu tối thiểu ước tính */}
                  <div className="text-[11px] text-[#606D56] font-medium mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A7D] shrink-0" />
                    <span>
                      Chi tiêu tích lũy từ: <strong>{(tier.minPoints * 100000).toLocaleString("vi-VN")} đ</strong>
                    </span>
                  </div>

                  {/* Danh sách đặc quyền */}
                  <div className="mt-1 flex-1">
                    <p className="text-[11px] uppercase font-bold text-[#8A9A7D] tracking-wider mb-2">
                      Đặc Quyền & Ưu Đãi
                    </p>
                    <div className="space-y-1.5">
                      {benefits.length > 0 ? (
                        benefits.map((benefitText, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs text-[#2A3820] leading-relaxed">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.accentBar} mt-1.5 shrink-0`} />
                            <span className="font-medium">{benefitText}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#8A9A7D] italic">Chưa cấu hình đặc quyền.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="px-5 py-3.5 bg-[#FAFDF7] border-t border-border-grey/70 flex items-center justify-between text-xs">
                  <div className="text-[#606D56]">
                    <strong className="text-[#1A2411] font-bold text-sm font-mono mr-1">
                      {stat ? stat.guestCount : 0}
                    </strong>
                    <span>hội viên đạt hạng</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(tier)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-border-grey hover:bg-[#F2F6ED] text-[#1A2411] transition-all cursor-pointer shadow-2xs hover:border-[#CCD8C2]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tier)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
