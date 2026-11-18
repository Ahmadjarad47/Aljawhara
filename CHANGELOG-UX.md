# CHANGELOG-UX

UX refactor of the customer account area (`/user`). Scope: the dashboard shell
and its three pages — orders, transactions, settings.

No routes, data models or API contracts were changed. Architecture, naming and
the existing DaisyUI theme layer were kept.

## Design system

The project already had one, so nothing new was introduced: the DaisyUI
`light-user` / `userdark` themes plus the `account-page.css` token layer. This
refactor finished that layer and moved every page onto it.

| | |
|---|---|
| **Colour** | theme vars only (`--color-base-100/200/300`, `--color-primary`, `success`/`warning`/`error`) plus the two derived tokens `--account-line` (content @10%) and `--account-muted` (content @65%). No raw hex. |
| **Type scale** | 28 (h1, 25 mobile) / 20 / 17 (card h2) / 15 / 14 (body) / 13 / 12 (label). Inputs forced to 16px so iOS does not zoom on focus. |
| **Spacing** | 4px base: 6 · 8 · 10 · 12 · 14 · 18 · 22 · 28 |
| **Radii** | 7 badge · 11 control · 14 inner card · 18 card · 22 modal |
| **Elevation** | one shadow: `0 3px 14px rgb(0 0 0 / 3%)` |
| **Focus** | `2px solid var(--color-primary)`, 3px offset, on every interactive element |
| **Touch** | 44px floor, 46–48px for primary controls |
| **Motion** | `prefers-reduced-motion` honoured across the account pages |

### Shared components (`src/app/user/dashboard/account-page.css`)

Existing: `account-page`, `-header`, `-title-row`, `-count`, `-card`, `-field`,
`-field-grid`, `-label`, `-hint`, `-icon`, `badge-*`, `-empty`, `-loading`,
`-modal` / `-modal-header` / `-modal-body` / `-modal-footer` / `-modal-close`,
`-section-heading`.

Added or promoted out of individual pages: **`-toolbar`**, **`-search`**,
**`-tabs`**, **`-table`**, **`-card-list`**, **`-error`**, **`-pagination`**,
**`-confirm`**.

---

## Per page

### Shell — `/user` (`dashboard.*`)

**Before.** Nav items were `<button (click)="navigateTo()">` with
`routerLinkActive` attached to them, so the active state never rendered and the
sections could not be deep-linked or opened in a new tab. Language was polled
from `localStorage` every **100 ms**. Mobile had a hamburger drawer whose
collapse feature relied on `is-drawer-*` classes that are not defined anywhere
in the project — dead markup. No `OnPush`.

**After.** `routerLink` + `routerLinkActive`, with `aria-current="page"` and a
3px marker so the active section does not read by colour alone. Desktop keeps a
persistent sidebar; mobile gets a sticky header plus a scrollable section tab
strip. A skip-to-content link was added.

- **Components added:** `LanguageService` (`src/app/services/language.service.ts`)
- **Components removed:** the DaisyUI drawer markup and its dead `is-drawer-*` classes

### Orders — `/user/orders`

**Before.** The only page not on the shared system: 194 lines of `orders-*` CSS
that reimplemented `account-*` one-for-one. Cancelling an order went through
`window.confirm()`. A failed load left an empty list that was indistinguishable
from "no orders" once the toast had gone. The details modal body was raw
Tailwind size pairs (`text-xs sm:text-sm`, ~40 occurrences) and the shipping
address was 14 near-identical `<p>` blocks. The desktop empty state lived in a
`colspan=8` table cell. Toast copy was hardcoded Arabic in 8 places regardless
of the selected language. Star rating colour was a hardcoded `#c47e15`.

**After.** On the shared system; the page CSS is now orders-specific only.
Cancel goes through a confirmation dialog stating the action cannot be undone.
Error state with retry. Address rendered from a field list. Row actions carry
accessible names that include the order number. `OnPush`.

