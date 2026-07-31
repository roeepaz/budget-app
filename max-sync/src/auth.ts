import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import { config } from './config.js';

const LOGIN_URL = 'https://www.max.co.il/login';

/**
 * Opens a browser context, restoring a previous session if we have one saved.
 * Returns the context + page + a flag telling the caller whether the restored
 * session actually turned out to be valid (still logged in).
 */
export async function openSession(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
  restoredValidSession: boolean;
}> {
  const browser = await chromium.launch({ headless: config.headless });

  const hasStoredState = existsSync(config.storageStatePath);
  const context = await browser.newContext(
    hasStoredState ? { storageState: config.storageStatePath } : {}
  );
  const page = await context.newPage();

  let restoredValidSession = false;

  if (hasStoredState) {
    restoredValidSession = await isLoggedIn(page);
  }

  return { browser, context, page, restoredValidSession };
}

/**
 * Checks whether the current page/session is authenticated by navigating to a
 * page that requires login and seeing if we get redirected back to /login.
 *
 * TODO: Replace the URL and selector below with the real "logged-in only"
 * page and a selector that only appears once authenticated (e.g. an account
 * summary widget, the user's name in the header, etc). Use `npm run codegen`
 * to explore the real site and find a reliable marker.
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('https://www.max.co.il/homepage/personal', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Give the Angular SPA a moment to finish client-side routing.
    // With 'domcontentloaded' the URL is still /homepage/personal before
    // Angular boots and potentially reroutes to / or /login on stale sessions.
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`[auth] Session check — URL after navigation: ${url}`);

    // If MAX bounced us back to the login page, the session is stale.
    if (url.includes('/login')) {
      return false;
    }

    // If we're still on the personal page or personal area, we're good.
    // If we ended up on / or /wrongurl, the session is invalid.
    return url.includes('/homepage/personal') || url.includes('/personalarea');
  } catch {
    return false;
  }
}

/**
 * Performs a full username/password login against the MAX website.
 */
export async function login(page: Page): Promise<void> {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

  // Switch to the Password Login tab
  const passwordTab = page.locator('#login-password-link');
  await passwordTab.waitFor({ state: 'visible', timeout: 15000 });
  await passwordTab.click();

  // Wait for the login form inputs to render
  await page.locator('#user-name').waitFor({ state: 'visible', timeout: 10000 });

  // Fill in credentials
  await page.locator('#user-name').fill(config.max.username);
  await page.locator('#password').fill(config.max.password);

  // Click the submit button
  await page.locator('app-user-login-form button.send-me-code').click();

  // Wait for redirection away from the login page, which signifies success, or wait for an error popup
  try {
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30000 });
  } catch (err) {
    const stillOnLogin = page.url().includes('/login');
    if (stillOnLogin) {
      // Check for common error elements
      const errorText = await page
        .locator('#popupWrongDetails, #popupCardHoldersLoginError, [data-testid="login-error"]')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `Login to MAX failed${errorText ? `: ${errorText.trim()}` : ' (unknown reason - possibly wrong credentials or OTP required)'}`
      );
    }
    throw err;
  }
}

export async function saveSession(context: BrowserContext): Promise<void> {
  const dir = dirname(config.storageStatePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  await context.storageState({ path: config.storageStatePath });
}

/**
 * High-level helper: restore session if possible, otherwise perform a fresh
 * login, then persist whatever session we end up with.
 */
export async function ensureAuthenticated(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const { browser, context, page, restoredValidSession } = await openSession();

  if (!restoredValidSession) {
    console.log('No valid session found — logging in fresh.');
    await login(page);
  } else {
    console.log('Restored existing session — skipping login.');
  }

  await saveSession(context);

  return { browser, context, page };
}
