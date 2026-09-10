export interface HotelSettingResponse {
  id?: number;
  propertyName: string;
  address: string;
  phone: string;
  email: string;
  defaultCheckinTime?: string;
  defaultCheckoutTime?: string;
  homeImage?: string;
  description?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
}

export interface HotelSettingRequest {
  propertyName: string;
  address: string;
  phone: string;
  email: string;
  defaultCheckinTime?: string;
  defaultCheckoutTime?: string;
  homeImage?: string;
  description?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
}

export interface InventoryItemResponse {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimumThreshold?: number;
  pricePerUnit?: number;
  updatedAt?: string;
}

export interface InventoryItemRequest {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimumThreshold?: number;
  pricePerUnit?: number;
}

export interface LoyaltyTierResponse {
  id: number;
  name: string;
  minPoints: number;
  benefitDescription?: string;
  minimumSpend?: number;
  discountPercentage?: number;
  description?: string;
}

export interface LoyaltyTierRequest {
  name: string;
  minPoints: number;
  benefitDescription?: string;
  minimumSpend?: number;
  discountPercentage?: number;
  description?: string;
}

export interface AuditLog {
  id: number;
  entityName?: string;
  entity?: string;
  entityType?: string;
  entityId?: number | string;
  action: string;
  actionType?: string;
  actorId?: number | null;
  actor?: string;
  actorName?: string;
  userName?: string;
  actorRole?: string;
  timestamp?: string;
  createdAt?: string;
  actionTime?: string;
  detail?: string;
  description?: string;
  message?: string;
}

export type AuditLogResponse = AuditLog;

export interface ConcurrencyLog {
  id: number;
  endpoint: string;
  threadName: string;
  details: string;
  createdAt: string;
}

export interface UserPermissionOverviewResponse {
  userId: number;
  userName: string;
  role: string;
  extraPermissions: string[];
}
