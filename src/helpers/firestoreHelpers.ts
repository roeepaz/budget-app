import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  Firestore,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  Category,
  Expense,
  Debt,
  SavingsGoal,
  RecurringExpense
} from '../type/appTypes';

// Load documents from financial_data subcollections
export const getCollectionDocs = async <T>(
  userId: string,
  path: string
): Promise<(T & { docId: string })[]> => {
  const colRef = collection(db, 'financial_data', userId, path);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    docId: doc.id
  } as T & { docId: string }));
};

// Load documents from users/{userId}/{path}
export const getUserCollectionDocs = async <T>(
  userId: string,
  path: string
): Promise<(T & { docId: string })[]> => {
  const colRef = collection(db, 'users', userId, path);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    docId: doc.id
  } as T & { docId: string }));
};

// Add document to financial_data subcollection
export const addCollectionDoc = async <T extends DocumentData>(
  userId: string,
  path: string,
  data: T
): Promise<string> => {
  const colRef = collection(db, 'financial_data', userId, path);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
};

// Add document to users/{userId}/{path} subcollection
export const addUserCollectionDoc = async <T extends DocumentData>(
  userId: string,
  path: string,
  data: T
): Promise<string> => {
  const colRef = collection(db, 'users', userId, path);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
};

// Update document in financial_data
export const updateCollectionDoc = async <T>(
  userId: string,
  path: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, 'financial_data', userId, path, id);
  await updateDoc(docRef, data);
};

// Update document in users/{userId}/{path}
export const updateUserCollectionDoc = async <T>(
  userId: string,
  path: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, 'users', userId, path, id);
  await updateDoc(docRef, data);
};

// Delete document from financial_data
export const deleteCollectionDoc = async (
  userId: string,
  path: string,
  id: string
): Promise<void> => {
  const docRef = doc(db, 'financial_data', userId, path, id);
  await deleteDoc(docRef);
};

// Delete document from users/{userId}/{path}
export const deleteUserCollectionDoc = async (
  userId: string,
  path: string,
  id: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, path, id);
  await deleteDoc(docRef);
};

// Specific collection helpers
export const getExpenses = (userId: string) =>
  getCollectionDocs<Expense>(userId, 'expenses');
export const addExpense = (userId: string, data: Expense) =>
  addCollectionDoc<Expense>(userId, 'expenses', data);

export const getGoals = (userId: string) =>
  getCollectionDocs<SavingsGoal>(userId, 'goals');
export const addGoal = (userId: string, data: SavingsGoal) =>
  addCollectionDoc<SavingsGoal>(userId, 'goals', data);

export const getDebts = (userId: string) =>
  getCollectionDocs<Debt>(userId, 'debts');
export const addDebt = (userId: string, data: Debt) =>
  addCollectionDoc<Debt>(userId, 'debts', data);

export const getRecurring = (userId: string) =>
  getCollectionDocs<RecurringExpense>(userId, 'recurringExpenses');
export const addRecurring = (userId: string, data: RecurringExpense) =>
  addCollectionDoc<RecurringExpense>(userId, 'recurringExpenses', data);

export const getCategories = (userId: string) =>
  getUserCollectionDocs<Category>(userId, 'categories');
export const addCategory = (userId: string, data: Category) =>
  addUserCollectionDoc<Category>(userId, 'categories', data);
