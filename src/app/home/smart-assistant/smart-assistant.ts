import { afterNextRender, Component, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-smart-assistant',
  templateUrl: './smart-assistant.html',
  styleUrl: './smart-assistant.css',
  host: { dir: 'rtl', lang: 'ar' },
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
  readonly messages = signal<{ id: number; text: string }[]>([]);

  open(): void {
    this.isOpen.set(true);
    afterNextRender(() => this.panel()?.nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    this.isOpen.set(false);
    afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
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
      { id: messages.length, text: [text, attachment ? `📎 ${attachment}` : ''].filter(Boolean).join('\n') },
    ]);
    this.draft.set('');
    this.attachment.set('');
    afterNextRender(() => {
      const element = this.conversation()?.nativeElement;
      element?.scrollTo({ top: element.scrollHeight });
      this.messageInput()?.nativeElement.focus();
    }, { injector: this.injector });
  }
}
