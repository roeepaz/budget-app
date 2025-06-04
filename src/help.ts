import { db } from './firebaseConfig';
import { doc, getDoc, Timestamp, collection, getDocs } from 'firebase/firestore';

import { Category, Expense } from './type/appTypes';

export async function getUserData(userId: string): Promise<{
  categories: Category[];
  expenses: Expense[];
}> {
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const expensesRef = collection(db, 'users', userId, 'expenses');

  const [catSnap, expSnap] = await Promise.all([
    getDocs(categoriesRef),
    getDocs(expensesRef)
  ]);

  const categories: Category[] = catSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Category[];

  const expenses: Expense[] = expSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Expense[];

  return { categories, expenses };
}
import { Debt, SavingsGoal } from './type/appTypes';
export async function getFinancialData(userId: string): Promise<{
  debts: Debt[];
  goals: SavingsGoal[];
}> {
  const finRef = doc(db, 'financial_data', userId);
  const finSnap = await getDoc(finRef);

  if (!finSnap.exists()) return { debts: [], goals: [] };

  const data = finSnap.data();
  const debts: Debt[] = data.debts || [];
  const goals: SavingsGoal[] = (data.goals || []).map((g: any) => ({
    ...g,
    targetDate: g.targetDate instanceof Timestamp
      ? g.targetDate.toDate()
      : new Date(g.targetDate)
  }));

  return { debts, goals };
}