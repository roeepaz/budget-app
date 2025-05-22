// hooks/useUserData.js
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Timestamp } from 'firebase/firestore';
import { Debt, SavingsGoal, Expense } from '../hooks/useBudgetModel';

export function useUserData(userId) {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // טוען גם קטגוריות, הוצאות, חובות ומטרות
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        // טען categories + expenses מ־users/{uid}
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setCategories(data.categories || []);
          setExpenses(data.expenses || []);
        }

        // טען debts + goals מ־financial_data/{uid}
        const finRef = doc(db, 'financial_data', userId);
        const finSnap = await getDoc(finRef);
        if (finSnap.exists()) {
          const data = finSnap.data();
          setDebts(data.debts || []);
          const loadedGoals = (data.goals || []).map((g) => ({
            ...g,
            // המרה מתאריך Firestore ל־JS Date
            targetDate: g.targetDate instanceof Timestamp
              ? g.targetDate.toDate()
              : new Date(g.targetDate)
          }));
          setGoals(loadedGoals);
        }
      } catch (err) {
        console.error('שגיאה בטעינה מה־DB:', err);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const addExpenseToDB = async (expense) => {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  const finRef  = doc(db, 'financial_data', userId);

  try {
    // 1. שמירת ההוצאה ב־Firestore וב־state
    await updateDoc(userRef, {
      expenses: arrayUnion(expense)
    });
    setExpenses(prev => [...prev, expense]);

    // 2. אם זו קטגוריית חוב → הורדת הקרן
    if (typeof expense.categoryId === 'string' && expense.categoryId.startsWith('debt-')) {
      const id = expense.categoryId.replace('debt-', '');
      const updatedDebts = debts.map(d =>
        d.id === id ? { ...d, principal: d.principal - expense.amount } : d
      );
      setDebts(updatedDebts);
      await updateDoc(finRef, { debts: updatedDebts });
    }

    // 3. אם זו מטרה → הגדלת currentAmount
    if (typeof expense.categoryId === 'string' && expense.categoryId.startsWith('goal-')) {
      const id = expense.categoryId.replace('goal-', '');
      const updatedGoals = goals.map(g =>
        g.id === id ? { ...g, currentAmount: (g.currentAmount ?? 0) + expense.amount } : g
      );
      setGoals(updatedGoals);
      await updateDoc(finRef, { goals: updatedGoals });
    }

    // 4. אם זו קטגוריה מסוג savings/emergency → עדכון currentAmount
    const catIndex = categories.findIndex(c => String(c.id) === String(expense.categoryId));
    if (catIndex !== -1) {
      const cat = categories[catIndex];
      if (cat.tag === 'savings' || cat.tag === 'emergency') {
        const updatedCategories = [...categories];
        updatedCategories[catIndex] = {
          ...cat,
          currentAmount: (cat.currentAmount ?? 0) + expense.amount
        };
        setCategories(updatedCategories);
        await updateDoc(userRef, { categories: updatedCategories });
      }
    }

  } catch (err) {
    console.error('שגיאה בעת שמירת הוצאה או עדכון קטגוריות:', err);
  }
};



  return {
    categories,
    expenses,
    debts,
    goals,
    loading,
    hasLoaded,
    addExpenseToDB
  };
}
