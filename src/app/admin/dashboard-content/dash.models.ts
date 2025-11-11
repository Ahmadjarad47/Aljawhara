export interface CountSummaryDto {
  total: number;
  lastMonth: number;
}

export interface SalesSummaryDto {
  total: number;
  lastMonth: number;
}

export interface DashboardSummaryDto {
  users: CountSummaryDto;
  orders: CountSummaryDto;
  transactions: CountSummaryDto;
  visitors: CountSummaryDto;
  sales: SalesSummaryDto;
}

export interface OrderSummaryDto {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
  customerName: string;
  isActive: boolean;
}

export interface UserSummaryDto {
  id: string;
  username?: string;
  email?: string;
  createdAt: string;
  emailConfirmed: boolean;
}

export interface TimeSeriesPointDto {
  date: string;
  count: number;
}

export enum OrderStatus {
  Pending = 0,
  Processing = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4
}

export type Period = '7d' | '30d' | '60d' | '90d' | '180d' | '365d' | '1y' | '2y';
