# Plugin Taste Skill Audit Report (2026-07-31)

Audited against Taste Skill v2 §11 redesign protocol. All findings tagged with rule reference, effort (XS/S/M/L), and impact (HIGH/MED/LOW).

## Inventory

| Item | Value |
|------|-------|
| Components audited | `LiteraWidget.tsx`, `providers.tsx`, `config/index.tsx`, `App.tsx`, `ErrorBoundary.tsx`, `index.tsx` |
| Design tokens | Terracotta `#d07954` / hover `#b86644` — **PRESERVED** (project exceptions). Also `#F04E37` (orange-red) used inline extensively. |
| Glassmorphism | `backdrop-filter: blur(20px)` + CSS custom properties — **PRESERVED** (design pattern) |
| Animations | CSS transitions (`transition: all 0.2s ease`) + `animation: spin/pulse` inline; Framer Motion in deps but unused |
| Dark mode | `tailwind.config.js:11` sets `darkMode: "media"`. `App.tsx` uses `dark:` variants; `LiteraWidget.tsx` uses `@media (prefers-color-scheme: dark)` CSS custom properties — **PARTIAL PARITY** |
| Design system | None — all styling inline in `LiteraWidget.tsx` + `App.tsx` Tailwind utilities |
| Security | Hardcoded Infura key in `config/index.tsx:27` (exposed in bundle) — flagged M (deferred) |

---

## Findings

### [HIGH] Hardcoded Infura API key exposed in frontend bundle
- **File:** `src/config/index.tsx:27`
- **Rule:** §11.a (Security/Accessibility — user-visible risk)
- **Current:** `http('https://polygon-mainnet.infura.io/v3/e3fd4e9a33ef48d3be06ec68b7fd1b0a')` hardcoded in fallback array
- **Recommended:** Move to env var `REACT_APP_INFURA_RPC_URL` (already read via `process.env.REACT_APP_INFURA_RPC_URL` on line 26). Rotate exposed key in Infura dashboard. Long-term: proxy all RPC via backend `/api/v1/rpc/proxy` with rate limiting.
- **Effort:** M (deferred — out of scope for quick wins, tracked in AGENTS.md Security & Audit)

### [HIGH] Missing `focus-visible` rings on all interactive elements in widget
- **File:** `src/components/LiteraWidget.tsx:683-712` (`renderWalletButton`), `124-169` (`LiteraButton`), `953-986` (quiz option buttons), `990-1002` (quiz navigation), `1072-1086` (mint button), `1170-1177` (Collect NFT button)
- **Rule:** §11.a (Accessibility — focus-visible)
- **Current:** All buttons use inline styles with `transition: 'all 0.2s ease'` but **zero** `focus-visible` / `:focus-visible` styles. Keyboard users see no focus indicator.
- **Recommended:** Add `focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:outline-none` via Tailwind on `LiteraButton` and `renderWalletButton`. For quiz option buttons (inline styles), add CSS custom property `--lw-focus: var(--lw-badge-text)` and apply `box-shadow: var(--lw-focus-ring)` in `:focus-visible` via injected theme CSS.
- **Effort:** XS

### [HIGH] No `prefers-reduced-motion` guard on any animation
- **File:** `src/components/LiteraWidget.tsx:39-98` (THEME_CSS), `186-189` (ambient glows), `206-207` (badge pulse), `939-940` (progress bar), `126` (spinner)
- **Rule:** §11.c (Motion consistency — accessibility)
- **Current:** Animations run unconditionally: `animation: 'spin 1s linear infinite'`, `animation: 'pulse 2s infinite'`, `transition: 'all 0.2s ease'` (20+ occurrences), ambient glow divs with no motion guard.
- **Recommended:** Add global CSS rule in `index.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Effort:** XS

### [MED] No design tokens in Tailwind config — brand colors hardcoded as arbitrary values
- **File:** `tailwind.config.js:8-9`, `src/components/LiteraWidget.tsx` (15+ occurrences)
- **Rule:** §11.f (Design tokens)
- **Current:** `extend: {}` — empty. Colors `#F04E37`, `#d9432f`, `#d07954`, `#b86644`, `#10b981`, `#ef4444`, `#3b82f6` appear as inline styles / arbitrary values (`bg-[#F04E37]`, `text-[#F04E37]`, etc.) across widget.
- **Recommended:** Add to `tailwind.config.js`:
  ```js
  theme: {
    extend: {
      colors: {
        terracotta: { DEFAULT: '#d07954', hover: '#b86644', light: '#F04E37', dark: '#d9432f' },
        litera: { success: '#10b981', error: '#ef4444', info: '#3b82f6' }
      }
    }
  }
  ```
  Replace all arbitrary values with `bg-terracotta-light`, `hover:bg-terracotta-dark`, `text-terracotta`, etc. **Preserved:** hex values unchanged — only tokenization.
