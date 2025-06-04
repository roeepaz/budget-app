import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Category, Debt, SavingsGoal, Expense } from '../type/appTypes';

interface UseUserDataReturn {
  categories: Category[];
  expenses: Expense[];
  debts: Debt[];
  goals: SavingsGoal[];
  loading: boolean;
  hasLoaded: boolean;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  setGoals: Dispatch<SetStateAction<SavingsGoal[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoaded: Dispatch<SetStateAction<boolean>>;
  addExpenseToDB: (expense: Expense) => Promise<void>;
  deleteExpenseFromDB: (expenseId: string) => Promise<void>;
  addCategoryToDB: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategoryField: (categoryId: string, updatedFields: Partial<Category>) => Promise<void>;
  userFatalError: Error | null | unknown;
}

export function useUserData(userId: string | null | undefined): UseUserDataReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [userFatalError, setUserFatalError] = useState<Error | null | unknown>(null);

  useEffect(() => {
    if (!userId) return;

    const load = async (): Promise<void> => {
      try {
        const categoryRef = collection(db, 'users', userId, 'categories');
        const categorySnap = await getDocs(categoryRef);
        const catList: Category[] = [];
        categorySnap.forEach(doc => catList.push({ id: doc.id, ...doc.data() } as Category));
        setCategories(catList);

        const expensesRef = collection(db, 'users', userId, 'expenses');
        const expensesSnap = await getDocs(expensesRef);
        const expenseList: Expense[] = [];
        expensesSnap.forEach(doc => {
          const data = doc.data() as Omit<Expense, 'id'>;
          expenseList.push({ id: doc.id, ...data });
        });
        setExpenses(expenseList);

        const finRef = doc(db, 'financial_data', userId);
        const finSnap = await getDoc(finRef);
        if (finSnap.exists()) {
          const data = finSnap.data();
          setDebts(data.debts || []);
          const loadedGoals: SavingsGoal[] = (data.goals || []).map((g: any) => ({
            ...g,
            targetDate: g.targetDate instanceof Timestamp ? g.targetDate.toDate() : new Date(g.targetDate)
          }));
          setGoals(loadedGoals);
        }
      } catch (error: any) {
        const firebaseCode = error?.code || 'unknown';
        if (firebaseCode === 'permission-denied') {
          setUserFatalError({
            title: 'אין לך הרשאה',
            description: 'הגישה למידע נדחתה. אנא התחבר מחדש.',
            severity: 'warning',
          });
        } else {
          setUserFatalError({
            title: 'שגיאה כללית',
            description: 'לא הצלחנו למשוך את המידע מהשרת. נסה שוב מאוחר יותר.',
            severity: 'error',
          });
        }
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const addExpenseToDB = async (expense: Expense): Promise<void> => {
    if (!userId) return;
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const finRef = doc(db, 'financial_data', userId);

    try {
      const newExpense = { ...expense };
      const addedDoc = await addDoc(expensesRef, newExpense);
      setExpenses(prev => [...prev, { ...newExpense, id: addedDoc.id }]);

      if (typeof expense.categoryId === 'string' && expense.categoryId.startsWith('debt-')) {
        const id = expense.categoryId.replace('debt-', '');
        const updatedDebts = debts.map(d => d.id === id ? { ...d, principal: d.principal - expense.amount } : d);
        setDebts(updatedDebts);
        await updateDoc(finRef, { debts: updatedDebts });
      }

      if (typeof expense.categoryId === 'string' && expense.categoryId.startsWith('goal-')) {
        const id = expense.categoryId.replace('goal-', '');
        const updatedGoals = goals.map(g => g.id === id ? { ...g, currentAmount: (g.currentAmount ?? 0) + expense.amount } : g);
        setGoals(updatedGoals);
        await updateDoc(finRef, { goals: updatedGoals });
      }

      const catIndex = categories.findIndex(c => String(c.id) === String(expense.categoryId));
      if (catIndex !== -1) {
        const cat = categories[catIndex];
        if (cat.tag === 'savings' || cat.tag === 'emergency') {
          const updatedCategories = [...categories];
          updatedCategories[catIndex] = {
            ...cat,
            currentAmount: (cat.currentAmount ?? 0) + expense.amount,
          };
          setCategories(updatedCategories);
          const categoryDocRef = doc(db, 'users', userId, 'categories', String(cat.id));
          await updateDoc(categoryDocRef, {
            currentAmount: (cat.currentAmount ?? 0) + expense.amount
          });
        }
      }
    } catch (error: any) {
      const firebaseCode = error?.code || 'unknown';
      setUserFatalError({
        title: 'שגיאה כללית',
        description: 'לא הצלחנו לשמור את המידע. נסה שוב מאוחר יותר.',
        severity: 'error',
      });
    }
  };

  const deleteExpenseFromDB = async (expenseId: string): Promise<void> => {
    if (!userId) return;
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(expenseRef);
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  const addCategoryToDB = async (category: Omit<Category, 'id'>): Promise<void> => {
    if (!userId) return;
    try {
      const categoryRef = collection(db, 'users', userId, 'categories');
      const docRef = await addDoc(categoryRef, category);
      const newCategory: Category = { id: docRef.id, ...category };
      setCategories(prev => [...prev, newCategory]);
    } catch (error: any) {
      setUserFatalError({
        title: 'שגיאה בשמירת קטגוריה',
        description: 'לא הצלחנו לשמור קטגוריה חדשה. נסה שוב.',
        severity: 'error',
      });
    }
  };

  const updateCategoryField = async (categoryId: string, updatedFields: Partial<Category>): Promise<void> => {
    if (!userId) return;
    try {
      const categoryDocRef = doc(db, 'users', userId, 'categories', categoryId);
      await updateDoc(categoryDocRef, updatedFields);
      setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, ...updatedFields } : cat));
    } catch (error) {
      console.error('שגיאה בעדכון קטגוריה:', error);
    }
  };

  return {
    categories,
    expenses,
    debts,
    goals,
    loading,
    hasLoaded,
    setCategories,
    setExpenses,
    setDebts,
    setGoals,
    setLoading,
    setHasLoaded,
    addExpenseToDB,
    deleteExpenseFromDB,
    addCategoryToDB,
    updateCategoryField,
    userFatalError
  };
}