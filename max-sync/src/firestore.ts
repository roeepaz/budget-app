import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './config.js';
import type { NormalizedTransaction } from './types.js';

function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }
  return getFirestore();
}

function transactionsCollection() {
  return getDb().collection('financial_data').doc(config.userId).collection('max_transactions');
}

/**
 * Given a batch of normalized transactions, returns only the ones that don't
 * already exist in Firestore (matching the spec's "Check Existing Records"
 * step). Firestore's `documentId() in [...]` query is capped at 30 ids per
 * call, so we chunk.
 */
export async function filterNewTransactions(
  transactions: NormalizedTransaction[]
): Promise<NormalizedTransaction[]> {
  if (transactions.length === 0) return [];

  const collection = transactionsCollection();
  const existingIds = new Set<string>();

  const chunkSize = 30;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    const ids = chunk.map((tx) => tx.id);

    const { FieldPath } = await import('firebase-admin/firestore');
    const snapshot = await collection.where(FieldPath.documentId(), 'in', ids).get();

    snapshot.forEach((doc) => existingIds.add(doc.id));
  }

  return transactions.filter((tx) => !existingIds.has(tx.id));
}

/**
 * Writes new transactions to Firestore in a batched write (Firestore caps
 * batches at 500 operations).
 */
export async function saveTransactions(transactions: NormalizedTransaction[]): Promise<void> {
  if (transactions.length === 0) return;

  const db = getDb();
  const collection = transactionsCollection();

  const chunkSize = 500;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    const batch = db.batch();

    for (const tx of chunk) {
      batch.set(collection.doc(tx.id), tx);
    }

    await batch.commit();
  }
}
