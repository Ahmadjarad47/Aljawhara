import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Match only our catalog API, never checkout, authentication, or static assets. */
export function isCatalogUrl(url: string, apiUrl = environment.apiUrl): boolean {
  const base = apiUrl.replace(/\/$/, '') + '/';
  if (!url.toLowerCase().startsWith(base.toLowerCase())) return false;
  const path = url.slice(base.length).split(/[?#]/)[0];
  return /^(?:admin\/)?(?:products|categories|subcategories|inventory)(?:\/|$)/i.test(path) ||
    /^carousels\/(?:categories-with-images|customer-satisfaction|latest-third-reviews)(?:\/|$)/i.test(path);
}

export const catalogFreshnessInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET' || !isCatalogUrl(request.url)) return next(request);

  return next(request.clone({
    // Fetch no-store bypasses existing HTTP entries as well as preventing new ones.
    cache: 'no-store',
    transferCache: false,
    setHeaders: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
    },
  }));
};
