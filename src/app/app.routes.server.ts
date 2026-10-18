import { RenderMode, ServerRoute } from '@angular/ssr';
import { environment } from '../environments/environment';

export const serverRoutes: ServerRoute[] = environment.maintenance.enabled ? [
  {
    path: '**',
    // Authentication is stored in localStorage. Check access in the browser so
    // signed-in administrators can enter without receiving a cached 503 page.
    renderMode: RenderMode.Client,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
] : [
  { path: 'checkout/success', renderMode: RenderMode.Client },
  { path: 'checkout/failed', renderMode: RenderMode.Client },
  {
    path: 'checkout',
    // Checkout restores the customer's cart and saved delivery details in the browser.
    renderMode: RenderMode.Client
  },
  {
    path: 'product/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
