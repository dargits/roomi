import api from './api';

export interface OpenShiftInfo {
  shiftId: number;
  openedByName: string;
  openedAt: string;
}

export interface DailyLedgerShift {
  id: number;
  closingId?: number;
  status: string;
  openedById: number;
  openedByName: string;
  openedAt: string;
  openingCash: number;
  closedById?: number;
  closedByName?: string;
  closedAt?: string;
  invoiceCash: number;
  invoiceTransfer: number;
  invoiceCard: number;
  depositCash: number;
  depositTransfer: number;
  depositCard: number;
  refundCash: number;
  refundTransfer: number;
  refundCard: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  discrepancyNote?: string;
}

export interface DailyLedgerResponse {
  date: string;
  status: 'OPEN' | 'CLOSED';
  shifts: DailyLedgerShift[];
  openShifts: OpenShiftInfo[];
  totalInvoiceCash: number;
  totalInvoiceTransfer: number;
  totalInvoiceCard: number;
  totalDepositCash: number;
  totalDepositTransfer: number;
  totalDepositCard: number;
  totalRefundCash: number;
  totalRefundTransfer: number;
  totalRefundCard: number;
  totalExpectedCash: number;
  totalActualCash: number;
  totalDiscrepancy: number;
  cashHandoverAmount: number;
  closedById?: number;
  closedByName?: string;
  closedAt?: string;
  openReason?: string;
}

export const dailyLedgerApi = {
  preview: async (date?: string): Promise<DailyLedgerResponse> => {
    const params = date ? { date } : {};
    return (await api.get<DailyLedgerResponse>('/ledger/daily', { params })).data;
  },

  close: async (date: string): Promise<DailyLedgerResponse> =>
    (await api.post<DailyLedgerResponse>(`/ledger/daily/${date}/close`)).data,

  reopen: async (date: string, reason: string): Promise<DailyLedgerResponse> =>
    (await api.post<DailyLedgerResponse>(`/ledger/daily/${date}/reopen`, { reason })).data,

  list: async (from?: string, to?: string): Promise<DailyLedgerResponse[]> =>
    (await api.get<DailyLedgerResponse[]>('/ledger/daily/list', { params: { from, to } })).data,
};

export default dailyLedgerApi;
