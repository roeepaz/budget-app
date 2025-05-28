import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SavingsPage from './pages/SavingsPage';
import ExpenseTracker from './pages/ExpenseTracker';
import HomePage from './pages/HomePage';
import Login from './Login';
import { auth } from './firebase'; 
import BudgetPlanner from './pages/BudgetPlanner'
import BudgetAdvisorPage from './pages/BudgetAdvisorPage'
import CategoryManager from './pages/CategoryManager'
import SmartBudgetLanding from './components/SmartBudgetLanding'
import MonthlyBudgetUpdate from './components/MonthlyBudgetUpdate'
import PrivacyPolicy from './policy/PrivacyPolicy';
import TermsOfService from './policy/TermsOfService';
import FeedbackPage from './pages/FeedbackPage';
import { onAuthStateChanged } from 'firebase/auth';
import { ToastContainer } from 'react-toastify';
const container = document.getElementById('root');
if (!container) throw new Error('Could not find root element');
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

  if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">🚀 בודק מי אתה</p>
          </div>
        </div>
      );
    }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/budget" element={<SavingsPage user={user} />} />
          <Route path="/expense" element={<ExpenseTracker user={user} />} />
          <Route path="/budgetPlanner" element={<BudgetPlanner  user={user}/>} />
          <Route path="/advisor" element={<BudgetAdvisorPage user={user}/>} />
          <Route path="/categoryManager" element={<CategoryManager user={user}/>} />
          <Route path="/landing" element={<SmartBudgetLanding />} />
          <Route path="/monthlyIncome" element={<MonthlyBudgetUpdate />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-center" />
  </>
  );
}

root.render(<App />);
