import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
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
    const onLanguageChange = () => this.read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'language') this.read();
    };
    window.addEventListener('languagechange', onLanguageChange);
    window.addEventListener('storage', onStorage);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('languagechange', onLanguageChange);
      window.removeEventListener('storage', onStorage);
    });
  }

  private read(): void {
    // Storage can be blocked (private mode, blocked site data).
    let lang: string | null = null;
    try {
      lang = localStorage.getItem('language');
    } catch {
      return;
    }
    if (lang === 'ar' || lang === 'en') this.current.set(lang);
  }
}
