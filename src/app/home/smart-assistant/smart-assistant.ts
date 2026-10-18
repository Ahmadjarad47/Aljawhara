import { afterNextRender, Component, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';

type KitItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

@Component({
  selector: 'app-smart-assistant',
  templateUrl: './smart-assistant.html',
  styleUrl: './smart-assistant.css',
  host: { dir: 'rtl' },
})
export class SmartAssistant {
  private readonly injector = inject(Injector);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly conversation = viewChild<ElementRef<HTMLElement>>('conversation');
  private readonly messageInput = viewChild<ElementRef<HTMLInputElement>>('messageInput');

  readonly isOpen = signal(false);
  readonly draft = signal('');
  readonly attachment = signal('');
  readonly feedback = signal('');
  readonly messages = signal<{ id: number; text: string; from: 'user' | 'assistant' }[]>([]);
  readonly items = signal<KitItem[]>([
    { id: 'plates', name: 'صحون ورقية', quantity: 10, unit: 'قطع' },
    { id: 'cups', name: 'أكواب ورقية', quantity: 10, unit: 'قطع' },
    { id: 'cutlery', name: 'ملاعق وشوك بلاستيكية', quantity: 10, unit: 'قطع' },
    { id: 'tissues', name: 'مناديل ورقية', quantity: 2, unit: 'عبوة' },
    { id: 'bags', name: 'أكياس نفايات', quantity: 1, unit: 'رول' },
    { id: 'tablecloth', name: 'مفرش سفرة بلاستيكي', quantity: 1, unit: 'قطعة' },
  ]);

  open(): void {
    this.isOpen.set(true);
    afterNextRender(() => this.panel()?.nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    this.isOpen.set(false);
    afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
  }

  changeQuantity(id: string, change: number): void {
    this.items.update(items => items.map(item => item.id === id
      ? { ...item, quantity: Math.max(1, Math.min(99, item.quantity + change)) }
      : item));
    this.feedback.set('');
  }

  removeItem(id: string): void {
    this.items.update(items => items.filter(item => item.id !== id));
    this.feedback.set('تم حذف العنصر من القائمة المقترحة.');
  }

  editList(): void {
    this.draft.set('أريد تعديل قائمة النزهة: ');
    this.messageInput()?.nativeElement.focus();
  }

  previewCart(): void {
    this.feedback.set('هذه قائمة تجريبية للمعاينة فقط. إضافة المنتجات للسلة ستتوفر عند تفعيل المساعد.');
  }

  selectAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.attachment.set(input.files?.[0]?.name ?? '');
    input.value = '';
  }

  send(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    const attachment = this.attachment();
    if (!text && !attachment) return;

    this.messages.update(messages => [
      ...messages,
      { id: messages.length, text: [text, attachment ? `📎 ${attachment}` : ''].filter(Boolean).join('\n'), from: 'user' },
      { id: messages.length + 1, text: 'أهلاً فيك! هذه معاينة لواجهة مساعد الجوهرة. يمكنك تجربة تعديل الكميات والقائمة، والمحادثة الذكية ستتوفر قريباً.', from: 'assistant' },
    ]);
    this.draft.set('');
    this.attachment.set('');
    afterNextRender(() => {
      const element = this.conversation()?.nativeElement;
      element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      this.messageInput()?.nativeElement.focus();
    }, { injector: this.injector });
  }
}
