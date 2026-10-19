# Catalog freshness investigation — 19 October 2026

## Evidence and confirmed defects

The original affected Chrome profile was not connected to the available browser tools. The defects below are confirmed by source inspection and failing-before/passing-after browser tests. They do **not** establish which storage entry or document supplied the original visitor's exact 581 records.

1. **Persistent home catalog bypassed the network.** Before this change, `src/app/home/home-page/home-page.ts:588–598` read `home_featured_products` and returned immediately for a nonempty cache. Disabling HTTP cache cannot bypass localStorage. The cache had a five-minute TTL checked only when reading it; an already mounted page never revalidated it. The cache contained no API-environment or schema identity. Category tiles, reviews, and statistics used similar persisted snapshots.
2. **An empty response did not clear rendered cards.** The old `updateProductsLanguage()` at lines 625–629 only assigned `featuredProducts` when `originalProducts.length > 0`. A real successful empty response could therefore leave the old cards visible. Both defects reproduced before implementation, including a 581-item cached catalog.
3. **Build-time catalog responses could become browser data.** `app.routes.server.ts` put `/` and `/product` under wildcard prerendering. The public `/product` document inspected during this investigation was marked `ng-server-context="ssg"` and included API responses in `ng-state`. Its current product payload was empty, not 581. The response exposed no Cache-Control header. A previous version of this document could carry an older catalog through hydration; the affected profile's document was unavailable for comparison.
4. **Catalog requests inherited inappropriate caching directives.** `auth.interceptor.ts:100–110` assigns `public, max-age=300, stale-while-revalidate=600` to API GET request headers. These are request headers, not server response headers; their presence alone does not prove that Chrome cached the response. Catalog reads now explicitly override this policy and set Fetch's actual `cache` option.
5. **Completed RxJS snapshots and overlapping requests could restore old state.** Public categories reused completed requests; retained admin catalog observables replayed completed responses. Concurrent list/detail requests were not canceled when the filters or product changed. Errors could leave previous arrays, counts, or detail prices in memory.
6. **Catalog services imported `environment.development` directly.** This bypassed Angular's configured environment replacement. Both environment files currently name the same public API, so this is a switching defect, not evidence of today's requests going to a different database.

Public read-only checks: `GET https://api.aljawharaplus.com/api/Products?pageNumber=1&pageSize=20` returned HTTP 200 with `[]`; `/product` returned HTTP 200 with an empty prerendered product payload. Neither response exposed a Cache-Control header. `/ngsw.json` returned the SPA's HTML, not a worker manifest.

No `@angular/service-worker` dependency, registration, `ngsw-config.json`, IndexedDB catalog, Cache Storage catalog, or NgRx store was found. Service Worker responsibility is unproven; no registrations or caches are deleted. Storage used for authentication, cart, favorites, checkout, language, and theme is separate from the catalog caches.

## Implemented behavior and source locations

| File / entry point | Change |
| --- | --- |
| `src/app/home/home-page/home-page.ts:383` | Removes only four known legacy home catalog keys on initialization. Never reads or writes product/category/review/statistic snapshots again. |
| `src/app/home/home-page/home-page.ts:581` | Loads products from the API; cancels earlier requests; clears cards before loading; maps empty arrays unconditionally. |
| `src/app/home/home-page/home-page.html` | Distinguishes empty catalog from load failure, provides product retry, and exposes category failures. |
| `src/app/core/interceptors/catalog-freshness.interceptor.ts:5` | Matches only the configured catalog API and related category/review/statistic endpoints. GETs use Fetch `cache: 'no-store'`, `transferCache: false`, and request `Cache-Control: no-cache, no-store, max-age=0`. Auth and checkout paths are outside this policy. |
| `src/app/app.config.ts` | Registers the catalog policy after the existing auth interceptor and excludes catalog requests from hydration transfer caching. |
| `src/app/app.routes.server.ts:15` | Uses request-time SSR with `no-store` HTML for home, catalog list, and details. Other routes keep their existing rendering policies. |
| `src/app/home/product/product-service.ts:44` | Coalesces concurrent category requests only. Later subscribers revalidate, including when they retain the original observable. Keys include API URL and subcategory mode. Zero-valued price bounds are transmitted. |
| `src/app/home/product/product.ts:353` | Cancels superseded queries; resets arrays and counts; assigns successful zero totals; separates load errors from empty results. |
| `src/app/home/product/product.html` | Shows `0 - 0 of 0` for empty results and avoids displaying a success-empty message alongside a load error. |
| `src/app/home/product-detail/product-detail.ts:430` | Clears product, price, and related cards before loading another product. Cancels previous detail/related requests and explicitly reports failures. |
| `src/app/admin/{product/service-product,category/service-category,sub-category/subcategory}.ts` | Clears retained list/pagination state before new requests and shares only in-flight requests, with no completed snapshot replay. Existing CRUD and stock payloads/business rules are unchanged. |
| `src/app/admin/{product/product,category/category,sub-category/sub-category}.ts` | Cancels superseded list requests and tears down the active request on destruction. |
| Catalog services and `admin/carousel/service-carousel.ts` | Import the build-selected `environment` entry point. |
| `.github/workflows/deploy-angular.yml` | Prepares `index.html` from `index.csr.html` for the existing static deployment so catalog pages do not require a build-time product snapshot. |

