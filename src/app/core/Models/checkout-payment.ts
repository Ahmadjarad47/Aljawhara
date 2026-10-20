export enum PaymentInitializationStatus {
  NotApplicable = 0, Pending = 1, Ready = 2, RequiresReconciliation = 3, Failed = 4, Paid = 5,
}

export enum PaymentAttemptStatus {
  PendingDispatch = 0, Dispatching = 1, AwaitingPayment = 2, RequiresReconciliation = 3,
  Paid = 4, Failed = 5, Cancelled = 6, Expired = 7,
}

export interface CheckoutOrderResponse {
  orderId: number;
  paymentInitializationStatus: PaymentInitializationStatus;
  paymentUrl?: string | null;
  guestAccessToken?: string | null;
  reservationExpiresAtUtc?: string | null;
}

export interface OrderPaymentStatus {
  orderId: number;
  paymentAttemptId?: number | null;
  merchantReference?: string | null;
  attemptStatus?: PaymentAttemptStatus | null;
  initializationStatus: PaymentInitializationStatus;
  paymentUrl?: string | null;
  reservationExpiresAtUtc?: string | null;
  lastVerificationAtUtc?: string | null;
  verificationReasonCode?: string | null;
}