- **Effort:** S

### [MED] Spacing scale violations — fractional / off-grid values in inline styles
- **File:** `src/components/LiteraWidget.tsx` — multiple lines
- **Rule:** §11.b (Spacing scale — 8px base, multiples only: 4, 8, 16, 24, 32, 40, 48)
- **Current:** Inline styles use `padding: '28px 24px'` (28px ❌), `padding: '14px 24px'` (14px ❌), `padding: '10px 20px'` (10px ❌), `gap: '8px'` (OK), `marginTop: '8px'` (OK), `marginBottom: '20px'` (20px ❌), `borderRadius: '24px'` (24px OK), `borderRadius: '16px'` (16px OK), `borderRadius: '14px'` (14px ❌), `margin: '24px 0'` (24px OK).
- **Recommended:** Round all spacing to 8px grid: `28px → 24px` or `32px`, `14px → 16px`, `10px → 8px`, `20px → 16px` or `24px`, `14px radius → 16px`. Use Tailwind spacing scale (`p-6`, `px-6 py-4`, `gap-2`, `mt-2`, `rounded-2xl`, `rounded-xl`) instead of inline styles where possible.
- **Effort:** XS

### [MED] Dark mode parity incomplete — two different implementations
- **File:** `src/components/LiteraWidget.tsx:39-98` (CSS custom properties + `@media (prefers-color-scheme: dark)`), `src/App.tsx` (Tailwind `dark:` variants), `tailwind.config.js:11` (`darkMode: "media"`)
- **Rule:** §11.d (Dark mode parity)
- **Current:** Widget uses injected `<style>` with CSS custom properties for both light/dark. `App.tsx` uses Tailwind `dark:bg-slate-900` etc. but **widget does not respect Tailwind dark mode** — it uses its own media query. Result: if host page forces `class="dark"`, widget stays on system preference.
- **Recommended:** Unify on Tailwind `dark:` variants. Move widget theme tokens to Tailwind config (see token finding). In `LiteraWidget`, replace inline `var(--lw-*)` with Tailwind classes (`bg-white/40 dark:bg-slate-900/95`, etc.) or at minimum add `dark:` support to injected CSS via `[data-theme="dark"]` hook.
- **Effort:** M

### [MED] Transition durations not standardized
- **File:** `src/components/LiteraWidget.tsx` (20+ occurrences of `transition: 'all 0.2s ease'`), `src/App.tsx:84` (`duration-300`), `src/App.tsx:100` (`duration-500`)
- **Rule:** §11.c (Motion consistency)
- **Current:** Widget uses uniform `0.2s` inline — consistent internally but not connected to design system. App uses `duration-300`, `duration-500` mix. No token defines "fast" vs "normal" vs "slow".
- **Recommended:** Define in `tailwind.config.js`:
  ```js
  transitionDuration: { fast: '150ms', normal: '200ms', slow: '300ms' }
  ```
  Use `duration-fast` for micro-interactions (hover, color), `duration-normal` for layout/state. Replace inline `0.2s` with `duration-normal`.
- **Effort:** XS

### [MED] No component reusability — everything inline in LiteraWidget.tsx
- **File:** `src/components/LiteraWidget.tsx:113-211` (sub-components defined inline), `src/components/ErrorBoundary.tsx`
- **Rule:** §11.e (Component reusability)
- **Current:** `PoweredByLitera`, `LiteraButton`, `WidgetShell`, `Badge` defined inside widget file. `ErrorBoundary` has its own hardcoded styles (`background: '#fff5f5'`, `color: '#c53030'`). No shared design-system folder. `App.tsx` duplicates button logic with `LiteraButton` via Tailwind.
- **Recommended:** Extract to `src/components/ui/`:
  - `Button.tsx` (variants: primary/secondary/outline, sizes, `focus-visible` ring)
  - `Card.tsx` (glassmorphism shell, ambient glows)
  - `Badge.tsx` (status colors via tokens)
  - `Spinner.tsx` (with `prefers-reduced-motion`)
  - `ErrorState.tsx`
  Replace all inline implementations.
- **Effort:** S

