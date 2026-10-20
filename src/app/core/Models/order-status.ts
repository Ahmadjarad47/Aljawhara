export enum OrderStatus {
  Pending = 0,
  Processing = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4,
  Refunded = 5,
  Expired = 6,
  RequiresReconciliation = 7,
}

export function normalizeOrderStatus(status: OrderStatus | string | null | undefined): OrderStatus | null {
  if (status === null || status === undefined) return null;
  const value = typeof status === 'string' ? status.trim() : status;
  if (value === '') return null;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && typeof OrderStatus[numeric] === 'string') return numeric;
  return (Object.values(OrderStatus).find(
    entry => typeof entry === 'number' && OrderStatus[entry].toLowerCase() === String(value).toLowerCase()
  ) as OrderStatus | undefined) ?? null;
}
