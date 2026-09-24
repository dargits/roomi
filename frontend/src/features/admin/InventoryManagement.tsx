import React, { useState, useEffect, useMemo } from "react";
import { 
  IoAddOutline, IoCloseOutline, IoCreateOutline, IoCubeOutline, 
  IoRefreshOutline, IoSaveOutline, IoTrashOutline, IoWarningOutline, 
  IoSearchOutline, IoCheckmarkDoneOutline 
} from 'react-icons/io5';
import inventoryApi from "../../services/inventoryApi";
import Button from "../../components/ui/Button";
import LoadingScreen from "../../components/common/LoadingScreen";
import Pagination from "../../components/ui/Pagination";
import { useToast } from "../../context/ToastContext";

const fmtDate = (dt?: string) => dt ? new Date(dt).toLocaleDateString("vi-VN") : "";

const EMPTY_FORM = { name: "", unit: "cái", quantityOnHand: 0, lowStockThreshold: 5 };
const ITEMS_PER_PAGE = 15;

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { success: toastSuccess, error: toastError, confirm } = useToast();

  useEffect(() => { 
    fetchItems(); 
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getAll();
      setItems(data || []);
      setSelectedIds(new Set());
    } catch { 
      setError("Không thể tải danh sách kho."); 
    } finally { 
      setLoading(false); 
    }
  };

  const openCreate = () => { setEditingItem(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({ name: item.name, unit: item.unit, quantityOnHand: item.quantityOnHand, lowStockThreshold: item.lowStockThreshold });
    setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingItem(null); setError(""); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "name" || name === "unit" ? value : Number(value) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên mặt hàng."); return; }
    setSaving(true); setError("");
    try {
      if (editingItem) { 
        await inventoryApi.update(editingItem.id, form as any); 
        toastSuccess(`Đã cập nhật mặt hàng "${form.name}"!`);
      } else { 
        await inventoryApi.create(form as any); 
        toastSuccess(`Đã thêm mặt hàng "${form.name}" vào kho!`);
      }
      closeForm(); fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi lưu mặt hàng.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: any) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa mặt hàng "${item.name}" không?`,
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try { 
      await inventoryApi.delete(item.id); 
      toastSuccess(`Đã xóa mặt hàng "${item.name}"!`);
      fetchItems(); 
    } catch (err: any) { 
      toastError(err.response?.data?.message || "Không thể xóa mặt hàng."); 
    }
  };

  // Lọc tìm kiếm
  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => 
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.unit && i.unit.toLowerCase().includes(q))
    );
  }, [items, searchText]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Chọn / Bỏ chọn
  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id));

  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedItems.forEach(i => next.delete(i.id));
      } else {
        paginatedItems.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const toggleSelectAllSystem = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const isConfirmed = await confirm({
      title: `Xác nhận xóa ${count} mặt hàng`,
      message: `Bạn có chắc chắn muốn xóa ${count} mặt hàng đã chọn khỏi kho? Hành động này không thể hoàn tác.`,
      confirmText: `Xóa ${count} mặt hàng`,
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setBulkDeleting(true);
    try {
      await inventoryApi.bulkDelete(Array.from(selectedIds));
      toastSuccess(`Đã xóa thành công ${count} mặt hàng đã chọn!`);
      fetchItems();
    } catch (err: any) {
      toastError(err.response?.data?.message || "Lỗi khi xóa hàng loạt mặt hàng.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const lowStockCount = items.filter(i => i.lowStock).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-grey">
        <div className="flex items-center gap-2">
          <IoCubeOutline size={22} className="text-primary" />
          <h1 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
            Kho Đồ Dùng
          </h1>
          <span className="text-xs text-on-surface-variant font-medium">({items.length} mặt hàng)</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium">
              <IoWarningOutline size={14}/> {lowStockCount} sắp hết
            </span>
          )}
          <Button variant="outline" size="sm" icon={IoRefreshOutline} onClick={fetchItems}>
            Làm mới
          </Button>
          <Button variant="primary" size="sm" icon={IoAddOutline} onClick={openCreate}>
            Thêm mặt hàng
          </Button>
        </div>
      </div>

      {/* Thanh tìm kiếm & Thanh tác vụ chọn hàng loạt */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={15} />
          <input
            type="text"
            placeholder="Tìm theo tên mặt hàng, đơn vị..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-border-grey rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchText && (
            <button 
              type="button" 
              onClick={() => setSearchText('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
            >
              ×
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 animate-fadeIn">
            <span>Đã chọn <strong>{selectedIds.size}</strong> mục</span>
            {selectedIds.size < filteredItems.length && (
              <button
                type="button"
                onClick={toggleSelectAllSystem}
                className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Chọn tất cả {filteredItems.length} mục
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer ml-1"
            >
              Bỏ chọn
            </button>
            <Button
              variant="danger"
              size="sm"
              icon={IoTrashOutline}
              onClick={handleBulkDelete}
              isLoading={bulkDeleting}
              className="ml-auto py-1 px-2.5 text-xs font-semibold"
            >
              Xóa {selectedIds.size} mục đã chọn
            </Button>
          </div>
        )}
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
              {editingItem ? `Chỉnh sửa: ${editingItem.name}` : "Thêm mặt hàng mới"}
            </h2>
            <button type="button" onClick={closeForm} className="text-on-surface-variant hover:text-on-surface">
              <IoCloseOutline size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Tên mặt hàng *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: Dầu gội, Bàn chải..."
                required
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Đơn vị tính</label>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="VD: cái, chai, cuộn..."
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Số lượng tồn kho</label>
              <input
                type="number"
                name="quantityOnHand"
                min="0"
                value={form.quantityOnHand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-medium">Ngưỡng cảnh báo ít</label>
              <input
                type="number"
                name="lowStockThreshold"
                min="0"
                value={form.lowStockThreshold}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>Hủy</Button>
            <Button type="submit" variant="primary" size="sm" icon={IoSaveOutline} isLoading={saving}>
              {editingItem ? "Lưu thay đổi" : "Thêm vào kho"}
            </Button>
          </div>
        </form>
      )}

      {/* Bảng danh sách */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center"><LoadingScreen message="Đang tải kho đồ dùng..." /></div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant text-sm">
            {searchText ? "Không tìm thấy mặt hàng nào phù hợp với từ khóa." : "Kho đồ dùng chưa có mặt hàng nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-border-grey font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectPage}
                      className="rounded border-border-grey text-primary focus:ring-primary cursor-pointer"
                      title="Chọn tất cả mặt hàng trên trang này"
                    />
                  </th>
                  <th className="p-3">Mặt hàng</th>
                  <th className="p-3 text-right">Tồn kho</th>
                  <th className="p-3 text-right">Ngưỡng báo ít</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3">Cập nhật lúc</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-on-surface">
                {paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-surface-container-low/40 transition-colors ${
                      selectedIds.has(item.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="rounded border-border-grey text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-semibold text-on-surface">{item.name}</td>
                    <td className="p-3 text-right font-bold tabular-nums">
                      {item.quantityOnHand} <span className="text-[10px] text-on-surface-variant font-normal">{item.unit}</span>
                    </td>
                    <td className="p-3 text-right tabular-nums text-on-surface-variant">
                      {item.lowStockThreshold} {item.unit}
                    </td>
                    <td className="p-3 text-center">
                      {item.lowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          <IoWarningOutline size={11} /> Cần nhập thêm
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                          Đầy đủ
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-on-surface-variant text-[11px]">{fmtDate(item.updatedAt)}</td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1 rounded text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <IoCreateOutline size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1 rounded text-error hover:bg-red-50 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <IoTrashOutline size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {filteredItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 10, 20, 50]}
            itemLabel="mặt hàng"
          />
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;
