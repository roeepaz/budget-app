import { db } from '../firebaseConfig';
import { doc, getDoc, Timestamp, collection, getDocs } from 'firebase/firestore';

import { Category, Expense } from '../type/appTypes';

/**
 * טוען את כל הקטגוריות מה־subcollection של המשתמש
 */
export const loadCategoriesFromFirestore = async (userId: string): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const snapshot = await getDocs(categoriesRef);

    const categoryList: Category[] = [];
    snapshot.forEach(doc => {
      categoryList.push({
        id: doc.id,
        ...doc.data()
      } as Category);
    });

    return categoryList;
  } catch (error) {
    console.error('שגיאה בטעינת קטגוריות:', error);
    return [];
  }
};

/**
 * טוען את כל ההוצאות מה־subcollection של המשתמש
 */
export const loadExpensesFromFirestore = async (userId: string): Promise<Expense[]> => {
  try {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const snapshot = await getDocs(expensesRef);

    const expenseList: Expense[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as Omit<Expense, 'id'>;
      expenseList.push({ id: doc.id, ...data });
    });

    return expenseList;
  } catch (error) {
    console.error('שגיאה בטעינת הוצאות:', error);
    return [];
  }
};
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
import { Debt, SavingsGoal } from '../type/appTypes';
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
import { CollectionReference, setDoc } from 'firebase/firestore';

/**
 * שומר רשימת מסמכים לפי ID בתוך תת־קולקציה.
 * @param collectionRef הפנייה לתת־קולקציה (collection)
 * @param items רשימת אובייקטים המכילים שדה `id`
 */
export const setDocWithIdList = async <T extends { id: string }>(
  collectionRef: CollectionReference,
  items: T[]
): Promise<void> => {
  const promises = items.map(item =>
    setDoc(doc(collectionRef.firestore, collectionRef.path, item.id), item, { merge: true })
  );
  await Promise.all(promises);
};