Inventory, prices, availability, ratings, and related products use product API paths covered by the network policy. Saved cart and favorites records remain intact; their saved display snapshots are not used as catalog response fallbacks. Static files retain their existing long-lived cache policy. Hero slides retain a five-minute cache, now validated against API URL and cache-schema version; future-dated/expired snapshots are rejected.

Every new catalog read revalidates, so switching the database behind an unchanged API URL cannot resurrect a saved product response. There is no database identifier in the API contract and no invented client-side database detection.

## How returning visitors receive the fix

The change is implemented locally and **has not been deployed**. No production records, server configuration, or browser user data were changed.

1. Deploy the complete production build through the updated workflow. It already clears its previous web-root output before copying the new browser files. With another deployment process, publish a fresh release directory; do not overlay an old `/product/index.html` or home prerender with the new output.
2. For the current static Nginx host, route `/product` and `/product/:id` to the new `index.html` shell. Set `Cache-Control: no-cache, no-store, must-revalidate` on HTML responses, including the SPA fallback. Preserve immutable caching for hashed JS/CSS assets. The Node SSR server applies the route headers automatically if deployed instead.
3. Invalidate existing home/catalog **HTML** at any CDN/proxy that caches it. No browser-wide storage clearing or customer logout is required.
4. On the next load of the updated application, catalog calls bypass the browser HTTP cache. The home page removes only `home_featured_products`, `home_categories_with_images`, `home_customer_satisfaction`, and `home_latest_reviews`. This is repeatable and safe when storage is blocked. Empty responses render zero items.
5. An already-open old application cannot execute new code until reloaded. A previously cached HTML document that the host refuses to revalidate may require a one-time hard reload; deleting authentication/cart/favorites is unnecessary.

For Nginx, merge equivalent rules into the actual site configuration after inspecting its existing location blocks. This is illustrative, not a replacement server configuration:

```nginx
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
location = /index.csr.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
# Existing SPA fallback must resolve to the current index.html.
# Other prerendered HTML also needs revalidation; keep hashed assets immutable.
```

## Verification

- Before the fix: the two targeted home regressions failed; the 581-item snapshot prevented an API request, and an empty response left a rendered card intact.
- After the fix: **147/147 Karma/Jasmine tests passed in Chrome Headless 155** on Windows.
- Coverage includes: 581 cached products followed by zero products; actual Chrome localStorage and component recreation; fresh storage/private-session equivalent; blocked/corrupt storage; preservation of customer keys; successful empty response casing and zero totals; pagination/filter cancellation and zero price bounds; product create/update/delete; refreshed prices/availability; deleted details/404; offline/status 0 and 503; retry after recovery; retained RxJS observables; category/subcategory replacement; API URL changes and same-URL database resets; authentication header preservation and checkout policy isolation. CRUD responses are mocked; no production records were created or deleted.
- Service Worker update tests: not applicable, because this project does not enable one. No speculative worker cleanup was added.
- Production build: `ng build --configuration production --progress=false` completed with exit code 0. The catalog routes are absent from `prerendered-routes.json`; `index.csr.html` exists. Existing CSS budget/CommonJS/selector warnings and unrelated prerender browser-global errors are still logged. A bundled Node 24 build attempt also crashed in native code; the final build succeeded using the installed Node 26 runtime. CI continues to select Node 20.
- Built application smoke check: request-time `/product` returned HTTP 200 with `Cache-Control: no-store`, no serialized catalog transfer response, and the zero-product state. A fresh in-app browser session also displayed zero products against the public API.
- `git diff --check` passed.

Re-run from the repository root:

```powershell
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test -- --watch=false --browsers=ChromeHeadless --progress=false
npm run build -- --configuration=production --progress=false
```

## Remaining limits

- The original normal Chrome profile and its exact 581-item payload were unavailable. A real affected-profile/Incognito comparison remains a post-deployment check; the fresh-storage tests are not claimed as an interactive Incognito run.
- Static-host/CDN HTML policy must be applied on the actual host. Frontend code cannot force an old cached executable to update before it loads the release.
- A proxy that ignores request revalidation could still return stale API data; the public response headers should be monitored after deployment. No ASP.NET Core or PostgreSQL changes were justified or made.
- Catalog pages revalidate when loaded or queried; this does not introduce polling for server changes while a page remains idle. Offline catalog reads explicitly fail instead of presenting a persisted snapshot as current.
- Cart/favorites snapshots and existing checkout validation are intentionally preserved. They are independent of current catalog state.
- Existing browser-global errors in unrelated prerendered routes should be addressed separately. The build succeeds, but its logs are not clean.
