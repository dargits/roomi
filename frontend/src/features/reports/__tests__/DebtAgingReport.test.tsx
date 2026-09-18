import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DebtAgingReport from '../DebtAgingReport';
import debtApprovalApi from '../../../services/debtApprovalApi';

// Mock debtApprovalApi
vi.mock('../../../services/debtApprovalApi', () => ({
  default: {
    getDebtAgingReport: vi.fn(),
    exportDebtAgingCsv: vi.fn(),
    addCollectionLog: vi.fn(),
    getCollectionLogs: vi.fn()
  }
}));

const mockReportData = {
  asOfDate: '2026-09-17',
  grandTotalDebt: 10000000,
  totalInvoices: 4,
  remindersDueTodayCount: 1,
  buckets: [
    {
      bucketKey: 'OVERDUE_OVER_30',
      bucketName: 'Trên 30 ngày',
      severity: 'CRITICAL',
      invoiceCount: 1,
      totalAmount: 4000000,
      percentage: 40.0
    },
    {
      bucketKey: 'OVERDUE_15_TO_30',
      bucketName: 'Từ 15 - 30 ngày',
      severity: 'DANGER',
      invoiceCount: 1,
      totalAmount: 3000000,
      percentage: 30.0
    },
    {
      bucketKey: 'OVERDUE_UNDER_15',
      bucketName: 'Quá hạn < 15 ngày',
      severity: 'WARNING',
      invoiceCount: 1,
      totalAmount: 2000000,
      percentage: 20.0
    },
    {
      bucketKey: 'CURRENT',
      bucketName: 'Trong hạn',
      severity: 'SUCCESS',
      invoiceCount: 1,
      totalAmount: 1000000,
      percentage: 10.0
    }
  ],
  customerSummaries: [
    {
      guestId: 101,
      guestName: 'Công ty Cổ phần Alpha',
      guestPhone: '0901234567',
      invoiceCount: 3,
      totalDebt: 9000000,
      earliestDueDate: '2026-08-10',
      maxDaysOverdue: 38,
      highestRiskBucket: 'OVERDUE_OVER_30'
    },
    {
      guestId: 102,
      guestName: 'Nguyễn Văn Bình',
      guestPhone: '0912345678',
      invoiceCount: 1,
      totalDebt: 1000000,
      earliestDueDate: '2026-09-25',
      maxDaysOverdue: 0,
      highestRiskBucket: 'CURRENT'
    }
  ],
  items: [
    {
      id: 1,
      bookingId: 501,
      invoiceId: 201,
      invoiceNumber: 'HD-00201',
      guestId: 101,
      guestName: 'Công ty Cổ phần Alpha',
      guestPhone: '0901234567',
      roomNumber: '301',
      debtAmount: 4000000,
      dueDate: '2026-08-10',
      daysOverdue: 38,
      agingBucket: 'OVERDUE_OVER_30',
      approvedByName: 'Chủ cơ sở',
      reminderStatus: 'DUE_TODAY',
      collectionCount: 2,
      lastContactedAt: '2026-09-10T14:30:00',
      lastContactNote: 'Đã gửi công văn đối soát',
      nextReminderDate: '2026-09-17'
    },
    {
      id: 2,
      bookingId: 502,
      invoiceId: 202,
      invoiceNumber: 'HD-00202',
      guestId: 102,
      guestName: 'Nguyễn Văn Bình',
      guestPhone: '0912345678',
      roomNumber: '102',
      debtAmount: 1000000,
      dueDate: '2026-09-25',
      daysOverdue: 0,
      agingBucket: 'CURRENT',
      approvedByName: 'Chủ cơ sở',
      reminderStatus: 'NONE',
      collectionCount: 0
    }
  ],
  reconciliation: {
    fromCheckout: '2026-09-01',
    toCheckout: '2026-09-17',
    agingCheckoutDebt: 5000000,
    revenueReportDebt: 5000000,
    discrepancy: 0,
    matched: true
  }
};

describe('DebtAgingReport Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (debtApprovalApi.getDebtAgingReport as any).mockResolvedValue(mockReportData);
  });

  it('renders header, bucket cards and KPI summaries', async () => {
    render(<DebtAgingReport />);

    await waitFor(() => {
      expect(screen.getByText('Báo cáo Tuổi nợ & Nhắc thu công nợ')).toBeInTheDocument();
    });

    // Check bucket cards
    expect(screen.getByText('Trên 30 ngày')).toBeInTheDocument();
    expect(screen.getByText('Từ 15 - 30 ngày')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn < 15 ngày')).toBeInTheDocument();
    expect(screen.getAllByText('Trong hạn').length).toBeGreaterThan(0);

    // Check KPI count
    expect(screen.getByText('4 hóa đơn')).toBeInTheDocument();
    expect(screen.getByText('1 khoản')).toBeInTheDocument();
  });

  it('renders debt invoice items with customer and overdue status', async () => {
    render(<DebtAgingReport />);

    await waitFor(() => {
      expect(screen.getByText('HD-00201')).toBeInTheDocument();
    });

    expect(screen.getByText('Công ty Cổ phần Alpha')).toBeInTheDocument();
    expect(screen.getByText('+38 ngày')).toBeInTheDocument();
    expect(screen.getByText('🔔 Cần nhắc hôm nay')).toBeInTheDocument();
  });

  it('renders reconciliation banner when reconciliation data is present', async () => {
    render(<DebtAgingReport />);

    await waitFor(() => {
      expect(screen.getByText(/Đối soát Doanh thu & Tuổi nợ/)).toBeInTheDocument();
    });

    expect(screen.getByText('Khớp 100%')).toBeInTheDocument();
  });

  it('switches to customer grouping view when toggle is clicked', async () => {
    render(<DebtAgingReport />);

    await waitFor(() => {
      expect(screen.getByText('Theo khách hàng')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Theo khách hàng'));

    await waitFor(() => {
      expect(screen.getByText(/Tổng hợp công nợ theo Khách hàng \/ Doanh nghiệp/)).toBeInTheDocument();
      expect(screen.getByText('Rất cao (>30d)')).toBeInTheDocument();
    });
  });

  it('opens collection modal when clicking Nhắc thu button', async () => {
    render(<DebtAgingReport />);

    await waitFor(() => {
      expect(screen.getAllByText('Nhắc thu')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Nhắc thu')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Ghi nhận liên hệ đòi nợ — Công ty Cổ phần Alpha/)).toBeInTheDocument();
    });
  });
});
