import type { Page } from 'playwright';
import type { RawTransaction } from './types.js';

const TRANSACTIONS_URL = 'https://www.max.co.il/personalarea/transactions';

// The SPA proxies API calls through the same origin (www.max.co.il).
// Calling onlinelcapi.max.co.il directly from the page context triggers CORS / 403
// on "registered" endpoints.  Using www.max.co.il/api avoids that entirely.
const BASE_API_URL = 'https://www.max.co.il';

/**
 * Fetch JSON from within the page context.  By using the same origin as the
 * SPA we inherit cookies and avoid the cross-origin 403 that onlinelcapi
 * returns for /api/registered/ endpoints.
 */
async function fetchGetWithinPage<T>(
  page: Page,
  url: string,
  retries = 3,
  delayMs = 500,
): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await page.request.get(url);
      if (response.status() === 204) return null;
      if (!response.ok()) {
        const body = await response.text().catch(() => '');
        const headers = await response.headersArray();
        throw new Error(
          `fetchGetWithinPage failed for URL: ${url}. Error: ` +
          JSON.stringify({
            status: response.status(),
            headers,
            body: body.substring(0, 500),
          })
        );
      }
      return await response.json();
    } catch (err) {
      if (attempt < retries) {
        console.warn(
          `[scraper] fetch failed (attempt ${attempt}) for ${url.substring(0, 120)}. ` +
          `Retrying after ${delayMs}ms: ${err instanceof Error ? err.message : String(err)}`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
  return null;
}

// Generate the URL for getTransactionsAndGraphs — using the same-origin proxy
function getTransactionsUrl(dateStr: string): string {
  const url = new URL(`${BASE_API_URL}/api/registered/transactionDetails/getTransactionsAndGraphs`);
  url.searchParams.set(
    'filterData',
    `{"userIndex":-1,"cardIndex":-1,"monthView":true,"date":"${dateStr}","dates":{"startDate":"0","endDate":"0"},"bankAccount":{"bankAccountIndex":-1,"cards":null}}`,
  );
  url.searchParams.set('firstCallCardIndex', '-1');
  return url.toString();
}

// Get the date strings for the months to scrape (YYYY-MM-01)
function getMonthsToScrape(): string[] {
  const dates: string[] = [];
  const now = new Date();

  // Scrape: next month (+1), current month (0), and previous month (-1)
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
  // Navigate to the personal-area homepage first (we know this works from auth)
  // then navigate to transactions via the SPA router.
  console.log('[scraper] Navigating to personal area...');
  await page.goto('https://www.max.co.il/homepage/personal', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const personalUrl = page.url();
  console.log(`[scraper] Personal area URL: ${personalUrl}`);

  if (personalUrl.includes('/login')) {
    throw new Error(
      'Session expired — redirected to login. Delete .auth/storageState.json and re-run.',
    );
  }

  // If we are already on personal area or homepage, we can fetch transactions directly
  // from the same origin (www.max.co.il) without triggering SPA routing to /wrongurl.
  if (personalUrl.includes('/wrongurl')) {
    throw new Error(
      `Navigation failed — ended up at ${personalUrl}. The session may be invalid.`,
    );
  }

  // Load category mappings (this endpoint works on both origins)
  console.log('[scraper] Loading category mappings from MAX...');
  const categoriesMap = new Map<number, string>();
  try {
    const catRes = await fetchWithRetries<{ result?: Array<{ id: number; name: string }> }>(
      page,
      `${BASE_API_URL}/api/contents/getCategories`,
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
