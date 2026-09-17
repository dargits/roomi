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

export type DebtAgingBucketKey = 'CURRENT' | 'OVERDUE_UNDER_15' | 'OVERDUE_15_TO_30' | 'OVERDUE_OVER_30' | 'IN_TERM' | 'OVERDUE_1_15';
export type DebtReminderStatus = 'DUE_TODAY' | 'OVERDUE_REMINDER' | 'OVERDUE_NO_REMINDER' | 'REMINDER_SET' | 'UPCOMING' | 'NONE';

export interface DebtCollectionLogResponse {
  id: number;
  debtApprovalRequestId: number;
  channel?: string;
  contactMethod?: string;
  contactResult?: string;
  contactPerson?: string;
  contactDate?: string;
  contactedAt?: string;
  notes: string;
  promisedDate?: string;
  nextReminderDate?: string;
  recordedByName?: string;
  createdById?: number;
  createdByName?: string;
  createdAt?: string;
}

export interface DebtCollectionLogRequest {
  channel?: string;
  contactMethod?: string;
  contactResult?: string;
  contactPerson?: string;
  notes: string;
  contactDate?: string;
  contactedAt?: string;
  promisedDate?: string;
  nextReminderDate?: string;
}

export interface DebtAgingBucketDto {
  bucketKey: DebtAgingBucketKey;
  bucketLabel?: string;
  bucketName?: string;
  severity?: string;
  invoiceCount: number;
  totalAmount: number;
  percentage: number;
}

export interface CustomerDebtSummaryDto {
  guestId?: number;
  guestName: string;
  guestPhone?: string;
  stayCount?: number;
  invoiceCount?: number;
  totalDebt: number;
  earliestDueDate?: string;
  latestDueDate?: string;
  maxDaysOverdue?: number;
  highestRiskBucket?: string;
  hasOverdue?: boolean;
}

export interface DebtAgingReconciliationDto {
  periodFrom?: string;
  periodTo?: string;
  fromCheckout?: string;
  toCheckout?: string;
  agingCheckoutDebt?: number;
  debtAgingTotal?: number;
  revenueReportDebt?: number;
  discrepancy: number;
  matched: boolean;
  explanation?: string;
}

export interface DebtAgingItemResponse {
  id: number;
  bookingId: number;
  invoiceId: number;
  invoiceNumber: string;
  guestId?: number;
  guestName: string;
  guestPhone: string;
  roomNumber?: string;
  debtAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  dueDate: string;
  reason: string;
  approvedByName?: string;
  approvedAt?: string;
  status: string;
  daysOverdue: number;
  agingBucket: DebtAgingBucketKey;
  lastContactedAt?: string;
  lastContactNote?: string;
  nextReminderDate?: string;
  reminderStatus: DebtReminderStatus;
  contactCount?: number;
  collectionCount?: number;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface DebtAgingReportResponse {
  asOfDate: string;
  checkoutFrom?: string;
  checkoutTo?: string;
  grandTotalDebt?: number;
  totalDebtAmount?: number;
  totalInvoices?: number;
  totalDebtCount?: number;
  overdueDebtCount?: number;
  overdueDebtAmount?: number;
  remindersDueTodayCount?: number;
  buckets?: DebtAgingBucketDto[];
  agingBuckets?: DebtAgingBucketDto[];
  customerSummaries: CustomerDebtSummaryDto[];
  items: DebtAgingItemResponse[];
  reconciliation?: DebtAgingReconciliationDto;
}




