import type { Page } from 'playwright';
import type { RawTransaction } from './types.js';

const TRANSACTIONS_URL = 'https://www.max.co.il/personalarea/transactions';
const BASE_API_ACTIONS_URL = 'https://onlinelcapi.max.co.il';

// Helper to fetch from within page context to automatically inherit cookies and authentication headers
async function fetchGetWithinPage<T>(page: Page, url: string): Promise<T | null> {
  return page.evaluate(async (innerUrl) => {
    try {
      const response = await fetch(innerUrl, { credentials: 'include' });
      if (response.status === 204) return null;
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      throw new Error(`fetchGetWithinPage failed for URL: ${innerUrl}. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, url);
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
  console.log('[scraper] Navigating to transactions page to establish session context...');
  await page.goto(TRANSACTIONS_URL, { waitUntil: 'domcontentloaded' });

  // Load category mappings
  console.log('[scraper] Loading category mappings from MAX...');
  const categoriesMap = new Map<number, string>();
  try {
    const catRes = await fetchGetWithinPage<{ result?: Array<{ id: number; name: string }> }>(
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
      const res = await fetchGetWithinPage<{ result?: { transactions?: any[] } }>(page, url);
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
