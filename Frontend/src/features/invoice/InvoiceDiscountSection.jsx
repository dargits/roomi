import React, { useEffect, useState } from 'react';
import { IoTicketOutline } from 'react-icons/io5';
import useDiscount from '../../hooks/useDiscount';
import DiscountPanel from './DiscountPanel';
import DiscountFormModal from './DiscountFormModal';

/**
 * Section tổng hợp toàn bộ tính năng giảm giá hóa đơn.
 * Nhúng component này vào trang InvoiceDetail.
 *
 * Props:
 *  - invoice: object với { id, roomAmount, serviceAmount, totalAmount, status }
 *  - userRole: 'OWNER' | 'RECEPTIONIST' | 'ACCOUNTANT' | ...
 *  - onInvoiceChange: callback khi hóa đơn bị cập nhật (để reload invoice cha)
 */
const InvoiceDiscountSection = ({ invoice, userRole, onInvoiceChange, remainingAmount }) => {
  const [showForm, setShowForm] = useState(false);

  const {
    activeDiscount,
    isLoading,
    fetchActiveDiscount,
    applyDiscount,
    removeDiscount,
    approveDiscount,
    rejectDiscount,
  } = useDiscount(invoice?.id, onInvoiceChange);

  // Tải giảm giá khi invoice thay đổi
  useEffect(() => {
    if (invoice?.id) fetchActiveDiscount();
  }, [invoice?.id, fetchActiveDiscount]);

  const handleApplyDiscount = async (payload) => {
    const result = await applyDiscount(payload);
    if (result.success) setShowForm(false);
    return result;
  };

  return (
    <section aria-label="Giảm giá hóa đơn" className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <IoTicketOutline size={16} className="text-on-surface-variant" />
        <h3 className="text-sm font-semibold text-on-surface">Giảm giá</h3>
      </div>

      {/* Panel hiển thị / trạng thái */}
      <DiscountPanel
        discount={activeDiscount}
        invoiceStatus={invoice?.status}
        userRole={userRole}
        isLoading={isLoading}
        onRemove={removeDiscount}
        onApprove={approveDiscount}
        onReject={rejectDiscount}
        onAddDiscount={() => setShowForm(true)}
      />

      {/* Modal form nhập giảm giá */}
      <DiscountFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleApplyDiscount}
        isLoading={isLoading}
        invoice={invoice}
        remainingAmount={remainingAmount}
      />
    </section>
  );
};

export default InvoiceDiscountSection;
