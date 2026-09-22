import React, { useState, useEffect } from "react";
import loyaltyApi from "../../services/loyaltyApi";
import { guestApi } from "../../services/guestApi";
import Button from "../../components/ui/Button";
import LoadingScreen from "../../components/common/LoadingScreen";
import { useToast } from "../../context/ToastContext";

const EMPTY_FORM = { name: "", minPoints: 0, benefitDescription: "" };

const LoyaltyTierManagement: React.FC = () => {
  const [tiers, setTiers] = useState<any[]>([]);
  const [guestStats, setGuestStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  const openCreate = () => { setEditingTier(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (tier: any) => {
    setEditingTier(tier);
    setForm({ name: tier.name, minPoints: tier.minPoints, benefitDescription: tier.benefitDescription || "" });
    setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingTier(null); setError(""); };

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
      closeForm(); fetchData();
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-grey">
        <div>
          <h1 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
            Hạng Thành Viên & Khách Thân Thiết
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Quản lý cấp bậc thành viên, ngưỡng điểm tích lũy và chính sách ưu đãi cho khách hàng.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
          Thêm hạng mới
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-error rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Form thêm/sửa inline */}
      {showForm && (
        <form onSubmit={handleSave} className="p-4 bg-surface-container-low border border-border-grey rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface">
              {editingTier ? `Chỉnh sửa hạng: ${editingTier.name}` : "Tạo hạng thành viên mới"}
            </h2>
            <button type="button" onClick={closeForm} className="text-xs font-semibold text-on-surface-variant hover:text-on-surface">
              Đóng
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Tên hạng thành viên *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: Vàng, Kim Cương..."
                required
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Điểm tối thiểu đạt hạng (1 điểm = 100k VNĐ)</label>
              <input
                type="number"
                name="minPoints"
                min="0"
                value={form.minPoints}
                onChange={handleChange}
                placeholder="VD: 100"
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Quyền lợi & Ưu đãi của hạng</label>
              <textarea
                name="benefitDescription"
                value={form.benefitDescription}
                onChange={handleChange}
                rows={2}
                placeholder="VD: Giảm 10% tiền phòng, miễn phí trả phòng muộn 2 tiếng..."
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>Hủy</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              {editingTier ? "Lưu thay đổi" : "Tạo hạng"}
            </Button>
          </div>
        </form>
      )}

      {/* Danh sách các hạng dạng thẻ */}
      {loading ? (
        <div className="p-8 text-center"><LoadingScreen message="Đang tải hạng thành viên..." /></div>
      ) : tiers.length === 0 ? (
        <div className="p-10 text-center text-on-surface-variant text-sm bg-surface-container-lowest border border-border-grey rounded-2xl">
          Chưa có hạng thành viên nào được tạo.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {tiers.map((tier, idx) => {
            const stat = guestStats.find(s => s.id === tier.id);

            return (
              <div
                key={tier.id}
                className="bg-white border border-border-grey rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface uppercase tracking-wider font-mono">
                        Cấp {idx + 1}
                      </span>
                      <h3 className="font-bold text-base text-on-surface">{tier.name}</h3>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                      Từ {tier.minPoints.toLocaleString("vi-VN")} điểm
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 mb-4">
                    {tier.benefitDescription || "Chưa có mô tả quyền lợi."}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-border-grey flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">
                    {stat ? stat.guestCount : 0} khách đạt hạng
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(tier)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-surface-container text-primary transition-colors cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tier)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-red-50 text-error transition-colors cursor-pointer"
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
    </div>
  );
};

export default LoyaltyTierManagement;
