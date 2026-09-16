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

export interface AdrRevparSummary {
  totalRevenue: number;
  totalSoldNights: number;
  totalAvailableNights: number;
  totalRooms: number;
  days: number;
  adr: number;
  revpar: number;
  occupancyRate: number;
  bookingCount: number;
  topRoomNumber?: string;
  topRoomTypeName?: string;
}

export interface AdrRevparTimelineRow {
  period: string;
  bookings: number;
  revenue: number;
  soldNights: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export interface AdrRevparRoomTypeRow {
  roomTypeId: number;
  roomTypeName: string;
  basePrice: number;
  totalRooms: number;
  bookings: number;
  revenue: number;
  soldNights: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  revenueShare: number;
}

export interface AdrRevparRoomRow {
  roomId: number;
  roomNumber: string;
  floor?: string;
  roomTypeId?: number;
  roomTypeName: string;
  bookings: number;
  revenue: number;
  soldNights: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  revenueShare: number;
}

export interface AdrRevparReportResponse {
  from: string;
  to: string;
  groupBy: string;
  summary: AdrRevparSummary;
  timelineRows: AdrRevparTimelineRow[];
  roomTypeRows: AdrRevparRoomTypeRow[];
  roomRows: AdrRevparRoomRow[];
}

export interface ChannelReportRow {
  channelKey: string;
  channelName: string;
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  noShowBookings: number;
  noShowRate: number;
  soldNights: number;
  revenue: number;
  adr: number;
  revenueShare: number;
  bookingShare: number;
}

export interface ChannelReportSummary {
  from: string;
  to: string;
  totalRevenue: number;
  totalBookings: number;
  totalSoldNights: number;
  totalCancelled: number;
  overallCancellationRate: number;
  totalNoShow: number;
  overallNoShowRate: number;
  overallAdr: number;
  unknownBookings: number;
  unknownRate: number;
  dataQualityScore: number;
}

export interface ChannelReportResponse {
  summary: ChannelReportSummary;
  rows: ChannelReportRow[];
}


