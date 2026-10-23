import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AIShoppingService } from '../../core/service/ai-shopping.service';
import { CartService } from '../../core/service/cart-service';
import { ShoppingPreview, ShoppingRecommendation } from '../../core/Models/ai-shopping';

@Component({
  selector: 'app-smart-assistant',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './smart-assistant.html',
  styleUrl: './smart-assistant.css',
  host: { dir: 'rtl', lang: 'ar' },
})
export class SmartAssistant {
  private readonly api = inject(AIShoppingService);
  private readonly cart = inject(CartService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly conversation = viewChild<ElementRef<HTMLElement>>('conversation');
  private readonly messageInput = viewChild<ElementRef<HTMLInputElement>>('messageInput');

  readonly isOpen = signal(false);
  readonly draft = signal('');
  readonly messages = signal<{ id: number; role: 'user' | 'assistant'; text: string }[]>([]);
  readonly preview = this.api.preview;
  readonly working = signal<'chat' | 'recalculate' | 'confirm' | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly quantities = signal<Record<number, number>>({});
  readonly confirmedId = signal<string | null>(null);
  readonly hasEdits = computed(() => this.preview()?.recommendations.some(item =>
    this.quantity(item) !== item.recommendedPackageQuantity) ?? false);
  readonly visibleItems = computed(() => this.preview()?.recommendations.filter(item => this.quantity(item) > 0) ?? []);
  readonly displayTotal = computed(() => (this.preview()?.recommendations ?? []).reduce((sum, item) =>
    sum + this.quantity(item) * item.unitPrice, 0));
  readonly isConfirmed = computed(() => this.confirmedId() === this.preview()?.recommendationId);

  constructor() {
    this.destroyRef.onDestroy(() => this.api.reset());
    effect(() => {
      this.api.identityEpoch();
      this.messages.set([]); this.quantities.set({}); this.confirmedId.set(null);
      this.error.set(''); this.notice.set(''); this.draft.set('');
    });
  }

  open(): void {
    this.isOpen.set(true);
    afterNextRender(() => this.panel()?.nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    this.isOpen.set(false);
    afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
  }

  newConversation(): void {
    if (!this.working()) this.api.reset();
  }

  async send(event: Event): Promise<void> {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text || text.length > 2000 || this.working() || this.hasEdits()) return;
    const epoch = this.api.identityEpoch();
    this.working.set('chat'); this.error.set(''); this.notice.set('');
    this.append('user', text);
    this.draft.set('');
    try {
      const preview = await this.api.chat(text);
      if (epoch !== this.api.identityEpoch()) return;
      this.accept(preview); this.append('assistant', preview.message);
    } catch (error) {
      if (epoch === this.api.identityEpoch()) { this.error.set(this.errorMessage(error)); this.draft.set(text); }
    } finally { this.working.set(null); this.scroll(); }
  }

  quantity(item: ShoppingRecommendation): number { return this.quantities()[item.productId] ?? item.recommendedPackageQuantity; }

  editQuantity(item: ShoppingRecommendation, event: Event): void {
    if (this.working() || this.isConfirmed()) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      (event.target as HTMLInputElement).value = String(this.quantity(item)); return;
    }
    this.quantities.update(q => ({ ...q, [item.productId]: value }));
  }

  remove(item: ShoppingRecommendation): void {
    if (!this.working() && !this.isConfirmed()) this.quantities.update(q => ({ ...q, [item.productId]: 0 }));
  }

  replace(item: ShoppingRecommendation): void {
    this.draft.set(`بدّل ${item.productName} بخيار آخر مناسب`);
    this.messageInput()?.nativeElement.focus();
  }

  cancelEdits(): void { this.quantities.set({}); }

  async refresh(): Promise<void> {
    const preview = this.preview();
    if (!preview || this.working()) return;
    const epoch = this.api.identityEpoch();
    this.working.set('recalculate'); this.error.set(''); this.notice.set('');
    try {
      const updated = await this.api.recalculate(preview.recommendations.filter(x => this.quantity(x) > 0)
        .map(x => ({ productId: x.productId, packageQuantity: this.quantity(x) })));
      if (epoch === this.api.identityEpoch()) this.accept(updated);
    } catch (error) {
      if (epoch === this.api.identityEpoch()) this.error.set(this.errorMessage(error));
    } finally { this.working.set(null); }
  }

