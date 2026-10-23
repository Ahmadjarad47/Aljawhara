export interface ShoppingRecommendation {
  productId: number;
  variantId: null;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  currency: 'KWD';
  unitsPerPackage: number | null;
  recommendedPackageQuantity: number;
  lineTotal: number;
  reason: string;
  needKeys: string[];
}

export interface ShoppingPreview {
  conversationId: string;
  recommendationId: string;
  version: number;
  message: string;
  status: 'ready' | 'empty' | 'clarification';
  recommendations: ShoppingRecommendation[];
  currency: 'KWD';
  estimatedTotal: number;
  unavailableNeeds: string[];
  requiresConfirmation: boolean;
  expiresAtUtc: string;
}

export interface PreparedBrowserCart {
  operationId: string;
  status: 'prepared';
  expiresAtUtc: string;
  replayUntilUtc: string;
  items: {
    productId: number;
    name: string;
    image: string | null;
    price: number;
    quantity: number;
    availablePackages: number;
  }[];
  unavailableItems: {
    productId: number;
    requestedQuantity: number;
    addedQuantity: number;
    errorCode: string | null;
  }[];
}
