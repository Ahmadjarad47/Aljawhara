import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AIShoppingService } from '../../core/service/ai-shopping.service';
import { CartService } from '../../core/service/cart-service';
import { PreparedBrowserCart, ShoppingPreview } from '../../core/Models/ai-shopping';
import { SmartAssistant } from './smart-assistant';

describe('Smart assistant shopping flow', () => {
  let fixture: ComponentFixture<SmartAssistant>;
  let saved: string | null;
  let preview: ShoppingPreview;
  let prepared: PreparedBrowserCart;
  let api: { preview: ReturnType<typeof signal<ShoppingPreview | null>>; identityEpoch: ReturnType<typeof signal<number>>;
    chat: jasmine.Spy; recalculate: jasmine.Spy; prepareCart: jasmine.Spy; reset: jasmine.Spy };

  beforeEach(async () => {
    saved = localStorage.getItem('cart_items'); localStorage.removeItem('cart_items');
    preview = { conversationId: '11111111-1111-4111-8111-111111111111', recommendationId: '22222222-2222-4222-8222-222222222222',
      version: 1, message: 'جهزتلك القائمة', status: 'ready', currency: 'KWD', estimatedTotal: .500, requiresConfirmation: true,
      expiresAtUtc: new Date(Date.now() + 3600000).toISOString(), unavailableNeeds: [], recommendations: [{ productId: 7, variantId: null,
        productName: 'أكواب ورقية', imageUrl: '/cups.png', unitPrice: .500, currency: 'KWD', unitsPerPackage: 10,
        recommendedPackageQuantity: 1, lineTotal: .500, reason: 'عبوة مناسبة', needKeys: ['cups'] }] };
    prepared = { operationId: preview.recommendationId, status: 'prepared', expiresAtUtc: new Date(Date.now() + 30000).toISOString(),
      replayUntilUtc: preview.expiresAtUtc, items: [{ productId: 7, name: 'أكواب ورقية', image: '/cups.png', price: .500, quantity: 1, availablePackages: 20 }], unavailableItems: [] };
    api = { preview: signal<ShoppingPreview | null>(null), identityEpoch: signal(0), chat: jasmine.createSpy().and.resolveTo(preview),
      recalculate: jasmine.createSpy(), prepareCart: jasmine.createSpy().and.resolveTo(prepared), reset: jasmine.createSpy() };
    TestBed.configureTestingModule({ imports: [SmartAssistant], providers: [provideZonelessChangeDetection(), provideRouter([]),
      { provide: AIShoppingService, useValue: api }] });
    fixture = TestBed.createComponent(SmartAssistant); fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.open(); fixture.detectChanges(); await fixture.whenStable();
  });
  afterEach(() => {
    fixture.destroy();
    if (saved === null) localStorage.removeItem('cart_items'); else localStorage.setItem('cart_items', saved);
  });

  it('renders real recommendations but only changes the existing cart after explicit approval', async () => {
    const assistant = fixture.componentInstance; const cart = TestBed.inject(CartService);
    assistant.draft.set('نزهة لخمسة'); await assistant.send(new Event('submit')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.shopping-product-name').textContent).toContain('أكواب ورقية');
    expect(fixture.nativeElement.querySelector('.shopping-total').textContent).toContain('0.500');
    expect(cart.getCartItemCount()).toBe(0); expect(api.prepareCart).not.toHaveBeenCalled();
    await assistant.approve(); fixture.detectChanges();
    expect(cart.getCartItemCount()).toBe(1); expect(assistant.notice()).toContain('تمت إضافة');
    await assistant.approve(); expect(api.prepareCart).toHaveBeenCalledTimes(1); expect(cart.getCartItemCount()).toBe(1);
  });

  it('requires a recalculated preview before approval of quantity changes', async () => {
    const assistant = fixture.componentInstance; assistant.draft.set('نزهة'); await assistant.send(new Event('submit'));
    const input = document.createElement('input'); input.value = '2';
    assistant.editQuantity(preview.recommendations[0], { target: input } as unknown as Event);
    await assistant.approve(); expect(api.prepareCart).not.toHaveBeenCalled();
    api.recalculate.and.resolveTo({ ...preview, version: 2, recommendations: [{ ...preview.recommendations[0], recommendedPackageQuantity: 2 }] });
    await assistant.refresh();
    expect(api.recalculate).toHaveBeenCalledWith([{ productId: 7, packageQuantity: 2 }]);
    expect(assistant.hasEdits()).toBeFalse();
  });

  it('renders model/catalog markup as text and does not mutate the cart when preparation fails', async () => {
    const assistant = fixture.componentInstance;
    api.chat.and.resolveTo({ ...preview, message: '<script>bad()</script>', recommendations: [{ ...preview.recommendations[0], productName: '<img src=x onerror=bad()>' }] });
    assistant.draft.set('نزهة'); await assistant.send(new Event('submit')); fixture.detectChanges();
    const name = fixture.nativeElement.querySelector('.shopping-product-name');
    expect(name.textContent).toContain('<img'); expect(name.querySelector('img')).toBeNull();
    api.prepareCart.and.rejectWith(new Error('PREPARATION_EXPIRED'));
    await assistant.approve(); expect(TestBed.inject(CartService).getCartItemCount()).toBe(0);
    expect(assistant.error()).toContain('انتهت مهلة');
  });
});
