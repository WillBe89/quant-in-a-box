# Build Log

Running log of autonomous build cycles. Newest entries at the top.

## 2026-07-11 — 10 languages registered: zh, hi, es, fr, ar, bn, pt, ru, ur, th (direct request)

**Built:** All 10 previously-translated locale files (`src/renderer/src/i18n/locales/{zh,hi,es,fr,ar,bn,pt,ru,ur,th}.json`) are now wired into `i18n/index.ts` — imported, added to the i18next `resources` object, and registered in `SUPPORTED_LANGUAGES` with each language's native-script label (中文, हिन्दी, Español, Français, العربية, বাংলা, Português, Русский, اردو, ไทย) and correct `dir`. All 10 are now selectable in the Topbar language dropdown (which already mapped over `SUPPORTED_LANGUAGES`, so no dropdown changes were needed) alongside English.

**Translation quality pipeline (per language, applied before this cycle and re-checked here):** full translation of all 183 keys → structural key-parity check against `en.json` (every locale confirmed to have exactly the same 183 leaf keys, no missing/extra) → native-fluency spot-check/fix pass. Re-verified the parity step directly in this cycle with a script that deep-diffs every locale's key tree against `en.json`: all 10 came back with 0 missing / 0 extra keys. Also spot-checked all 3 interpolated strings (`dock.news.minutesAgo`, `dock.news.hoursAgo`, `academy.infoTooltip`) across every locale — the `{{count}}`/`{{title}}` placeholders survived translation intact in all 10, which is the part most likely to get mangled by a translation pass.

**RTL scope (important, read before assuming Arabic/Urdu are "done"):** `ar` and `ur` have correct **text** direction wired up — `dir: 'rtl'` in `SUPPORTED_LANGUAGES`, which drives `document.dir` via `AppStateContext`, so RTL script renders and flows correctly. What is explicitly **not** in scope this pass: the dashboard's **panel layout** (rail/workspace/dock positions, chart orientation) is not mirrored for RTL — it stays in its LTR arrangement even when an RTL language is active. This is a deliberate, known limitation, not an oversight; full RTL layout mirroring is a larger structural change (flipping flex/grid direction across Topbar/Rail/Workspace/Dock, checking every hardcoded left/right in chart tooling) that wasn't part of this task.

