# MAX Credit Card Auto Sync

Automated sync of MAX credit card transactions into Firestore, based on the
provided technical specification. Runs headless via Playwright, triggered on
a schedule by GitHub Actions.

## Status of this implementation

| Piece | Status |
|---|---|
| Project scaffold, config, types | ✅ Done |
| Session persistence (`storageState.json`) | ✅ Done |
| Login flow | ⚠️ Skeleton — selectors are placeholders |
| Transaction scraping | ⚠️ Skeleton — selectors are placeholders |
| Normalization | ✅ Done |
| Duplicate detection (id → SHA-256 fallback) | ✅ Done |
| Firestore read/write | ✅ Done |
| GitHub Actions workflow | ✅ Done (see caveat below) |

The two ⚠️ pieces (`src/auth.ts`, `src/scraper.ts`) **cannot be finished
without inspecting the real MAX website**, since I don't have access to its
actual HTML/DOM or its network API. Everything else is fully implemented and
ready to use.

## Filling in the real selectors

1. Install dependencies and Playwright browsers:
   ```bash
   npm install
   npx playwright install chromium
   ```
2. Run the interactive recorder against the real login page:
   ```bash
   npm run codegen
   ```
   Log in manually while it records. Codegen will print the actual
   selectors Playwright sees — copy the relevant ones into
   `src/auth.ts` (`login`, `isLoggedIn`) replacing the `TODO` placeholders.
3. Do the same for the transactions page to fill in `src/scraper.ts`. Check
   the Network tab in your browser's devtools first — many banking sites
   load transactions via an internal JSON API, which is far more reliable
   to read directly than scraping table rows (see the comment in
   `fetchTransactions` for both approaches).
4. **Check for 2FA/OTP.** If MAX requires an SMS code on every login (common
   for Israeli banks), a fully unattended nightly script can't complete
   login on its own unless MAX's session cookies last long enough that
   `storageState.json` keeps you logged in across runs without re-triggering
   OTP. Verify this in practice — it may be the single biggest blocker to
   "fully automatic" sync as specced.

## Local setup

```bash
cp .env.example .env
# fill in .env with real values
npm install
npm run dev
```

## Firebase service account

`FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` come from a service
account JSON key (Firebase Console → Project Settings → Service Accounts →
Generate new private key). Never commit this file. When pasting the private
key into GitHub Secrets, keep it as one string — the code already handles
`\n` escaping.

## GitHub Actions setup

1. Add these repository secrets (Settings → Secrets and variables →
   Actions): `MAX_USERNAME`, `MAX_PASSWORD`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `USER_ID`.
2. The workflow runs nightly at 02:00 UTC and can also be triggered manually
   from the Actions tab.

### Caveat: session cache

The workflow uses `actions/cache` to persist `storageState.json` between
runs so it doesn't have to fully re-login every night. **GitHub Actions
cache keys are immutable** — once a cache is saved under a key, saving again
under the same key is a no-op, so the session won't actually update run to
run as written. Two ways to fix this once you're ready:
- Use a rolling key (e.g. include the run number) plus `restore-keys` to
  fall back to the most recent one, and periodically prune old caches.
- Or skip caching entirely and just let the script do a fresh login every
  run — simpler, and fine if login doesn't require OTP.

## Project structure

```text
src/
  config.ts      Env var loading + validation
  types.ts       Shared TypeScript types
  auth.ts        Login + session persistence   (selectors are placeholders)
  scraper.ts     Transaction scraping           (selectors are placeholders)
  normalize.ts   Raw -> normalized transaction, dedup hash
  firestore.ts   Firestore read/write (Admin SDK)
  index.ts       Orchestrates the full sync flow
.github/workflows/sync.yml   Nightly scheduled run
```

## Security notes

- `.env` and `.auth/` (session state) are gitignored — never commit either.
- The Firestore write uses the Admin SDK with a service account, bypassing
  Firestore security rules entirely (intended, since this runs server-side
  in CI, not in the browser).
- Rotate `MAX_PASSWORD` immediately if it's ever exposed in logs, a public
  repo, or a misconfigured secret.
