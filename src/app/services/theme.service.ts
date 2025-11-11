import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkMode = false;

  constructor() {
    // Initialize theme from localStorage or system preference
    if (typeof localStorage !== 'undefined') {


      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark';
      } else {
        // Check system preference
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      this.applyTheme();
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  setTheme(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.isDarkMode ? 'dark' : 'light';
  }

  isDark(): boolean {
    return this.isDarkMode;
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }
}
