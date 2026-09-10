export type CashierShiftStatus = 'OPEN' | 'CLOSED';

export interface CashierShiftResponse {
  id: number;
  closingId?: number;
  status: CashierShiftStatus;
  openedById: number;
  openedByName: string;
  openedAt: string;
  openingCash: number;
  openingNote?: string;
  closedById?: number;
  closedByName?: string;
  closedAt?: string;
  invoiceCash?: number;
  invoiceTransfer?: number;
  invoiceCard?: number;
  depositCash?: number;
  depositTransfer?: number;
  depositCard?: number;
  refundCash?: number;
  refundTransfer?: number;
  refundCard?: number;
  expectedCash?: number;
  actualCash?: number;
  discrepancy?: number;
  discrepancyNote?: string;
}

export interface CashierShiftOpenRequest {
  openingCash: number;
  openingNote?: string;
}

export interface CashierShiftCloseRequest {
  actualCash: number;
  discrepancyNote?: string;
}

export interface RevenueReportRow {
  period?: string;
  date?: string;
  bookings?: number;
  revenue: number;
  collectedRevenue?: number;
  debtRevenue?: number;
  penaltyRevenue?: number;
}

export interface RevenueReportResponse {
  from: string;
  to: string;
  groupBy: string;
  totalRevenue: number;
  collectedRevenue: number;
  debtRevenue: number;
  penaltyRevenue: number;
  grandTotal: number;
  bookingCount: number;
  rows: RevenueReportRow[];
}

export interface OccupancyReportRow {
  date: string;
  availableRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  totalRooms?: number;
}

export interface OccupancyReportResponse {
  from: string;
  to: string;
  totalRooms: number;
  totalRoomNights: number;
  occupancyRate: number;
  rows: OccupancyReportRow[];
}

export interface DashboardStatsResponse {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  todayBookings: number;
  monthRevenue: number;
  monthCollectedRevenue: number;
  monthDebtRevenue: number;
}
