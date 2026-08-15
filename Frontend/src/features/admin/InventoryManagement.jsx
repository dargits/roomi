import React, { useState, useEffect } from "react";
import { IoAddOutline, IoCloseOutline, IoCreateOutline, IoCubeOutline, IoRefreshOutline, IoSaveOutline, IoTrashOutline, IoWarningOutline } from 'react-icons/io5';
import inventoryApi from "../../services/inventoryApi";

const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString("vi-VN") : "";

const EMPTY_FORM = { name: "", unit: "cái", quantityOnHand: 0, lowStockThreshold: 5 };

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getAll();
      setItems(data);
    } catch { setError("Không thể tải danh sách kho."); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingItem(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, unit: item.unit, quantityOnHand: item.quantityOnHand, lowStockThreshold: item.lowStockThreshold });
    setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingItem(null); setError(""); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "name" || name === "unit" ? value : Number(value) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên mặt hàng."); return; }
    setSaving(true); setError("");
    try {
      if (editingItem) { await inventoryApi.update(editingItem.id, form); }
      else { await inventoryApi.create(form); }
      closeForm(); fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu dữ liệu.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa mặt hàng "${item.name}"?`)) return;
    try { await inventoryApi.delete(item.id); fetchItems(); }
    catch (err) { alert(err.response?.data?.message || "Không thể xóa."); }
  };

  const lowStockCount = items.filter(i => i.lowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-on-surface flex items-center gap-2">
            <IoCubeOutline size={26} className="text-primary" />
            Kho Đồ Dùng
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý đồ dùng phục vụ dịch vụ phụ thu
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium">
              <IoWarningOutline size={15}/> {lowStockCount} mặt hàng sắp hết
            </span>
          )}
          <button onClick={fetchItems} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border-none bg-transparent">
            <IoRefreshOutline size={18}/>
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm cursor-pointer border-none">
            <IoAddOutline size={16}/> Thêm mặt hàng
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <IoCubeOutline size={48} className="mx-auto mb-3 opacity-30"/>
            <p>Chưa có mặt hàng nào trong kho.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low border-b border-border-grey">
              <tr className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-5 py-3">Tên mặt hàng</th>
                <th className="px-5 py-3">Đơn vị</th>
                <th className="px-5 py-3 text-center">Tồn kho</th>
                <th className="px-5 py-3 text-center">Ngưỡng cảnh báo</th>
                <th className="px-5 py-3 text-center">Trạng thái</th>
                <th className="px-5 py-3 text-right">Cập nhật</th>
                <th className="px-5 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5 font-medium text-on-surface">{item.name}</td>
                  <td className="px-5 py-3.5 text-on-surface-variant">{item.unit}</td>
                  <td className={`px-5 py-3.5 text-center font-semibold ${item.lowStock ? "text-red-600" : "text-green-600"}`}>
                    {item.quantityOnHand}
                  </td>
                  <td className="px-5 py-3.5 text-center text-on-surface-variant">{item.lowStockThreshold}</td>
                  <td className="px-5 py-3.5 text-center">
                    {item.lowStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <IoWarningOutline size={11}/> Sắp hết
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Đủ hàng</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-on-surface-variant">{fmtDate(item.updatedAt)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer border-none bg-transparent">
                        <IoCreateOutline size={15}/>
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-red-50 rounded-md transition-colors cursor-pointer border-none bg-transparent">
                        <IoTrashOutline size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border-grey">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoCubeOutline size={20} className="text-primary"/>
                {editingItem ? "Cập nhật mặt hàng" : "Thêm mặt hàng mới"}
              </h3>
              <button onClick={closeForm} className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border-none bg-transparent"><IoCloseOutline size={18}/></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Tên mặt hàng *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="VD: Khăn tắm, Dầu gội..."/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Đơn vị</label>
                  <input name="unit" value={form.unit} onChange={handleChange}
                    className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="cái, chai, gói..."/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Số lượng tồn</label>
                  <input name="quantityOnHand" type="number" min="0" value={form.quantityOnHand} onChange={handleChange}
                    className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Ngưỡng cảnh báo tồn thấp</label>
                <input name="lowStockThreshold" type="number" min="0" value={form.lowStockThreshold} onChange={handleChange}
                  className="w-full border border-border-grey rounded-lg px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
                <p className="text-xs text-on-surface-variant mt-1">Hệ thống sẽ cảnh báo khi tồn kho ≤ mức này.</p>
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

export default InventoryManagement;
