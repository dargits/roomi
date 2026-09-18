export type LostItemStatus = 'HOLDING' | 'CONTACTED' | 'RETURNED' | 'DISPOSED';

export interface LostItem {
  id: number;
  roomId: number;
  roomNumber: string;
  roomTypeName?: string;
  bookingId?: number;
  guestId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkedOutAt?: string;
  itemName: string;
  foundLocation: string;
  foundDate: string;
  foundTime?: string;
  storageLocation?: string;
  imageUrl?: string;
  status: LostItemStatus;
  retentionExpiryDate?: string;
  isExpired?: boolean;
  receiverName?: string;
  receiverPhone?: string;
  receiverNote?: string;
  returnedAt?: string;
  returnedById?: number;
  returnedByName?: string;
  disposalMethod?: string;
  disposalNote?: string;
  disposedAt?: string;
  disposedById?: number;
  disposedByName?: string;
  createdById?: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LostItemLog {
  id: number;
  lostItemId: number;
  action: string;
  previousStatus?: LostItemStatus;
  newStatus?: LostItemStatus;
  notes?: string;
  performedById?: number;
  performedByName?: string;
  createdAt: string;
}

export interface CreateLostItemRequest {
  roomId: number;
  itemName: string;
  foundLocation: string;
  foundDate: string;
  foundTime?: string;
  storageLocation?: string;
  imageUrl?: string;
  notes?: string;
}

export interface ReturnLostItemRequest {
  receiverName: string;
  receiverPhone?: string;
  receiverNote?: string;
}

export interface DisposeLostItemRequest {
  disposalMethod: string;
  disposalNote?: string;
}

export interface LostItemSummary {
  totalHolding: number;
  totalContacted: number;
  totalReturned: number;
  totalDisposed: number;
  totalExpiredHolding: number;
}

export interface LostItemFilterParams {
  roomId?: number;
  status?: LostItemStatus;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  isExpired?: boolean;
  page?: number;
  size?: number;
}
