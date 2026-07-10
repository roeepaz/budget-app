import { createHash } from 'node:crypto';
import type { NormalizedTransaction, RawTransaction } from './types.js';

/**
 * Builds the SHA-256 fallback hash used for duplicate detection when the
 * site doesn't give us a stable transaction id.
 *
 * Deliberately excludes anything that could vary between scrapes of the same
 * real-world transaction (e.g. pending vs. settled status).
 */
export function buildDedupeHash(tx: RawTransaction): string {
  const basis = [
    tx.merchantName.trim().toLowerCase(),
    tx.amount.toFixed(2),
    tx.date,
    tx.time ?? '',
  ].join('|');

  return createHash('sha256').update(basis).digest('hex');
}

/**
 * Decides the Firestore document id for a transaction.
 * Priority: real site transaction id > content hash.
 * This mirrors the "Duplicate Detection" priority in the spec.
 */
export function buildDocumentId(tx: RawTransaction, hash: string): string {
  return tx.siteTransactionId ?? hash;
}

export function normalizeTransaction(tx: RawTransaction): NormalizedTransaction {
  const hash = buildDedupeHash(tx);
  const id = buildDocumentId(tx, hash);

  return {
    id,
    siteTransactionId: tx.siteTransactionId ?? null,
    merchantName: tx.merchantName.trim(),
    amount: tx.amount,
    currency: tx.currency,
    date: tx.date,
    time: tx.time ?? null,
    cardLastFourDigits: tx.cardLastFourDigits ?? null,
    category: tx.category ?? null,
    status: tx.status ?? 'settled',
    hash,
    syncedAt: new Date().toISOString(),
    classificationStatus: 'pending',
  };
}

export function normalizeTransactions(raw: RawTransaction[]): NormalizedTransaction[] {
  return raw.map(normalizeTransaction);
}
