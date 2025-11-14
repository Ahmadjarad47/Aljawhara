import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withPreloading, PreloadAllModules } from '@angular/router';
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
      withViewTransitions(), // Enable view transitions for smoother navigation
      withPreloading(PreloadAllModules) // Preload routes after initial load for faster navigation
    ),
    
    // SSR optimizations
    provideClientHydration(
      withEventReplay() // Replay user events after hydration for better UX
    ),
    
    // HTTP Client with security and performance optimizations
    provideHttpClient(
      withFetch(), // Use Fetch API instead of XHR for better performance and modern browser support
      withInterceptors([authInterceptor]), // Auth interceptor with retry logic and token refresh
      withJsonpSupport() // Support JSONP if needed
    ),
    
    // Animations (async for better initial load - loads animations after app bootstrap)
    provideAnimationsAsync(),
  ]
};
