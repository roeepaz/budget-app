import { fetchTransactions } from './scraper.js';
import { ensureAuthenticated } from './auth.js';
import { normalizeTransactions } from './normalize.js';
import { filterNewTransactions, saveTransactions } from './firestore.js';

async function main() {
  const startedAt = Date.now();
  console.log(`[sync] Starting MAX -> Firestore sync at ${new Date().toISOString()}`);

  const { browser, page } = await ensureAuthenticated();

  try {
    console.log('[sync] Fetching transactions from MAX...');
    const rawTransactions = await fetchTransactions(page);
    console.log(`[sync] Scraped ${rawTransactions.length} transaction(s).`);

    const normalized = normalizeTransactions(rawTransactions);

    console.log('[sync] Checking for existing records in Firestore...');
    const newTransactions = await filterNewTransactions(normalized);
    console.log(`[sync] ${newTransactions.length} new transaction(s) to save (skipped ${normalized.length - newTransactions.length} duplicate(s)).`);

    await saveTransactions(newTransactions);
    console.log('[sync] Save complete.');

    const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[sync] Done in ${durationSec}s. Scraped=${rawTransactions.length} New=${newTransactions.length}`);
  } catch (err) {
    console.error('[sync] Sync failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
