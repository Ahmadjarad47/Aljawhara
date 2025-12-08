import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

// Allow self-signed certificates in development for localhost API
if (process.env['NODE_ENV'] !== 'production') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Security Headers Middleware
 * Best practice: Set security headers at the server level for better protection
 */
app.use((req, res, next) => {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // HSTS - Only enable in production with HTTPS
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

 
  // res.setHeader('Content-Security-Policy', cspHeader);

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser with optimized caching
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    immutable: true, // Files with hash in name can be cached forever
    index: false,
    redirect: false,
    etag: true, // Enable ETag for better caching
    lastModified: true,
    setHeaders: (res, path) => {
      // Set appropriate cache headers based on file type
      if (path.endsWith('.html')) {
        // HTML files should not be cached
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/)) {
        // Static assets can be cached for a long time
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
