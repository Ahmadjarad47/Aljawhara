import { Injectable, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Performance Service
 * 
 * Monitors and optimizes application performance, especially for mobile devices.
 * Provides metrics, optimizations, and performance hints.
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  private performanceObserver?: PerformanceObserver;
  private metrics: Map<string, number> = new Map();

  constructor() {
    if (this.isBrowser) {
      this.initializePerformanceMonitoring();
      this.optimizeForMobile();
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (!this.isBrowser || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Monitor Long Tasks (tasks that block the main thread for >50ms)
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              console.warn('Long task detected:', entry.duration, 'ms');
              // You can send this to analytics
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      }

      // Monitor Largest Contentful Paint (LCP)
      this.observeLCP();
      
      // Monitor First Input Delay (FID)
      this.observeFID();
      
      // Monitor Cumulative Layout Shift (CLS)
      this.observeCLS();
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.set('lcp', lastEntry.renderTime || lastEntry.loadTime);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      // LCP not supported
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          this.metrics.set('fid', entry.processingStart - entry.startTime);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      // FID not supported
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.set('cls', clsValue);
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      // CLS not supported
    }
  }

  /**
   * Optimize for mobile devices
   */
  private optimizeForMobile(): void {
    if (!this.isBrowser) return;

    // Reduce animation complexity on low-end devices
    if (this.isLowEndDevice()) {
      this.reduceAnimations();
    }

    // Optimize image loading based on connection
    this.optimizeImageLoading();

    // Preload critical resources when connection is good
    if (this.isFastConnection()) {
      this.preloadCriticalResources();
    }
  }

  /**
   * Check if device is low-end
   */
  private isLowEndDevice(): boolean {
    if (!this.isBrowser) return false;

    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    
    // Check device memory (if available)
    const memory = (navigator as any).deviceMemory || 4;
    
    // Low-end: < 4 cores or < 4GB RAM
    return cores < 4 || memory < 4;
  }

  /**
   * Check if connection is fast
   */
  private isFastConnection(): boolean {
    if (!this.isBrowser || !('connection' in navigator)) {
      return true;
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) return true;

    const effectiveType = connection.effectiveType;
    if (effectiveType) {
      return effectiveType === '4g' || effectiveType === '5g';
    }

    const downlink = connection.downlink;
    if (downlink) {
      return downlink > 2; // Faster than 2 Mbps
    }

    return true;
  }

  /**
   * Reduce animations on low-end devices
   */
  private reduceAnimations(): void {
    if (!this.isBrowser) return;

    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    
    // Add prefers-reduced-motion support
    const style = document.createElement('style');
    style.textContent = `
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize image loading based on connection
   */
  private optimizeImageLoading(): void {
    if (!this.isBrowser) return;

    // Use Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset['src']) {
              img.src = img.dataset['src'];
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px' // Start loading 50px before image enters viewport
      });

      // Observe all images with data-src attribute
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    if (!this.isBrowser) return;

    const criticalRoutes = ['/product', '/cart'];
    
    criticalRoutes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      link.as = 'document';
      document.head.appendChild(link);
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): {
    lcp?: number;
    fid?: number;
    cls?: number;
  } {
    return {
      lcp: this.metrics.get('lcp'),
      fid: this.metrics.get('fid'),
      cls: this.metrics.get('cls')
    };
  }

  /**
   * Measure time for a function execution
   */
  measureTime<T>(label: string, fn: () => T): T {
    if (!this.isBrowser || !performance.mark) {
      return fn();
    }

    const startMark = `${label}-start`;
    const endMark = `${label}-end`;
    const measureName = `${label}-measure`;

    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    console.log(`${label}: ${measure.duration.toFixed(2)}ms`);

    return result;
  }

  /**
   * Cleanup
   */
  ngOnDestroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