  async approve(): Promise<void> {
    const preview = this.preview();
    if (!preview?.requiresConfirmation || this.working() || this.hasEdits() || this.isConfirmed()) return;
    const epoch = this.api.identityEpoch();
    this.working.set('confirm'); this.error.set(''); this.notice.set('');
    try {
      const totals = new Map<number, number>();
      this.cart.getCartItems().forEach(x => totals.set(x.productId, (totals.get(x.productId) ?? 0) + x.quantity));
      const prepared = await this.api.prepareCart([...totals].map(([productId, quantity]) => ({ productId, quantity })));
      if (epoch !== this.api.identityEpoch()) return;
      if (!prepared.items.length) {
        this.notice.set('تغيّر المخزون وتعذرت الإضافة. حدّث القائمة أو اطلب بدائل.'); return;
      }
      const result = await this.cart.addApprovedShoppingList(prepared, () => epoch === this.api.identityEpoch());
      if (epoch !== this.api.identityEpoch()) return;
      this.confirmedId.set(preview.recommendationId);
      this.notice.set(result === 'already-applied' ? 'هذه التجهيزات أُضيفت للسلة مسبقاً، ولم نكرر الإضافة.' :
        prepared.unavailableItems.length ? 'تمت إضافة المنتجات المتاحة للسلة. بعض المنتجات لم تعد متوفرة.' : 'تمت إضافة التجهيزات للسلة.');
    } catch (error) {
      if (epoch === this.api.identityEpoch()) this.error.set(this.errorMessage(error));
    } finally { this.working.set(null); this.scroll(); }
  }

  private accept(preview: ShoppingPreview): void {
    this.api.preview.set(preview); this.quantities.set({}); this.confirmedId.set(null);
  }

  private append(role: 'user' | 'assistant', text: string): void {
    this.messages.update(messages => [...messages, { id: (messages.at(-1)?.id ?? 0) + 1, role, text }].slice(-60));
    this.scroll();
  }

  private errorMessage(error: unknown): string {
    const code = error instanceof HttpErrorResponse ? error.error?.code ?? error.error?.title : error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      AI_SHOPPING_DISABLED: 'المساعد غير مفعّل حالياً. يرجى المحاولة لاحقاً.',
      INVALID_MESSAGE: 'اكتب طلباً واضحاً لا يزيد عن ٢٠٠٠ حرف.',
      AI_RATE_LIMIT: 'طلباتك وصلت للحد المؤقت. انتظر دقيقة وحاول مجدداً.',
      AI_BUSY: 'المساعد مشغول حالياً. حاول بعد قليل.',
      STALE_RECOMMENDATION: 'القائمة تغيّرت. ابدأ محادثة جديدة لتجهيز طلبك.',
      PREVIEW_CHANGED: 'تغيّر السعر أو حجم العبوة. حدّث القائمة وراجعها قبل الموافقة مجدداً.',
      CART_CHANGED: 'تغيّرت السلة أو الكمية المتاحة. حدّث القائمة وحاول مجدداً.',
      PRODUCT_UNAVAILABLE: 'بعض المنتجات لم تعد متوفرة بهذه الكمية. اطلب بدائل أو خفّض الكمية.',
      BUDGET_EXCEEDED: 'الكميات تتجاوز ميزانيتك. خفّضها أو عدّل الميزانية في المحادثة.',
      CONVERSATION_NOT_FOUND: 'انتهت المحادثة. ابدأ محادثة جديدة.',
      INVALID_SHOPPING_SESSION: 'انتهت جلستك. ابدأ محادثة جديدة.',
      PREPARATION_EXPIRED: 'انتهت مهلة التحقق. راجع القائمة واضغط الإضافة مجدداً.',
      CART_STORAGE_FAILED: 'تعذر حفظ السلة. اسمح للموقع بالتخزين في المتصفح وحاول مجدداً.',
      CART_LOCK_UNAVAILABLE: 'يلزم متصفح محدّث واتصال آمن لإضافة التجهيزات. يمكنك إضافتها من صفحات المنتجات.',
    };
    return messages[code] ?? 'تعذّر تنفيذ الطلب حالياً. حاول مجدداً، أو ابدأ محادثة جديدة إذا استمرت المشكلة.';
  }

  private scroll(): void {
    if (this.destroyRef.destroyed) return;
    afterNextRender(() => {
      const element = this.conversation()?.nativeElement;
      element?.scrollTo({ top: element.scrollHeight });
      this.messageInput()?.nativeElement.focus();
    }, { injector: this.injector });
  }
}
