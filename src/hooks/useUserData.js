// hooks/useUserData.js
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useUserData(userId) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load categories from Firestore
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('שגיאה בטעינה מה-DB:', err);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  // Function to add a single expense to Firestore
  const addExpenseToDB = async (expense) => {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        expenses: arrayUnion(expense)
      });
    } catch (err) {
      console.error('שגיאה בשמירת הוצאה חדשה:', err);
    }
  };

  return {
    categories,
    addExpenseToDB
  };
}