export interface MessageResponse {
  message: string;
}

export interface ApiErrorResponse {
  message?: string;
  timestamp?: string;
  status?: number;
  error?: string;
  path?: string;
  [key: string]: unknown;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}
