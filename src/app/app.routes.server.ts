import { RenderMode, ServerRoute } from '@angular/ssr';
import { environment } from '../environments/environment';

export const serverRoutes: ServerRoute[] = environment.maintenance.enabled ? [
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 503,
    headers: {
      'Retry-After': '3600',
      'Cache-Control': 'no-store',
    },
  },
] : [
  {
    path: 'product/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
