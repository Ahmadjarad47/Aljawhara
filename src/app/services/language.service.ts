import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppLanguage = 'ar' | 'en';

/**
 * Active UI language, kept in sync with localStorage.
 *
 * The navbar writes `language` and dispatches a `languagechange` event, so
 * listening is enough — no polling. `storage` covers other tabs.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly current = signal<AppLanguage>('ar');

  constructor() {
    if (!this.isBrowser) return;
    this.read();
    window.addEventListener('languagechange', () => this.read());
    window.addEventListener('storage', (e) => {
      if (e.key === 'language') this.read();
    });
  }

  private read(): void {
    const lang = localStorage.getItem('language');
    if (lang === 'ar' || lang === 'en') this.current.set(lang);
  }
}
