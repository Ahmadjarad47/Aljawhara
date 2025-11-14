import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Selective Preloading Strategy
 * 
 * This strategy preloads routes based on:
 * 1. Network connection quality (only on fast connections)
 * 2. User interaction patterns (preload after initial load)
 * 3. Route priority (critical routes preload first)
 * 
 * For mobile devices, this prevents unnecessary data usage
 * and improves performance on slower connections.
 */
@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  // Routes that should be preloaded immediately (high priority)
  private readonly highPriorityRoutes = [
    'product',
    'cart',
    'checkout'
  ];

  // Routes that should be preloaded after a delay (medium priority)
  private readonly mediumPriorityRoutes = [
    'about',
    'contact',
    'privacy',
    'terms'
  ];

  // Routes that should only be preloaded on fast connections
  private readonly lowPriorityRoutes = [
    'auth',
    'user',
    'admin'
  ];

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Check if route has custom preload configuration
    if (route.data && route.data['preload'] === false) {
      return of(null);
    }

    const routePath = route.path || '';

    // High priority routes - preload after short delay
    if (this.highPriorityRoutes.some(priority => routePath.includes(priority))) {
      return timer(2000).pipe(
        mergeMap(() => {
          if (this.shouldPreload()) {
            return load();
          }
          return of(null);
        })
      );
    }

    // Medium priority routes - preload after longer delay
    if (this.mediumPriorityRoutes.some(priority => routePath.includes(priority))) {
      return timer(5000).pipe(
        mergeMap(() => {
          if (this.shouldPreload()) {
            return load();
          }
          return of(null);
        })
      );
    }

    // Low priority routes - only preload on fast connections
    if (this.lowPriorityRoutes.some(priority => routePath.includes(priority))) {
      return timer(10000).pipe(
        mergeMap(() => {
          if (this.shouldPreload() && this.isFastConnection()) {
            return load();
          }
          return of(null);
        })
      );
    }

    // Default: preload after delay if connection is good
    return timer(8000).pipe(
      mergeMap(() => {
        if (this.shouldPreload() && this.isFastConnection()) {
          return load();
        }
        return of(null);
      })
    );
  }

  /**
   * Check if we should preload based on device capabilities
   */
  private shouldPreload(): boolean {
    // Don't preload if device is on battery saver mode
    if ('getBattery' in navigator) {
      // Battery API is deprecated but still useful for detection
      return true;
    }

    // Don't preload if user has data saver enabled
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.saveData) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if connection is fast enough for preloading
   */
  private isFastConnection(): boolean {
    if (!('connection' in navigator)) {
      return true; // Assume fast if we can't detect
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) {
      return true;
    }

    // Check effective type
    const effectiveType = connection.effectiveType;
    if (effectiveType) {
      // Only preload on 4g or better
      return effectiveType === '4g' || effectiveType === '5g';
    }

    // Check downlink speed (Mbps)
    const downlink = connection.downlink;
    if (downlink) {
      // Only preload if connection is faster than 2 Mbps
      return downlink > 2;
    }

    // Default to true if we can't determine
    return true;
  }
}

