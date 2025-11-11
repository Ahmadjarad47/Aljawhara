export interface OrderItemCreateDto {
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface CartItem extends OrderItemCreateDto {
  id: string; // unique id for cart item (timestamp or uuid)
  addedAt: Date;
  couponCode?: string; // Applied coupon code for this cart item
}

