import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BudgetApp from './pages/BudgetApp';
import ExpenseTracker from './pages/ExpenseTracker';
import HomePage from './pages/HomePage';
import Login from './Login';
import { auth } from './firebase'; 
import BudgetPlanner from './pages/BudgetPlanner'
import BudgetAdvisorPage from './pages/BudgetAdvisorPage'
import { onAuthStateChanged } from 'firebase/auth';

const container = document.getElementById('root');
const root = createRoot(container);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // בינתיים טוען

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe(); // ניקוי מאזין כשמרנדרים מחדש
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Login onLogin={setUser} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/budget" element={<BudgetApp user={user} />} />
        <Route path="/expense" element={<ExpenseTracker user={user} />} />
        <Route path="/budgetPlanner" element={<BudgetPlanner  user={user}/>} />
        <Route path="/advisor" element={<BudgetAdvisorPage user={user}/>} />

      </Routes>
    </BrowserRouter>
  );
}

root.render(<App />);
