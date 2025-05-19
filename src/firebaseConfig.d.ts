// src/firebaseConfig.d.ts
import type { Firestore } from 'firebase/firestore';

// by using "export declare" (or "export const"),  
// this file *is* considered a module, and TS will merge it  
// with your JS implementation at runtime.
export declare const db: Firestore;
