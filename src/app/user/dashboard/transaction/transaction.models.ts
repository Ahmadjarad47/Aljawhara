export enum PaymentMethod {
  Card = 1,
  Cod = 2,
  Paypal = 3,
  Bank = 4
}

export interface TransactionAdvancedDto {
  id: number;
  orderId: number;
  orderNumber: string;
  appUserId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentMethodName: string;
  status: string;
  transactionDate: string; // ISO
  processedDate?: string | null; // ISO
  transactionReference?: string | null;
  paymentGatewayResponse?: string | null;
  notes?: string | null;
  isRefunded: boolean;
  refundAmount?: number | null;
  refundDate?: string | null; // ISO
  refundReason?: string | null;
  isActive: boolean;
}

export interface TransactionFilterDto {
  orderId?: number | null;
  orderNumber?: string | null;
  appUserId?: string | null;
  paymentMethod?: PaymentMethod | null;
  status?: string | null;
  startDate?: string | null; // ISO date
  endDate?: string | null; // ISO date
  minAmount?: number | null;
  maxAmount?: number | null;
  isRefunded?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}