import React, { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Category, Debt, SavingsGoal, Expense, RecurringExpense } from '../type/appTypes';

export interface UserFatalError {
  title?: string;
  description?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface UserDataContextType {
  categories: Category[];
  expenses: Expense[];
  debts: Debt[];
  goals: SavingsGoal[];
  recurringExpenses: RecurringExpense[];
  monthlyIncomeData: Record<string, number>;
  loading: boolean;
  hasLoaded: boolean;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  setGoals: Dispatch<SetStateAction<SavingsGoal[]>>;
  setRecurringExpenses: Dispatch<SetStateAction<RecurringExpense[]>>;
  setMonthlyIncomeData: Dispatch<SetStateAction<Record<string, number>>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoaded: Dispatch<SetStateAction<boolean>>;
  addExpenseToDB: (expense: Expense) => Promise<void>;
  deleteExpenseFromDB: (expenseId: string) => Promise<void>;
  addCategoryToDB: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategoryField: (categoryId: string, updatedFields: Partial<Category>) => Promise<void>;
  pendingTransactions: any[];
  setPendingTransactions: Dispatch<SetStateAction<any[]>>;
  approveSyncedTransaction: (transactionId: string, categoryId: string | number) => Promise<void>;
  ignoreSyncedTransaction: (transactionId: string) => Promise<void>;
  userFatalError: UserFatalError | null;
}

export const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider = ({ userId, children }: { userId: string | null | undefined, children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<Record<string, number>>({});
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [userFatalError, setUserFatalError] = useState<UserFatalError | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadData = async (): Promise<void> => {
      setLoading(true);
      try {
        // 1. Categories
        const categoryRef = collection(db, 'users', userId, 'categories');
        const categorySnap = await getDocs(categoryRef);
        const catList: Category[] = [];
        categorySnap.forEach(docSnap => {
            const data = docSnap.data();
            catList.push({
                id: docSnap.id,
                name: data.name,
                color: data.color,
                icon: data.icon,
                tag: data.tag,
                budget: data.budget ?? 0,
                hidden: data.hidden ?? false,
                currentAmount: ['savings', 'emergency'].includes(data.tag) ? data.currentAmount ?? 0 : data.currentAmount
            } as Category);
        });
        setCategories(catList);

        // 2. Expenses
        const expensesRef = collection(db, 'users', userId, 'expenses');
        const expensesSnap = await getDocs(expensesRef);
        const expenseList: Expense[] = [];
        expensesSnap.forEach(docSnap => {
          const data = docSnap.data() as Omit<Expense, 'id'>;
          expenseList.push({ id: docSnap.id, ...data });
        });
        setExpenses(expenseList);

        // 3. Debts and Goals
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

        // 4. Monthly Incomes
        const incomeRef = collection(db, 'financial_data', userId, 'monthly_income');
        const incomeSnap = await getDocs(incomeRef);
        const incomeMap: Record<string, number> = {};
        incomeSnap.forEach(docSnap => {
          const month = docSnap.id;
          const total = docSnap.data().total;
          if (typeof total === 'number') {
            incomeMap[month] = total;
          }
        });
        setMonthlyIncomeData(incomeMap);

        // 5. Recurring Expenses
        const recurringRef = collection(db, 'users', userId, 'recurringExpenses');
        const recurringSnap = await getDocs(recurringRef);
        const recurringList: RecurringExpense[] = recurringSnap.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<RecurringExpense, 'id'>)
        }));
        setRecurringExpenses(recurringList);

        // 6. Sync Transactions (Pending classification)
        const maxTransactionsRef = collection(db, 'financial_data', userId, 'max_transactions');
        const maxTransactionsQuery = query(maxTransactionsRef, where('classificationStatus', '==', 'pending'));
        const maxTransactionsSnap = await getDocs(maxTransactionsQuery);
        const pendingList: any[] = [];
        maxTransactionsSnap.forEach(docSnap => {
          pendingList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPendingTransactions(pendingList);

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

    loadData();
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
    setExpenses(prev => prev.filter(e => String(e.id) !== String(expenseId)));
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
      setCategories(prev => prev.map(cat => String(cat.id) === String(categoryId) ? { ...cat, ...updatedFields } : cat));
    } catch (error: any) {
      setUserFatalError({
        title: 'שגיאה בשמירת קטגוריה',
        description: 'לא הצלחנו לעדכן את הקטגוריה. נסה שוב.',
        severity: 'error',
      });    
    }
  };

  const approveSyncedTransaction = async (transactionId: string, categoryId: string | number): Promise<void> => {
    if (!userId) return;
    try {
      const tx = pendingTransactions.find(t => t.id === transactionId);
      if (!tx) return;

      // 1. Add as expense
      await addExpenseToDB({
        id: Date.now().toString(),
        amount: tx.amount,
        description: tx.merchantName,
        categoryId: categoryId,
        date: tx.date,
      });

      // 2. Update status in firestore to 'approved'
      const txDocRef = doc(db, 'financial_data', userId, 'max_transactions', transactionId);
      await updateDoc(txDocRef, { classificationStatus: 'approved' });

      // 3. Remove from state
      setPendingTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error: any) {
      setUserFatalError({
        title: 'שגיאה באישור העסקה',
        description: 'לא הצלחנו לאשר את העסקה ולשמור אותה כהוצאה.',
        severity: 'error',
      });
    }
  };

  const ignoreSyncedTransaction = async (transactionId: string): Promise<void> => {
    if (!userId) return;
    try {
      // 1. Update status in firestore to 'ignored'
      const txDocRef = doc(db, 'financial_data', userId, 'max_transactions', transactionId);
      await updateDoc(txDocRef, { classificationStatus: 'ignored' });

      // 2. Remove from state
      setPendingTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error: any) {
      setUserFatalError({
        title: 'שגיאה בעדכון העסקה',
        description: 'לא הצלחנו לעדכן את העסקה לסטטוס התעלמות.',
        severity: 'error',
      });
    }
  };

  return (
    <UserDataContext.Provider value={{
      categories,
      expenses,
      debts,
      goals,
      recurringExpenses,
      monthlyIncomeData,
      loading,
      hasLoaded,
      setCategories,
      setExpenses,
      setDebts,
      setGoals,
      setRecurringExpenses,
      setMonthlyIncomeData,
      setLoading,
      setHasLoaded,
      addExpenseToDB,
      deleteExpenseFromDB,
      addCategoryToDB,
      updateCategoryField,
      pendingTransactions,
      setPendingTransactions,
      approveSyncedTransaction,
      ignoreSyncedTransaction,
      userFatalError
    }}>
      {children}
    </UserDataContext.Provider>
  );
};
