import { PreparedBrowserCart } from '../Models/ai-shopping';
import { CartService } from './cart-service';

export function preparedFixture(): PreparedBrowserCart {
  return { operationId: '22222222-2222-4222-8222-222222222222', status: 'prepared',
    expiresAtUtc: new Date(Date.now() + 30000).toISOString(), replayUntilUtc: new Date(Date.now() + 3600000).toISOString(),
    items: [{ productId: 7, name: 'أكواب ورقية', image: '/cups.png', price: .500, quantity: 2, availablePackages: 20 }], unavailableItems: [] };
}

describe('Existing cart AI approval', () => {
  let saved: string | null;
  beforeEach(() => { saved = localStorage.getItem('cart_items'); localStorage.removeItem('cart_items'); });
  afterEach(() => { if (saved === null) localStorage.removeItem('cart_items'); else localStorage.setItem('cart_items', saved); });

  it('merges into the real cart signal, migrates legacy storage and prevents retry after recreation', async () => {
    localStorage.setItem('cart_items', JSON.stringify([{ id: 'existing', productId: 7, name: 'Old name', image: '', price: 9, quantity: 1, addedAt: new Date() }]));
    const cart = new CartService();
    expect(await cart.addApprovedShoppingList(preparedFixture())).toBe('added');
    expect(cart.getCartItemCount()).toBe(3); expect(cart.getTotalPrice()).toBe(1.5);
    expect(new CartService().getCartItems()[0].name).toBe('أكواب ورقية');
    const restored = new CartService();
    expect(await restored.addApprovedShoppingList(preparedFixture())).toBe('already-applied');
    expect(restored.getCartItemCount()).toBe(3);
  });

  it('serializes concurrent tab approvals and retains receipts when the cart is cleared', async () => {
    const first = new CartService(); const second = new CartService();
    const results = await Promise.all([first.addApprovedShoppingList(preparedFixture()), second.addApprovedShoppingList(preparedFixture())]);
    expect(results.sort()).toEqual(['added', 'already-applied']);
    first.clearCart();
    const restored = new CartService(); expect(restored.getCartItemCount()).toBe(0);
    expect(await restored.addApprovedShoppingList(preparedFixture())).toBe('already-applied');
    expect(restored.getCartItemCount()).toBe(0);
  });

  it('rejects changed cart quantities and expired preparations without partial writes', async () => {
    const cart = new CartService();
    cart.addItem({ productId: 7, name: 'أكواب', image: '', price: .5, quantity: 19 });
    const before = localStorage.getItem('cart_items');
    await expectAsync(cart.addApprovedShoppingList(preparedFixture())).toBeRejectedWithError('CART_CHANGED');
    expect(localStorage.getItem('cart_items')).toBe(before);
    await expectAsync(cart.addApprovedShoppingList({ ...preparedFixture(), expiresAtUtc: new Date(0).toISOString() })).toBeRejectedWithError('PREPARATION_EXPIRED');
    expect(cart.getCartItemCount()).toBe(19);
  });

  it('does not report success when persistence is blocked or the identity changes while queued', async () => {
    const cart = new CartService();
    await expectAsync(cart.addApprovedShoppingList(preparedFixture(), () => false)).toBeRejectedWithError('SESSION_CHANGED');
    const write = spyOn(Storage.prototype, 'setItem').and.throwError('Storage blocked');
    await expectAsync(cart.addApprovedShoppingList(preparedFixture())).toBeRejectedWithError('CART_STORAGE_FAILED');
    expect(write).toHaveBeenCalled(); expect(cart.getCartItemCount()).toBe(0);
  });
});
