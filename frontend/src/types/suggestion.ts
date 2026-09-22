export interface RoomTypeOccupancyDto {
  roomTypeId: number;
  roomTypeName: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  basePrice?: number;
}

export type SuggestionType = 'INCREASE_PRICE' | 'DECREASE_PRICE_OR_CHANNELS' | 'OPTIMAL';
export type ConfidenceLevel = 'HIGH' | 'LOW';

export interface PriceSuggestionDto {
  targetDate: string; // YYYY-MM-DD
  dayOfWeek: string;  // Thứ Hai, Thứ Ba...
  daysRemaining: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  currentOccupancyRate: number;
  referenceOccupancyRate: number | null; // Cùng kỳ năm trước (null nếu chưa đủ 1 năm)
  highThreshold: number;
  lowThreshold: number;
  imminentDaysThreshold: number;
  suggestionType: SuggestionType;
  suggestionTitle: string;
  recommendation: string;
  confidenceLevel: ConfidenceLevel;
  confidenceNote: string;
  dismissed: boolean;
  dismissedAt?: string;
  roomTypeBreakdown: RoomTypeOccupancyDto[];
}

export interface PriceSuggestionResponse {
  suggestions: PriceSuggestionDto[];
  hasMinimumData: boolean;
  dataMonthsCount: number;
  earliestBookingDate: string | null;
  hasFullYearData: boolean;
  configured: boolean;
  highOccupancyThreshold: number;
  lowOccupancyThreshold: number;
  imminentDaysThreshold: number;
  totalRooms: number;
  totalSuggestionsCount: number;
  increaseCount: number;
  decreaseCount: number;
  dismissedCount: number;
}

export interface PriceSuggestionConfigRequest {
  highOccupancyThreshold: number;
  lowOccupancyThreshold: number;
  imminentDaysThreshold: number;
}

export interface PriceSuggestionConfigResponse {
  highOccupancyThreshold: number;
  lowOccupancyThreshold: number;
  imminentDaysThreshold: number;
  configured: boolean;
  hasMinimumData: boolean;
  dataMonthsCount: number;
  earliestBookingDate: string | null;
  hasFullYearData: boolean;
}