### [MED] RainbowKit/Web3Modal theme not aligned with brand accent
- **File:** `src/index.tsx:20-23`
- **Rule:** §11.a (Visual hierarchy — brand consistency)
- **Current:** `createWeb3Modal({ themeMode: 'light', themeVariables: { '--w3m-border-radius-master': '12px' } })` — no `accentColor` set. Defaults to wallet connector's brand color (often blue/purple), clashing with terracotta CTAs in widget.
- **Recommended:** Add `accentColor: '#d07954'` (terracotta) to `themeVariables`.
- **Effort:** XS

### [MED] Widget embed sizing / responsiveness not fluid
- **File:** `src/components/LiteraWidget.tsx:172-186` (`WidgetShell`), `1113-1200` (default state)
- **Rule:** §11.a (Visual hierarchy — responsive embed)
- **Current:** Fixed `padding: '28px 24px'`, `margin: '24px 0'`, `borderRadius: '24px'`, `width: '100%'` on inner content but no `max-width`, no container queries. In narrow WP embeds (< 320px), content overflows. Media `width: '120px'` fixed.
- **Recommended:** Use `max-width: 100%`, `box-sizing: border-box`. Make media responsive: `max-width: 100%; height: auto; aspect-ratio: 1/1`. Add `container-type: inline-size` for container queries if needed.
- **Effort:** S

### [LOW] Dead CRA boilerplate CSS — `App.css` unused
- **File:** `src/App.css:1-38`
- **Rule:** §11.g (Code hygiene)
- **Current:** `.App`, `.App-logo`, `.App-header`, `.App-link`, `@keyframes App-logo-spin` — Create React App defaults. `App.tsx` imports it but uses zero classes.
- **Recommended:** Delete `App.css` and the import in `App.tsx:2`.
- **Effort:** XS

### [LOW] ErrorBoundary uses hardcoded colors, no focus-visible on retry
- **File:** `src/components/ErrorBoundary.tsx:32-41`
- **Rule:** §11.a (Accessibility), §11.f (Design tokens)
- **Current:** Inline styles with `#fff5f5`, `#c53030`, `#fc8181`, `#feb2b2`. Retry button has no focus ring.
- **Recommended:** Use design tokens (once defined) or at minimum Tailwind `bg-red-50 text-red-700 border-red-200`. Add `focus-visible:ring-2 focus-visible:ring-terracotta`.
- **Effort:** XS

### [LOW] `index.css` minimal — no global CSS reset for reduced-motion, focus-visible
- **File:** `src/index.css:1-17`
- **Rule:** §11.c, §11.a
- **Current:** Only font smoothing. No `@media (prefers-reduced-motion)`, no `:focus-visible` global reset.
- **Recommended:** Add the reduced-motion rule (see HIGH finding) + global `:focus-visible { outline: none; ring: 2px solid var(--lw-focus); }` once tokens exist.
- **Effort:** XS

### [LOW] Framer Motion in dependencies but unused — bundle bloat
- **File:** `package.json:27`
- **Rule:** §11.g (Code hygiene / bundle size)
- **Current:** `"framer-motion": "^12.23.26"` listed, not imported anywhere.
- **Recommended:** Remove if not planned. If motion needed later, use CSS transitions (already consistent) or add Framer Motion with `prefers-reduced-motion` guard.
- **Effort:** XS

---

## Preserved (Not Violations — Project Exceptions)

| Pattern | Location | Reason |
|---------|----------|--------|
| Terracotta `#d07954` / hover `#b86644` | `LiteraWidget.tsx`, `App.tsx` | Brand color — preserved per AGENTS.md |
| Glassmorphism `backdrop-blur-xl` + `bg-white/20` | `LiteraWidget.tsx:178-180` | Design pattern — preserved |
| Legacy article routing `?gen=legacy` | `App.tsx:50-83`, `LiteraWidget.tsx:226` | Contract routing — preserved |
| CSS custom properties for theming | `LiteraWidget.tsx:39-98` | Works for embed isolation — preserved |

---

## Summary

| Category | Count |
|----------|-------|
| Total findings | 14 |
| HIGH impact | 3 |
| MED impact | 7 |
| LOW impact | 4 |
| XS effort | 9 |
| S effort | 3 |
| M effort | 2 (1 deferred) |
| L effort | 0 |

**Priority order for implementation:**
1. HIGH → focus-visible rings (XS), reduced-motion guard (XS)
2. MED → tokens (S), spacing audit (XS), dark mode parity (M), transitions (XS), component extraction (S), wallet theme (XS), responsive embed (S)
3. LOW → dead CSS (XS), ErrorBoundary (XS), index.css (XS), Framer Motion removal (XS)

All XS items can be batched into a single PR. Tokenization (S) should precede component extraction (S) for consistency.