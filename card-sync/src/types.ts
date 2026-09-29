export interface RawTransaction {
  /** Whatever unique id (if any) MAX exposes for the transaction row. */
  siteTransactionId?: string;
  merchantName: string;
  amount: number;
  currency: string;
  date: string; // ISO date string, e.g. 2026-07-10
  time?: string; // HH:mm if available
  cardLastFourDigits?: string;
  category?: string;
  status?: 'pending' | 'settled';
}

export interface NormalizedTransaction {
  id: string; // deterministic id used as the Firestore document id
  siteTransactionId: string | null;
  merchantName: string;
  amount: number;
  currency: string;
  date: string;
  time: string | null;
  cardLastFourDigits: string | null;
  category: string | null;
  status: 'pending' | 'settled';
  hash: string;
  syncedAt: string; // ISO timestamp of when this doc was written
  classificationStatus: 'pending' | 'approved' | 'ignored';
}
