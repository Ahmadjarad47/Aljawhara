import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors, withJsonpSupport } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Error handling
    provideBrowserGlobalErrorListeners(),
    
    // Performance: Zoneless change detection for better performance
    provideZonelessChangeDetection(),
    
    // Router with performance optimizations
    provideRouter(
      routes,
      withComponentInputBinding(), // Enable component input binding from route params
      withViewTransitions() // Enable view transitions for smoother navigation
    ),
    
    // SSR optimizations
    provideClientHydration(
      withEventReplay() // Replay user events after hydration
    ),
    
    // HTTP Client with security and performance optimizations
    provideHttpClient(
      withFetch(), // Use Fetch API instead of XHR for better performance
      withInterceptors([authInterceptor]),
      withJsonpSupport() // Support JSONP if needed
      // Note: Request timeouts are handled in the auth interceptor
    ),
    
    // Animations (async for better initial load)
    provideAnimationsAsync(),
  ]
};
