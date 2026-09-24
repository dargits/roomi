import React, { useState, useEffect, useMemo } from 'react';
import { corporateClientApi, CorporateClient, CorporateClientRequest } from '../../services/corporateClientApi';
import { CorporateClientModal } from './CorporateClientModal';
import { IoAddOutline, IoBusinessOutline, IoPencilOutline, IoTrashOutline, IoSearchOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPricetagOutline } from 'react-icons/io5';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingScreen from '../../components/common/LoadingScreen';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 10;

export const CorporateClientManagement: React.FC = () => {
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CorporateClient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(clients.length / ITEMS_PER_PAGE));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return clients.slice(start, start + ITEMS_PER_PAGE);
  }, [clients, currentPage]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await corporateClientApi.getAll(search, activeOnly);
      setClients(data);
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Không thể tải danh sách khách hàng công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [activeOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: CorporateClient) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CorporateClientRequest) => {
    setSubmitting(true);
    try {
      if (editingClient) {
        await corporateClientApi.update(editingClient.id, data);
        toastSuccess('Cập nhật hồ sơ khách hàng công ty thành công');
      } else {
        await corporateClientApi.create(data);
        toastSuccess('Tạo mới khách hàng công ty thành công');
      }
      fetchClients();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (client: CorporateClient) => {
    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa hồ sơ "${client.companyName}"?`)) {
      return;
    }
    try {
      await corporateClientApi.delete(client.id);
      toastSuccess('Đã vô hiệu hóa khách hàng công ty');
      fetchClients();
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Không thể vô hiệu hóa khách hàng');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IoBusinessOutline className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng Công ty</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Hồ sơ doanh nghiệp & đối tác liên kết để thiết lập giá thỏa thuận
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2">
          <IoAddOutline className="w-5 h-5" />
          <span>Thêm khách công ty</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-96">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên công ty, MST, người liên hệ..."
            className="w-full"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            <IoSearchOutline className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Chỉ hiện đang hoạt động</span>
          </label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingScreen />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Tên công ty</th>
                  <th className="py-3 px-4">Mã số thuế</th>
                  <th className="py-3 px-4">Người liên hệ</th>
                  <th className="py-3 px-4">SĐT / Email</th>
                  <th className="py-3 px-4">Địa chỉ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      Không tìm thấy khách hàng công ty nào
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {c.companyName}
                        {c.note && (
                          <span className="block text-xs text-gray-400 truncate max-w-xs">{c.note}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{c.taxCode || '—'}</td>
                      <td className="py-3 px-4">{c.contactPerson || '—'}</td>
                      <td className="py-3 px-4">
                        <div>{c.contactPhone || '—'}</div>
                        {c.contactEmail && (
                          <div className="text-xs text-gray-400">{c.contactEmail}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">{c.address || '—'}</td>
                      <td className="py-3 px-4">
                        {c.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <IoCloseCircleOutline className="w-3.5 h-3.5" />
                            Ngưng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/negotiated-prices?clientId=${c.id}`)}
                            title="Xem thỏa thuận giá"
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <IoPricetagOutline className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Chỉnh sửa"
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <IoPencilOutline className="w-4 h-4" />
                          </button>
                          {c.active && (
                            <button
                              onClick={() => handleDeactivate(c)}
                              title="Vô hiệu hóa"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <IoTrashOutline className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {clients.length > ITEMS_PER_PAGE && (
            <div className="p-3 border-t border-border-grey bg-surface-container-low/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal create / edit */}
      <CorporateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingClient}
        loading={submitting}
      />
    </div>
  );
};

export default CorporateClientManagement;