**Known limitation — these are AI-generated translations:** every one of the 10 locale files was produced by the translate → key-parity → fluency-spot-check pipeline above, not by a native speaker. They should be treated as a solid first pass, not final copy — a real native-speaker review is recommended before trusting them fully for production users, especially the financial terminology in the Academy lessons (Sharpe/Sortino/VaR/Greeks/etc. have real, sometimes non-obvious, established translations in each market's financial vocabulary that a fluency spot-check by a non-native pipeline can plausibly miss).

**Verified:** `npm run typecheck` clean (both `tsconfig.web.json` and `tsconfig.node.json` projects), `npm run test` 27/27 passing, `npm run build` clean (main/preload/renderer all built, renderer bundle 870.90 kB / 36.60 kB CSS). All three re-run after the `index.ts` edit to confirm the new imports resolve correctly — no malformed JSON or import path issues found in any of the 10 locale files.

## 2026-07-11 — Styling review: icons, tooltips, richer chart hover, news relevance, asset-class education (direct request, mid-loop)

**Built (four pieces, three commits):**
1. **Icon system + i18n tooltips** — new `Icons.tsx` (stroke-based SVG set) replaces every emoji/Unicode glyph app-wide. New `Tooltip` component wraps icon-only buttons with translated text, verified via real hover simulation (not synthetic events — see note below) and via ARIA labels.
2. **Chart hover enrichment** — the crosshair readout now shows date, volume, change vs. the previous bar, and active indicator values (MA20/MA50/Bollinger), via a cached indicator-array lookup keyed to the hovered bar's index. Also fixed mock candle volume, which was a raw 0-1 fraction (fine when only used for bar-height, wrong once displayed as a number) — rescaled to a realistic 200K-8M range.
3. **News relevance** — Market News can focus on whatever's selected, your watchlist, or your portfolio, chosen in Customize and persisted. Expanded the mock news pool 5→11 templates for real coverage differences between sources, with a fallback to the full feed when a filter matches nothing.
4. **Teaching Zone asset-class lessons** — 5 new lessons (Stocks & ETFs, Crypto, Bonds, FX & Commodities, Real Estate/REITs) in a new "Asset Classes" category, placed first in the Academy nav. Each has a genuinely relevant formula per class and watchOutFor guidance aimed directly at the panic-buy/panic-sell instinct.

**Testing note worth recording:** this session's screenshot tool was broken (`computer{action:"screenshot"}` timed out repeatedly), and synthetic `MouseEvent`/`PointerEvent` dispatch doesn't trigger either React's mouseenter/mouseleave (needs real `mouseover` with correct `relatedTarget`) or lightweight-charts' canvas interaction (the library's own event binding doesn't respond to script-dispatched events). Worked around this with: DOM/ARIA inspection instead of visual checks, `computer{action:"hover", ref:...}` (real OS-level mouse movement) for the one interaction that genuinely needed it, and relying on the actual Electron window being open for Will to verify anything requiring true visual/interactive confirmation.

**Verified:** typecheck/test(27/27)/build clean across all three commits. Extensive DOM/ARIA-level verification in the browser for each piece (documented per-commit); CI green on all pushes.

## 2026-07-11 — Ticker customization + sidebar redesign (direct request, mid-loop)

**Built:**
- Ticker tape settings gear: choose watchlist/portfolio/all as its source, persisted, with a proper empty-state message when the source has nothing.
- Sidebar: removed the 6 duplicate asset-class buttons (topbar chips already do this — Will correctly flagged it as a pointless double-up). New "Make it yours" entry opens a Customize panel with real watchlist management: add via search, remove, reset to defaults.

**Real bug caught during testing:** the ticker's source popover originally closed via `onMouseLeave`. Testing revealed this is fragile — a user's mouse moving from the gear button toward a menu item can exit the combined bounding box mid-path (there's a gap between the button and the popover, which sits `bottom: 40px` above it) and close the menu before they can click anything. Replaced with the standard click-outside-to-close pattern (document `mousedown` listener + refs). Also learned during testing that synthetic same-tick `.click()` + immediate DOM query in test scripts doesn't reliably reflect React's state flush — real interactions (separate ticks) work correctly; this was a test-harness artifact, not an app bug, confirmed by re-checking in separate calls each time.

**Verified:** typecheck/test(27/27)/build clean. Full interactive flow confirmed in the browser: ticker source switching with correct empty states, watchlist add (via autocomplete)/remove/reset all working.

## 2026-07-11 — Real logo wired up (direct request, mid-loop)

**Built:** Will dropped three logo assets into `assets/` (logo-full.png — combined lockup, transparent bg; logo-just.png — icon-only mark, black bg; logo-title.png — wordmark only, black bg) and asked for them to be used throughout the app as sensible, with logo-just as the app icon.
- Topbar brand mark now shows the real icon (candlestick breakout from a wireframe box) instead of the placeholder checkmark SVG.
- logo-just.png is now the actual packaged app icon (Windows/Mac/Linux via electron-builder) *and* shows correctly in the dev-mode taskbar (not just packaged builds) — required adding a `resources/` folder packaged alongside `out/` and pointing both electron-builder's icon config and the BrowserWindow's `icon` option at it.

**Scope call:** didn't force logo-full.png or logo-title.png into the UI — neither has a natural fit in the current dense dashboard without redesigning something (both also have baked-in black backgrounds or an image aspect that doesn't suit the slim topbar), so they're kept as source assets for later (e.g. a splash/about screen) rather than shoehorned in.

**Known limitation:** no ImageMagick/PIL/sharp available in this environment to pre-process the icon source. The 462×479 (non-square) source produced a working but single-resolution (256×256) `.ico` rather than a full multi-size set — looks correct at normal sizes, slightly soft at 16px taskbar size. A proper square 1024×1024 source would fix this.

**Verified:** typecheck/test(27/27)/build clean. Confirmed in the browser that the topbar image loads with correct dimensions and the rounded badge CSS applies. Ran a real `build:unpacked` packaging pass — the "default Electron icon is used" warning is gone, confirming a real `icon.ico` now generates from our source.

## 2026-07-11 — i18n foundation: every string extracted, English verified

**Built:** Installed `react-i18next` + `i18next`. Every hardcoded string in the app (topbar, rail, workspace toolbar, all three dock cards, the full Academy — including all 12 lessons' title/summary/formula/howToUse/watchOutFor text — and the Portfolio panel) now routes through `t()` against `src/renderer/src/i18n/locales/en.json`. `lessons.ts` was refactored to hold only metadata (id + category); display text lives entirely in the locale file so each language translates independently. Added a language switcher in the Topbar (persists like the theme toggle) and RTL-direction plumbing in `AppStateContext` (a `SUPPORTED_LANGUAGES` metadata list drives `document.dir`/`lang` attributes), ready for Arabic/Urdu.

**Why this order:** this was flagged as the highest-risk step in the plan — a refactor touching nearly every component with real potential to silently break something (a missed string, a broken prop, a t() key typo showing raw dot-paths on screen) — so it had to be verified thoroughly before spending effort on 10 rounds of translation on top of a possibly-shaky foundation.

**Verified:** typecheck/test (27/27)/build all clean. In the browser (via the same dev server now also open as a real Electron window for Will to test directly): confirmed the workspace, indicator chips, watchlist tooltips, and the Academy panel's full lesson content (spot-checked "Moving Average") all render byte-identical to before the refactor, sourced entirely from the new key structure. Confirmed the Portfolio panel's dialog and all its placeholders render correctly too. No console errors.

**Housekeeping note:** `logo-full.png` appeared in the project root (not created by me — presumably an early logo draft Will dropped in). Left untracked/uncommitted rather than silently swept into this commit; flagged for Will to confirm what to do with it.

**Next up:** translating into the 10 target languages, starting with the next loop cycle.

## 2026-07-10 — Portfolio tracker v1

**Built:** A real "Your holdings" panel (topbar/rail button, opens like the Teaching Zone) where you add positions by symbol + quantity + average cost basis. Adding to an existing symbol blends into a new weighted average cost rather than duplicating the row. Shows per-position current price, market value, unrealized P&L $/%, and % of portfolio weight, plus portfolio-wide totals. Persisted to `localStorage` (`qiab:portfolio:v1`), same pattern as the watchlist.

The bigger piece: **Portfolio Analytics** now computes real weighted stats (Sharpe, Sortino, volatility, VaR, max drawdown, beta) across your *actual* holdings, not just whatever symbol happens to be selected in the main chart — `lib/portfolioMath.ts` blends each holding's daily-return series by its market-value weight into one portfolio-level return series, then feeds that into the same `lib/quant.ts` functions the single-symbol Risk card already uses. New unit tests (`portfolioMath.test.ts`, 4 tests) cover the blending and compounding math.

**Scope decisions made without asking** (flagged here in case any should be revisited): single portfolio, not multiple; current positions only, no transaction/lot history — matches the most common "simple portfolio tracker" pattern and was explicit enough in what Will asked for ("track how it's going, apply the analytics to it") to build directly rather than re-asking.

**Verified:** typecheck/test (27/27)/build all clean. Functional check in the browser: added NVDA (10 @ $120) — P&L and weight (100%) computed correctly, and portfolio analytics with one holding matched that symbol's own standalone Risk-card stats exactly (a strong correctness cross-check). Added BTC (0.05 @ $58,000) — totals, weights (30.8%/69.2%), and analytics all updated correctly. Removed NVDA — analytics correctly collapsed back to BTC's own standalone stats. Reloaded the page and confirmed both the position list and the topbar's "Portfolio (n)" count persist.

**Bug caught and fixed:** opening the Teaching Zone from an info-icon *inside* the Portfolio panel opened Academy behind it (both modals shared `z-index: 100`, and Portfolio mounts later in the DOM so it won the tie). Fixed by giving Academy a higher `z-index` — it's a contextual reference lookup that should always stack above whatever invoked it.

## 2026-07-10 — GitHub repo + real cross-platform CI, with two real bugs caught and fixed

**Built:**
- Private repo created and pushed: [github.com/WillBe89/quant-in-a-box](https://github.com/WillBe89/quant-in-a-box).
- `.github/workflows/build.yml`: typecheck+test on every push/PR; on a `v*` tag, Windows/macOS/Linux runners each build their native installer and publish all three to a draft GitHub Release; manual runs (`workflow_dispatch`) build and upload as workflow artifacts instead, for testing without cutting a release.

**Bugs caught by actually running CI, not just reading the config:**
1. `npm ci` failed on a clean checkout with "Missing: esbuild@0.28.1 from lock file." Root cause: `vitest@4.1.10`'s `peerDependencies` require `vite ^6/^7/^8`, incompatible with this project's `vite@^5.4` (pinned for `electron-vite`). npm was silently auto-installing that peer as a private nested `vite`+`esbuild@0.28.1` inside `vitest/node_modules` — a resolution that varied run-to-run locally and produced a lockfile `npm ci` correctly rejected as inconsistent on a fresh Linux checkout. First attempted fix (approving the extra esbuild script) treated the symptom, not the cause, and CI failed again identically. Real fix: downgraded to `vitest@3.2.7`, which depends directly on `vite: "^5.0.0 || ^6.0.0 || ^7.0.0-0"` — no nested copy needed at all. Verified with a genuine from-scratch `npm ci` locally (not just `npm install`) before pushing again.
2. Electron-builder's `nsis` config rejected `allowToChangeInstallDirectory` — not a real property; correct name is `allowToChangeInstallationDirectory`. Caught immediately by electron-builder's own schema validation on the first packaging attempt.

**Verified:** manually triggered the full workflow (`workflow_dispatch`) after the fixes — typecheck/test job green, and all three packaging jobs (windows-latest, macos-latest, ubuntu-latest) succeeded, producing real installer artifacts (~75-110MB each, sane sizes for an Electron app). Confirms a `v*` tag push will actually produce a working `.exe`, `.dmg`, and `.AppImage` in one GitHub Release.

## 2026-07-10 — Loop stopped: needs Will's input on the portfolio tracker

Three cycles completed autonomously (watchlist persistence → quant.ts test suite → packaging config), each typechecked, tested, and built clean, with real bugs caught and fixed by the verification step each time (a test-fixture bug in cycle 2, a wrong electron-builder property name in cycle 3).

The only remaining item from the candidate list is the portfolio/holdings tracker, and it's a genuine product-scope question, not something with an obvious default:
- Single portfolio, or multiple named portfolios?
- Current positions only (symbol, quantity, cost basis), or full transaction/lot history (so realized vs. unrealized P&L can be split out)?
- Should the existing "Portfolio Risk" dock card (today: stats for whichever symbol is selected) become an actual *weighted portfolio* calculation once real holdings exist — meaning its meaning changes for every user, not just an addition?
- Cash balance / uninvested cash tracked at all?

Stopping here rather than guessing, per the loop's stop condition. Everything else scoped in this conversation is built, tested, and verified working.

## 2026-07-10 — Packaging config (electron-builder)

**Built:** A real `build` config in `package.json` for electron-builder — `appId`, `productName`, output directory (`release/`), Windows NSIS installer target (with a changeable install directory and desktop shortcut), macOS DMG target (Finance category), Linux AppImage target. Added a `build:unpacked` script (`electron-builder --dir`) for fast local packaging verification without generating a full installer every time.

**Why:** the app had no path to becoming an actual distributable `.exe`/`.dmg`/`.AppImage` yet — this was pure config/plumbing needed before anyone outside a dev environment could run it.

**Verified:** first attempt failed fast and loud — `npm run build:unpacked` caught a real error, `nsis.allowToChangeInstallDirectory` isn't a valid electron-builder property (correct name is `allowToChangeInstallationDirectory`); electron-builder's own schema validation pointed at the exact typo. Fixed the property name, re-ran, and it produced a real working executable at `release\win-unpacked\Quant In A Box.exe`. No custom app icon exists yet, so electron-builder falls back to the default Electron icon — that's a design-asset gap (someone needs to draw/commission an actual icon), not a code blocker, so it's left as a known follow-up rather than something to guess at.

## 2026-07-10 — Unit tests for the quant math library

**Built:** A real test suite (`vitest`) covering every function in `lib/quant.ts` — SMA, EMA, stdev, daily returns, annualized volatility, Sharpe, Sortino, max drawdown, historical VaR, beta, Bollinger Bands, RSI, MACD, and Black-Scholes pricing/Greeks. 23 tests, all passing. Added `npm run test` script and `vitest.config.ts` (mirrors the `@renderer` path alias from `electron.vite.config.ts`).

**Why:** the app's whole pitch is "real institutional-grade math," so the math library is the highest-stakes code in the codebase — it deserved verification beyond "it compiles and looks right on screen." Black-Scholes is checked against the classic textbook ATM example (S=K=100, T=1, r=5%, σ=20% → price ≈ 10.45, delta ≈ 0.637) and against put-call parity; Sharpe/Sortino/VaR/beta are checked against hand-computable edge cases (identical-to-market beta = 1, zero-volatility Sharpe = 0, worst-percentile VaR, etc.).

**Verified:** `npm run test` → 23/23 passing. Caught one real issue along the way — not in the library, but in my own first draft of a Sortino test, which picked two identical downside returns, so downside deviation was correctly 0 and Sortino correctly short-circuited to 0 by the divide-by-zero guard; fixed the test's fixture data rather than the function. `npm run typecheck` and `npm run build` both still clean. No UI changed this cycle, so no browser check was needed.

## 2026-07-10 — Watchlist persistence

**Built:** Real watchlist add/remove, persisted across restarts.
- `AppStateContext` now loads/saves the watchlist to `localStorage` (`qiab:watchlist:v1`), defaulting to one symbol per asset class (NVDA, BTC, US10Y, EURUSD, VNQ) on first run.
- The star button in the symbol header (`Workspace.tsx`) toggles the current symbol in/out of the watchlist (filled vs outline star).
- The rail's pinned-symbol list (`Rail.tsx`) now reflects the actual watchlist instead of always showing every mock symbol, with an empty-state hint when nothing is pinned.

**Why:** the star button existed visually in v1 but did nothing; the rail always showed every symbol regardless of what the user cared about, which isn't a real "watchlist."

**Verified:** `npm run typecheck` and `npm run build` both clean. Functional check via the browser preview: toggled a symbol off/on, confirmed `localStorage` contents update, reloaded the page and confirmed the watchlist survives reload. Caught and fixed nothing further needed — the only console errors seen were stale HMR churn from earlier edits, not a live bug (confirmed by re-checking DOM state and a fresh reload).
