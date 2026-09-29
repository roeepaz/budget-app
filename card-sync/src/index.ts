import { createScraper, CompanyTypes } from 'israeli-bank-scrapers';
import { config } from './config.js';
import { normalizeTransactions } from './normalize.js';
import { filterNewTransactions, saveTransactions } from './firestore.js';
import type { RawTransaction } from './types.js';

function getCurrencyCode(currencyStr: string): string {
  if (currencyStr === '₪') return 'ILS';
  if (currencyStr === '$') return 'USD';
  if (currencyStr === '€') return 'EUR';
  return currencyStr || 'ILS';
}

async function syncProvider(provider: CompanyTypes, credentials: any, collectionName: string) {
  console.log(`[sync] Starting ${provider} -> Firestore sync at ${new Date().toISOString()}`);
  const startedAt = Date.now();

  const options = {
    companyId: provider,
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // last 60 days
    combineInstallments: false,
    showBrowser: !config.headless,
    verbose: true,
  };

  const scraper = createScraper(options);
  scraper.onProgress((companyId, payload) => {
    console.log(`[sync] progress: ${payload.type}`);
  });
  const scrapeResult = await scraper.scrape(credentials);

  if (!scrapeResult.success) {
    throw new Error(`[sync] Failed to scrape ${provider}: ${scrapeResult.errorType}`);
  }

  const rawTransactions: RawTransaction[] = [];
  
  if (scrapeResult.accounts) {
    for (const account of scrapeResult.accounts) {
      for (const tx of account.txns) {
        rawTransactions.push({
          siteTransactionId: tx.identifier?.toString(),
          merchantName: tx.description,
          amount: Math.abs(tx.chargedAmount || tx.originalAmount || 0),
          currency: getCurrencyCode(tx.originalCurrency),
          date: tx.date.split('T')[0],
          time: tx.date.includes('T') ? tx.date.split('T')[1].substring(0, 5) : undefined,
          cardLastFourDigits: account.accountNumber.slice(-4),
          category: undefined,
          status: tx.status === 'completed' ? 'settled' : 'pending',
        });
      }
    }
  }

  console.log(`[sync] ${provider} scraped ${rawTransactions.length} transaction(s).`);

  const normalized = normalizeTransactions(rawTransactions);

  console.log(`[sync] Checking for existing records in ${collectionName}...`);
  const newTransactions = await filterNewTransactions(normalized, collectionName);
  console.log(`[sync] ${newTransactions.length} new transaction(s) to save (skipped ${normalized.length - newTransactions.length} duplicate(s)).`);

  await saveTransactions(newTransactions, collectionName);
  console.log(`[sync] Save complete for ${provider}.`);

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[sync] Done ${provider} in ${durationSec}s. Scraped=${rawTransactions.length} New=${newTransactions.length}`);
}

async function main() {
  let hasError = false;

  try {
    if (config.max.username && config.max.password) {
      await syncProvider(CompanyTypes.max, { username: config.max.username, password: config.max.password }, 'max_transactions');
    } else {
      console.log('[sync] Skipping max sync (missing credentials)');
    }
  } catch (err) {
    console.error('[sync] max sync failed:', err);
    hasError = true;
  }

  try {
    if (config.isracard.id && config.isracard.password && config.isracard.card6Digits) {
      await syncProvider(CompanyTypes.isracard, {
        id: config.isracard.id,
        card6Digits: config.isracard.card6Digits,
        password: config.isracard.password
      }, 'isracard_transactions');
    } else {
      console.log('[sync] Skipping isracard sync (missing credentials)');
    }
  } catch (err) {
    console.error('[sync] isracard sync failed:', err);
    hasError = true;
  }

  if (hasError) {
    process.exitCode = 1;
  }
}

main();
