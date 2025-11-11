
export interface TransactionAdvancedDto {
    id: number;
    orderId: number;
    orderNumber: string;
    appUserId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentMethodName: string;
    status: string;
    transactionDate: string;
    processedDate: string | null;
    transactionReference: string | null;
    paymentGatewayResponse: string | null;
    notes: string | null;
    isRefunded: boolean;
    refundAmount: number | null;
    refundDate: string | null;
    refundReason: string | null;
    isActive: boolean;
}
export enum PaymentMethod {
    Card = 1,
    Cod = 2,
    Paypal = 3,
    Bank = 4
}
export interface TransactionCreateAdvancedDto {
    orderId: number;
    amount: number;
    paymentMethod: PaymentMethod;
    status: string;
    transactionReference: string | null;
    paymentGatewayResponse: string | null;
    notes: string | null;
}

export interface TransactionUpdateDto {
    id: number;
    status: string;
    transactionReference: string | null;
    paymentGatewayResponse: string | null;
    notes: string | null;
}

export interface TransactionRefundDto {
    transactionId: number;
    refundAmount: number;
    refundReason: string;
    notes: string | null;
}

export interface TransactionFilterDto {
    orderId: number | null;
    orderNumber: string | null;
    appUserId: string | null;
    paymentMethod: PaymentMethod | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
    minAmount: number | null;
    maxAmount: number | null;
    isRefunded: boolean | null;
    pageNumber: number;
    pageSize: number;
    sortBy: string;
    sortDirection: string;
}

export interface TransactionAnalyticsDto {
    totalTransactions: number;
    totalAmount: number;
    averageTransactionAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    refundedAmount: number;
    netAmount: number;
    transactionsByStatus: { [key: string]: number; };
    amountByPaymentMethod: { [key: string]: number; };
    countByPaymentMethod: { [key: string]: number; };
    dailyTrends: TransactionTrendDto[];
    monthlyTrends: TransactionTrendDto[];
}

export interface TransactionTrendDto {
    period: string;
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
}

export interface TransactionSummaryDto {
    id: number;
    orderNumber: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionDate: string;
    isRefunded: boolean;
    isActive: boolean;
}

export interface PaymentProcessingDto {
    orderId: number;
    paymentMethod: PaymentMethod;
    cardNumber: string | null;
    cardExpiryMonth: string | null;
    cardExpiryYear: string | null;
    cardCvv: string | null;
    cardHolderName: string | null;
    payPalEmail: string | null;
    bankAccountNumber: string | null;
    bankRoutingNumber: string | null;
    bankName: string | null;
    notes: string | null;
}