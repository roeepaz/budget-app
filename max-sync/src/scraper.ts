import type { Page } from 'playwright';
import type { RawTransaction } from './types.js';

const TRANSACTIONS_URL = 'https://www.max.co.il/personalarea/transactions';
const BASE_API_ACTIONS_URL = 'https://onlinelcapi.max.co.il';

// Helper to fetch from within page context to automatically inherit cookies and authentication headers
async function fetchGetWithinPage<T>(page: Page, url: string): Promise<T | null> {
  return page.evaluate(async (innerUrl) => {
    try {
      const response = await fetch(innerUrl, { credentials: 'include' });
      const status = response.status;
      const text = await response.text();
      if (status === 204) return null;
      if (!response.ok) {
        // include response body and headers for debugging
        const headers = Array.from(response.headers.entries());
        throw new Error(JSON.stringify({ status, headers, body: text }));
      }
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(`fetchGetWithinPage failed for URL: ${innerUrl}. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, url);
}

// Wrapper with simple retry/backoff for transient 403/network errors
async function fetchWithRetries<T>(page: Page, url: string, retries = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetchGetWithinPage<T>(page, url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('"status":403') || msg.includes('status: 403') || msg.toLowerCase().includes('network');
      if (attempt === retries || !isTransient) {
        // rethrow the original error when out of retries or error is not deemed transient
        throw err;
      }
      const waitMs = 500 * attempt;
      console.warn(`[scraper] fetch failed (attempt ${attempt}) for ${url}. Retrying after ${waitMs}ms:`, msg);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
  }
  return null;
}

// Generate the URL for getTransactionsAndGraphs internal API
function getTransactionsUrl(dateStr: string): string {
  const url = new URL(`${BASE_API_ACTIONS_URL}/api/registered/transactionDetails/getTransactionsAndGraphs`);
  url.searchParams.set(
    'filterData',
    `{"userIndex":-1,"cardIndex":-1,"monthView":true,"date":"${dateStr}","dates":{"startDate":"0","endDate":"0"},"bankAccount":{"bankAccountIndex":-1,"cards":null}}`
  );
  url.searchParams.set('firstCallCardIndex', '-1');
  return url.toString();
}

// Get the date strings for the current month and last month (YYYY-MM-01)
function getMonthsToScrape(): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  // Keep future month scraping as before, but if future-month causes issues the retry/diagnostics will reveal it.
  const offsets = [1, 0, -1];
  for (const offset of offsets) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    dates.push(`${year}-${month}-01`);
  }
  return dates;
}

export async function fetchTransactions(page: Page): Promise<RawTransaction[]> {
  console.log('[scraper] Navigating to transactions page to establish session context...');
  // wait until networkidle so client-side bootstrapping has a better chance of completing
  await page.goto(TRANSACTIONS_URL, { waitUntil: 'networkidle' });

  // optional: wait for a selector that indicates the app finished initialization
  await page.waitForSelector('.transactions-list, .transaction-row, #app-root', { timeout: 10000 }).catch(() => {
    console.warn('[scraper] transactions selector not found after navigation; continuing anyway.');
  });

  // log cookies for debugging session/auth
  try {
    const cookies = await page.context().cookies();
    console.log('[scraper] cookies:', cookies);
  } catch (e) {
    console.warn('[scraper] could not read cookies for debugging', e);
  }

  // listen for responses for the transactions endpoint so we can capture server replies from the browser context
  page.on('response', async (response) => {
    try {
      if (response.url().includes('/getTransactionsAndGraphs') || response.url().includes('/api/registered/transactionDetails')) {
        const status = response.status();
        // attempt to read text; catch if body is binary or unavailable
        const body = await response.text().catch(() => '<binary or no body>');
        console.log(`[scraper] network response for ${response.url()} status=${status} body=${body}`);
      }
    } catch (e) {
      // swallow logging errors
    }
  });

  // Load category mappings
  console.log('[scraper] Loading category mappings from MAX...');
  const categoriesMap = new Map<number, string>();
  try {
    const catRes = await fetchWithRetries<{ result?: Array<{ id: number; name: string }> }>(
      page,
      `${BASE_API_ACTIONS_URL}/api/contents/getCategories`
    );
    if (catRes?.result && Array.isArray(catRes.result)) {
      catRes.result.forEach((item) => {
        categoriesMap.set(item.id, item.name);
      });
      console.log(`[scraper] Loaded ${categoriesMap.size} category names.`);
    }
  } catch (err) {
    console.warn('[scraper] Could not load category names, proceeding without category mapping.', err);
  }

  const months = getMonthsToScrape();
  console.log(`[scraper] Fetching transactions for months: ${months.join(', ')}`);

  const rawTransactions: RawTransaction[] = [];

  for (const monthStr of months) {
    const url = getTransactionsUrl(monthStr);
    try {
      const res = await fetchWithRetries<{ result?: { transactions?: any[] } }>(page, url);
      const transactions = res?.result?.transactions;

      if (!transactions || !Array.isArray(transactions)) {
        console.warn(`[scraper] No transactions found for ${monthStr}`);
        continue;
      }

      console.log(`[scraper] Found ${transactions.length} transactions for ${monthStr}.`);

      for (const tx of transactions) {
        // Filter out summary/header rows without a plan name
        if (!tx.planName) continue;

        const isPending = tx.paymentDate === null;
        
        // Normalize purchaseDate to YYYY-MM-DD
        let date = tx.purchaseDate;
        if (date && date.includes('T')) {
          date = date.split('T')[0];
        }

        // Get time if available (some transactions contain purchase time)
        let time: string | undefined;
        if (tx.purchaseDate && tx.purchaseDate.includes('T')) {
          const timePart = tx.purchaseDate.split('T')[1];
          if (timePart && timePart.length >= 5) {
            time = timePart.substring(0, 5); // HH:mm
          }
        }

        const siteTransactionId = tx.dealData?.arn || undefined;
        
        rawTransactions.push({
          siteTransactionId,
          merchantName: tx.merchantName || '',
          amount: tx.actualPaymentAmount || tx.originalAmount || 0,
          currency: getCurrencyCode(tx.paymentCurrency) || tx.originalCurrency || 'ILS',
          date: date || '',
          time,
          cardLastFourDigits: tx.shortCardNumber || undefined,
          category: categoriesMap.get(tx.categoryId) || undefined,
          status: isPending ? 'pending' : 'settled',
        });
      }
    } catch (err) {
      console.error(`[scraper] Failed to fetch transactions for ${monthStr}:`, err);
    }
  }

  return rawTransactions;
}

function getCurrencyCode(currencyId: number | null): string | undefined {
  switch (currencyId) {
    case 376: return 'ILS';
    case 840: return 'USD';
    case 978: return 'EUR';
    default: return undefined;
  }
}
