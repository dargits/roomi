import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { negotiatedPriceApi, NegotiatedPriceAgreement, NegotiatedPriceAgreementRequest } from '../../services/negotiatedPriceApi';
import { NegotiatedPriceModal } from './NegotiatedPriceModal';
import { IoAddOutline, IoPricetagOutline, IoPencilOutline, IoTrashOutline, IoBusinessOutline, IoPeopleOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoCalendarOutline } from 'react-icons/io5';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 10;

export const NegotiatedPriceManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('clientId') ? Number(searchParams.get('clientId')) : undefined;

  const [agreements, setAgreements] = useState<NegotiatedPriceAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'CORPORATE' | 'GROUP'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<NegotiatedPriceAgreement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const filteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      if (targetFilter === 'CORPORATE') return !!a.corporateClientId;
      if (targetFilter === 'GROUP') return !!a.groupBookingId;
      return true;
    });
  }, [agreements, targetFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAgreements.length / pageSize));
  const paginatedAgreements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgreements.slice(start, start + pageSize);
  }, [filteredAgreements, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [targetFilter, pageSize]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const data = await negotiatedPriceApi.getAll(initialClientId);
      setAgreements(data);
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Không thể tải danh sách thỏa thuận giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, [initialClientId]);

  const handleOpenAdd = () => {
    setEditingAgreement(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agreement: NegotiatedPriceAgreement) => {
    setEditingAgreement(agreement);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: NegotiatedPriceAgreementRequest) => {
    setSubmitting(true);
    try {
      if (editingAgreement) {
        await negotiatedPriceApi.update(editingAgreement.id, data);
        toastSuccess('Cập nhật thỏa thuận giá thành công');
      } else {
        await negotiatedPriceApi.create(data);
        toastSuccess('Tạo mới thỏa thuận giá thành công');
      }
      fetchAgreements();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (agreement: NegotiatedPriceAgreement) => {
    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa thỏa thuận "${agreement.name}"?`)) {
      return;
    }
    try {
      await negotiatedPriceApi.delete(agreement.id);
      toastSuccess('Đã vô hiệu hóa thỏa thuận giá');
      fetchAgreements();
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Không thể vô hiệu hóa thỏa thuận giá');
    }
  };


  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IoPricetagOutline className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Giá Thỏa Thuận</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập mức giá cam kết cho Khách hàng Công ty & Đoàn đặt phòng (Ưu tiên cao hơn bảng giá thông thường)
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2">
          <IoAddOutline className="w-5 h-5" />
          <span>Tạo thỏa thuận giá</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setTargetFilter('ALL')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            targetFilter === 'ALL'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tất cả ({agreements.length})
        </button>
        <button
          onClick={() => setTargetFilter('CORPORATE')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            targetFilter === 'CORPORATE'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Khách công ty ({agreements.filter(a => !!a.corporateClientId).length})
        </button>
        <button
          onClick={() => setTargetFilter('GROUP')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            targetFilter === 'GROUP'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Đoàn đặt phòng ({agreements.filter(a => !!a.groupBookingId).length})
        </button>
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
                  <th className="py-3 px-4">Tên thỏa thuận</th>
                  <th className="py-3 px-4">Đối tượng áp dụng</th>
                  <th className="py-3 px-4">Mức giá / đêm</th>
                  <th className="py-3 px-4">Thời gian hiệu lực</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      Không tìm thấy thỏa thuận giá nào
                    </td>
                  </tr>
                ) : (
                  paginatedAgreements.map((a) => {
                    const isCorporate = !!a.corporateClientId;
                    const isExpired = new Date(a.endDate) < new Date();

                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {a.name}
                          {a.note && (
                            <span className="block text-xs text-gray-400 truncate max-w-xs">{a.note}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isCorporate ? (
                            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                              <IoBusinessOutline className="w-4 h-4 text-blue-500 shrink-0" />
                              <span>{a.corporateClientName || `Công ty #${a.corporateClientId}`}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-purple-700 font-medium">
                              <IoPeopleOutline className="w-4 h-4 text-purple-500 shrink-0" />
                              <span>{a.groupBookingRepName ? `Đoàn: ${a.groupBookingRepName}` : `Đoàn #${a.groupBookingId}`}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-emerald-700 text-base">
                            {formatVND(a.pricePerNight)}
                          </span>
                          <span className="text-xs text-gray-400 block">/ đêm (mọi loại phòng)</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <IoCalendarOutline className="w-3.5 h-3.5 text-gray-400" />
                            <span>{a.startDate} → {a.endDate}</span>
                          </div>
                          {isExpired && (
                            <span className="text-xs text-amber-600 font-medium block mt-0.5">
                              (Đã hết hạn hiệu lực)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {a.active && !isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                              Đang áp dụng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <IoCloseCircleOutline className="w-3.5 h-3.5" />
                              {isExpired ? 'Hết hạn' : 'Ngưng'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(a)}
                              title="Chỉnh sửa"
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <IoPencilOutline className="w-4 h-4" />
                            </button>
                            {a.active && (
                              <button
                                onClick={() => handleDeactivate(a)}
                                title="Vô hiệu hóa"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <IoTrashOutline className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {filteredAgreements.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAgreements.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              itemLabel="thỏa thuận giá"
            />
          )}
        </div>
      )}

      {/* Modal */}
      <NegotiatedPriceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingAgreement}
        defaultCorporateClientId={initialClientId}
        loading={submitting}
      />
    </div>
  );
};

export default NegotiatedPriceManagement;
