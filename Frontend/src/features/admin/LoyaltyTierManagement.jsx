import React, { useState, useEffect } from "react";
import { IoAddOutline, IoChevronUpOutline, IoCloseOutline, IoCreateOutline, IoPeopleOutline, IoSaveOutline, IoStarOutline, IoTrashOutline, IoTrophyOutline } from 'react-icons/io5';
import loyaltyApi from "../../services/loyaltyApi";
import guestApi from "../../services/guestApi";

const TIER_COLORS = [
  "bg-amber-50 border-amber-200 text-amber-800",
  "bg-slate-50 border-slate-200 text-slate-700",
  "bg-yellow-50 border-yellow-300 text-yellow-800",
  "bg-purple-50 border-purple-200 text-purple-800",
  "bg-blue-50 border-blue-200 text-blue-800",
];
const TIER_ICONS = ["⭐", "🥈", "🥇", "💎", "👑"];

const EMPTY_FORM = { name: "", minPoints: 0, benefitDescription: "" };

const LoyaltyTierManagement = () => {
  const [tiers, setTiers] = useState([]);
  const [guestStats, setGuestStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersData, guestsData] = await Promise.all([
        loyaltyApi.getTiers(),
        guestApi.getGuests(),
      ]);
      setTiers(tiersData);
      // Thống kê số khách mỗi hạng
      const stats = tiersData.map(tier => ({
        ...tier,
        guestCount: guestsData.filter(g => g.loyaltyTierId === tier.id).length,
      }));
      setGuestStats(stats);
    } catch { setError("Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingTier(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (tier) => {
    setEditingTier(tier);
    setForm({ name: tier.name, minPoints: tier.minPoints, benefitDescription: tier.benefitDescription || "" });
    setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingTier(null); setError(""); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "minPoints" ? Number(value) : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên hạng."); return; }
    setSaving(true); setError("");
    try {
      if (editingTier) { await loyaltyApi.updateTier(editingTier.id, form); }
      else { await loyaltyApi.createTier(form); }
      closeForm(); fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu dữ liệu.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (tier) => {
    if (!window.confirm(`Xóa hạng "${tier.name}"?`)) return;
    try { await loyaltyApi.deleteTier(tier.id); fetchData(); }
    catch (err) { alert(err.response?.data?.message || "Không thể xóa hạng này."); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-on-surface flex items-center gap-2">
            <IoTrophyOutline size={26} className="text-amber-500" />
            Khách Hàng Thân Thiết
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Cấu hình hạng thành viên và điểm tích lũy</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm cursor-pointer border-none">
          <IoAddOutline size={16}/> Thêm hạng mới
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>}

      {/* Tiers Grid */}
      {loading ? (
        <div className="p-12 text-center text-on-surface-variant">Đang tải...</div>
      ) : tiers.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-border-grey rounded-xl">
          <IoTrophyOutline size={48} className="mx-auto mb-3 text-amber-300"/>
          <p className="text-on-surface-variant">Chưa có hạng thành viên nào.</p>
          <button onClick={openCreate} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer border-none">
            Tạo hạng đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(guestStats.length ? guestStats : tiers).map((tier, idx) => (
            <div key={tier.id} className={`relative p-5 rounded-xl border-2 ${TIER_COLORS[idx % TIER_COLORS.length]} shadow-sm`}>
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={() => openEdit(tier)} className="p-1.5 rounded-md hover:bg-black/10 transition-colors cursor-pointer border-none bg-transparent text-current">
                  <IoCreateOutline size={14}/>
                </button>
                <button onClick={() => handleDelete(tier)} className="p-1.5 rounded-md hover:bg-black/10 transition-colors cursor-pointer border-none bg-transparent text-current">
                  <IoTrashOutline size={14}/>
                </button>
              </div>
              <div className="text-3xl mb-2">{TIER_ICONS[idx % TIER_ICONS.length]}</div>
              <h3 className="font-bold text-lg leading-tight">{tier.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-sm opacity-80">
                <IoChevronUpOutline size={14}/> Từ {tier.minPoints?.toLocaleString("vi-VN")} điểm
              </div>
              {tier.benefitDescription && (
                <p className="mt-2 text-sm opacity-75 line-clamp-2">{tier.benefitDescription}</p>
              )}
              {tier.guestCount !== undefined && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-current/20 text-sm font-medium">
                  <IoPeopleOutline size={14}/>
                  {tier.guestCount} khách hàng
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hướng dẫn */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-5">
        <h3 className="font-title-md text-on-surface mb-3 flex items-center gap-2">
          <IoStarOutline size={18} className="text-amber-500"/> Cách tính điểm tích lũy
        </h3>
        <div className="text-sm text-on-surface-variant space-y-1.5">
          <p>• Mỗi <strong>100.000đ</strong> thanh toán = <strong>1 điểm</strong> tích lũy.</p>
          <p>• Điểm được tích lũy tự động khi khách trả phòng.</p>
          <p>• Hệ thống tự động xếp hạng khách dựa trên tổng điểm tích lũy.</p>
          <p>• Hạng được hiển thị khi lễ tân tra cứu thông tin khách.</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border-grey">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoTrophyOutline size={20} className="text-amber-500"/>
                {editingTier ? "Cập nhật hạng" : "Thêm hạng mới"}
              </h3>
              <button onClick={closeForm} className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border-none bg-transparent"><IoCloseOutline size={18}/></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Tên hạng *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="VD: Thành viên, Bạc, Vàng, Bạch Kim..."/>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Điểm tối thiểu để đạt hạng</label>
                <input name="minPoints" type="number" min="0" value={form.minPoints} onChange={handleChange}
                  className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Mô tả ưu đãi</label>
                <textarea name="benefitDescription" value={form.benefitDescription} onChange={handleChange} rows={3}
                  className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="VD: Giảm 10% tiền phòng, ưu tiên phòng cao cấp..."/>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-sm font-medium transition-colors cursor-pointer border border-border-grey bg-transparent">Hủy</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer border-none">
                  <IoSaveOutline size={15}/>{saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyTierManagement;