- **Components added:** cancel-confirmation dialog (uses shared `account-confirm`)
- **Components removed:** `orders-page`, `orders-header`, `orders-count`,
  `orders-search`, `orders-filters`, `orders-desktop`, `orders-mobile`,
  `orders-loading`, `orders-empty`, `orders-modal*`, `orders-badge*` — all
  replaced by their `account-*` equivalents
- **Copy fix:** the generic `street` field was labelled "Street", the same label
  as `alSharee`, which is the actual الشارع field. It now reads "Address".

### Transactions — `/user/transactions`

**Before.** Already in good shape. The status filter was a **free-text input**,
so filtering required guessing the exact string the API matches. No error
state. Same 100 ms poller, plus a `storage` listener that was never removed.

**After.** Status is a `<select>` over the values `normalizeStatus()`
recognises — same string payload, same contract. Error state with retry.
Toolbar, table, card list, search and pagination now use the shared classes.
`OnPush`.

- **Components added:** none (error state is the shared `account-error`)
- **Components removed:** local `transaction-toolbar`, `transactions-desktop`,
  `transactions-mobile`, `transaction-pagination`, `account-search` duplicate

### Settings — `/user/settings`

**Before.** Deleting a saved address happened **immediately, with no
confirmation and no undo**. A failed address load fell back to "no addresses
found", which reads as an empty account rather than a failure. Same poller.

**After.** Delete goes through a confirmation dialog that names the address and
states the deletion is permanent, with progress on the button while the request
is in flight. Error state with retry for the address list. `OnPush`.

- **Components added:** delete-confirmation dialog (shared `account-confirm`)
- **Components removed:** local `.account-tabs` rules (now shared)

Not changed: the **Add address** button only appears when no address exists.
That matches `openAddAddress()`, which enforces a one-address-per-customer
limit, so it is correct as written.

---

## Cross-cutting

- **Four `setInterval` language pollers deleted** (one at 100 ms in the shell,
  plus one per page) along with three `window` `storage` listeners that were
  never removed. The navbar already dispatches a `languagechange` event
  ([navbar.ts:483](src/app/home/navbar/navbar.ts)), so `LanguageService` just
  listens. It is SSR-safe and tolerates blocked storage.
- All four components moved to `ChangeDetectionStrategy.OnPush` and dropped the
  redundant `standalone: true`, per the project's own Angular conventions.

## Verification

`ng build` and the full Karma suite (237 specs) pass. Pages were checked in the
browser at 375 / 768 / 1440.

Two defects were found by that browser pass and fixed:

1. A first attempt gave the account area its own mobile bottom nav, which
   stacked on top of the store's existing fixed bottom bar. Replaced with the
   section tab strip, and the content now has bottom padding so the store bar
   does not cover the last rows.
2. `LanguageService` originally kept its `window` listeners forever. As a root
   singleton it then reacted to events dispatched by other specs and made
   `home-page.spec` fail depending on spec order. Listeners are now torn down
   via `DestroyRef`.

**Not visually verified:** the pages populated with real data. `/user/**` is
behind `authGuard` and the dev build points at the live API, so the states
observed in the browser were loading, error and empty. Populated rendering is
covered by the 22 specs under `src/app/user/`, not by eye.

## Follow-ups

| | |
|---|---|
| Unguarded `localStorage` in `ngOnInit` throws during prerender in `login`, `register`, `reset-password`, `about`, `contact`, `verify` — the same pattern removed from `/user`. Visible as `ERROR TypeError: Cannot read properties of undefined (reading 'getItem')` in any cold `ng build`. | app-wide |
| The other pages still carry their own copy of the `t()` dictionary and the language poller; `ngx-translate` is installed but unused here. | app-wide |
| `transaction.ts` `getCurrentPage()` / `getTotalPages()` subscribe and unsubscribe synchronously inside template bindings. | transactions |
| Orders has no pagination; it loads and filters the whole list client-side. | orders |
| The settings tab selection is not reflected in the URL, so it resets on reload. Would need a query param — a routing change, left for approval. | settings |
| `NgOptimizedImage` is not used anywhere in the project; the account shell follows the existing plain `<img>` pattern. | app-wide |
