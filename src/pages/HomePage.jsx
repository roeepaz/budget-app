import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useUserData } from '../hooks/useUserData';

import Sidebar from '../components/Sidebar';
import { Dialog } from '@headlessui/react';
import FeedbackForm from '../components/FeedbackForm';
import { MessageSquare } from 'lucide-react';
import FullPageError from '../components/FullPageError';
import GaugeChart from 'react-gauge-chart';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import SmartFinancialTips from '../components/SmartFinancialTips'
import CategoryBudgetAlertsPanel from '../components/CategoryBudgetAlertsPanel'
import {
  DollarSign,
  Menu,
  X,
  Tag,
  PieChart as PieIcon,
  TrendingUp,
  Calculator,
  LogOut,
  AlertCircle,
  Target,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Calendar
} from 'lucide-react';

function QuickAddExpenseButton({ onAddExpense, categories, sidebarOpen }) {
  const getLocalDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  };

  // State for modal open
  const [isOpen, setIsOpen] = useState(false);
  // State for quick expense form
  const [quickExpense, setQuickExpense] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: getLocalDateString(),
  });

  // Simple drag state
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef(null);

  // Start dragging
  const handleMouseDown = (e) => {
    setDragging(true);
    setOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.stopPropagation();
  };

  // Move and stop listeners
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    };
    const handleMouseUp = () => setDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, offset]);

  const handleSubmit = () => {
    if (!quickExpense.amount || !quickExpense.categoryId) return;
    const cat = categories.find(c => String(c.id) === quickExpense.categoryId);
    if (!cat) return;

    onAddExpense({
      id: Date.now(),
      amount: parseFloat(quickExpense.amount),
      description: quickExpense.description,
      categoryId: cat.id,
      date: quickExpense.date,
    });

    setQuickExpense({
      amount: '',
      description: '',
      categoryId: '',
      date: getLocalDateString(),
    });
    setIsOpen(false);
  };

  return (
    <>
      {/* Draggable floating button */}
      <div
        ref={wrapperRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 50,
          cursor: dragging ? 'grabbing' : 'grab'
        }}
      >
        {!sidebarOpen && (
          <button
            onClick={() => setIsOpen(o => !o)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full shadow-lg text-white"
          >
            {isOpen ? <X size={20} /> : <Plus size={20} />}
            <span className="text-sm">הוצאה בקליק</span>
          </button>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-59 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="text-green-500" /> הוספת הוצאה בקליק
            </h2>

            {/* Amount */}
            <div>
              <label className="block text-sm mb-1">סכום (₪)</label>
              <input
                type="number"
                step="0.01"
                value={quickExpense.amount}
                onChange={e => setQuickExpense({ ...quickExpense, amount: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="0.00"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm mb-1 flex items-center gap-1">
                <Tag size={16} /> קטגוריה
              </label>
              <select
                value={quickExpense.categoryId}
                onChange={e => setQuickExpense({ ...quickExpense, categoryId: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm mb-1">תיאור (אופציונלי)</label>
              <input
                type="text"
                value={quickExpense.description}
                onChange={e => setQuickExpense({ ...quickExpense, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="מה קנית?"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm mb-1 flex items-center gap-1">
                <Calendar size={16} /> תאריך
              </label>
              <input
                type="date"
                value={quickExpense.date}
                onChange={e => setQuickExpense({ ...quickExpense, date: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 border rounded py-2"
              >ביטול</button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-600 text-white rounded py-2"
              >הוסף</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPutIncomes, setIsPutIncomes] = useState(true);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const {
    categories,
    expenses,
    debts,
    goals,
    loading,
    addExpenseToDB,
    userFatalError
  } = useUserData(user?.uid);

  const currentMonthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);


  useEffect(() => {
    if (!loading && categories.length === 0 && !userFatalError) {
      navigate('/landing');
    }
  }, [loading, categories, navigate]);


  useEffect(() => {
    if (!user || loading) return;

    const checkOnboarding = async () => {
      const ref = doc(db, 'income_update', user.uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};

      const step = data.onboardingStep || 'landing';
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      if (step === 'landing') {
        navigate('/landing');
      } else if (step === 'income') {
        navigate('/monthlyIncome', { state: { isNewUser: true } });
      } else if (data.lastIncomeMonth !== currentMonth) {
        setIsPutIncomes(false)
      }
    };

    checkOnboarding();
  }, [user, loading]);



  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate('/'))
      .catch((error) => {
        showErrorDialog('בעיה ביציאה', 'לא הצלחנו לבצע את תהליך היציאה. נסה שוב בעוד רגע.', 'error');
      });
  };

  const tags = ['need', 'want', 'debt', 'emergency', 'goal', 'savings'];

  const tagColors = {
    need: '#3B82F6',
    want: '#10B981',
    debt: '#F59E0B',
    emergency: '#FF6384',
    goal: '#8B5CF6',
    savings: '#36A2EB'
  };

  const displayCategories = [
    ...categories,
    ...debts.map(d => ({
      id: `debt-${d.id}`,
      name: d.name,
      color: tagColors.debt,
      icon: '💳',
      tag: 'debt',
      budget: d.budget ?? 0
    })),
    ...goals.map(g => ({
      id: `goal-${g.id}`,
      name: g.name,
      color: tagColors.goal,
      icon: '🎯',
      tag: 'goal',
      budget: g.budget ?? 0
    }))
  ];

  // חישוב סטטיסטיקות
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  }).reduce((sum, exp) => sum + exp.amount, 0);

  const totalDebts = debts.reduce((sum, debt) => sum + (debt.principal || 0), 0);
  const totalGoals = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const goalsProgress = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);

  const totalCategoryBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalGoalBudget = goals.reduce((sum, g) => sum + (g.budget || 0), 0);
  const totalDebtBudget = debts.reduce((sum, d) => sum + (d.budget || 0), 0);

  const totalBudget = totalCategoryBudget + totalGoalBudget + totalDebtBudget;
  const totalSpent = monthlyExpenses;
  const budgetUsedPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;


  const generateQuickInsights = () => {
    if (!categories || !expenses) return [];

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = now.getDate();
    const monthProgress = Math.floor((day / daysInMonth) * 100);

    const totalBudget = [...categories, ...debts, ...goals].reduce(
      (sum, item) => sum + (item.budget || 0), 0
    );

    const totalSpent = expenses
      .filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const percentUsed = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const avgDailySpend = day > 0 ? totalSpent / day : 0;
    const projectedEndOfMonth = avgDailySpend * daysInMonth;

    // 🟦 חישוב על הוצאות רגילות בלבד
    const regularCategories = categories.filter(
      (cat) => !['goal', 'debt', 'savings'].includes(cat.tag)
    );

    const regularBudget = regularCategories.reduce(
      (sum, c) => sum + (c.budget || 0), 0
    );

    const regularSpent = expenses
      .filter(exp => {
        const d = new Date(exp.date);
        const isCurrentMonth = d.getMonth() === month && d.getFullYear() === year;
        const isRegular = regularCategories.some(c => String(c.id) === String(exp.categoryId));
        return isCurrentMonth && isRegular;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const percentRegularUsed = regularBudget > 0
      ? Math.round((regularSpent / regularBudget) * 100)
      : 0;

    const regularAvgPerDay = day > 0 ? regularSpent / day : 0;
    const projectedRegular = regularAvgPerDay * daysInMonth;

    const insights = [];

    // תובנות כלליות (כמו שהיו)
    if (projectedEndOfMonth > totalBudget) {
      insights.push({
        icon: <TrendingUp className="text-red-600" />,
        text: `⚠️ בקצב ההוצאות הנוכחי תחרוג ב־₪${Math.round(projectedEndOfMonth - totalBudget)} עד סוף החודש.`,
      });
    }

    if (percentUsed > 100) {
      insights.push({
        icon: <AlertCircle className="text-red-500" />,
        text: 'חריגה מהתקציב! חשוב לבדוק את הקטגוריות החריגות.',
      });
    }

    // תובנות על הוצאות רגילות בלבד:
    if (projectedRegular > regularBudget) {
      insights.push({
        icon: <TrendingUp className="text-orange-600" />,
        text: `🚨 קצב ההוצאות שלך בקטגוריות הרגילות גבוה – צפויה חריגה של ₪${Math.round(projectedRegular - regularBudget)}.`,
      });
    } else if (monthProgress > 50 && percentRegularUsed < 50) {
      insights.push({
        icon: <ArrowDownCircle className="text-green-600" />,
        text: '✅ אתה מתנהל באחריות בתקציב השוטף – כל הכבוד!',
      });
    } else if (monthProgress < 50 && percentRegularUsed > 60) {
      insights.push({
        icon: <AlertCircle className="text-yellow-500" />,
        text: '⚠️ הוצאות רגילות גבוהות יחסית לשלב זה של החודש.',
      });
    }

    const hasNoBudget = categories.concat(goals, debts).some(c => c.budget == null);
    if (hasNoBudget) {
      insights.push({
        icon: <AlertCircle className="text-yellow-500" />,
        text: 'יש קטגוריות ללא תקציב מוגדר – זה עלול להוביל להפתעות לא צפויות.',
      });
    }


    // אם אין תובנות אחרות
    if (insights.length === 0) {
      insights.push({
        icon: <DollarSign className="text-blue-500" />,
        text: 'התקציב שלך מאוזן נכון לעכשיו. המשך כך! 🎯',
      });
    }

    return insights;
  };

  const categoriesWithExpenses = displayCategories.map(category => {
    const categoryExpenses = currentMonthExpenses
      .filter(exp => String(exp.categoryId) === String(category.id))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const categoryBudget = category.budget ?? 0;
    const remaining = categoryBudget - categoryExpenses;
    const overBudget = remaining < 0;

    return {
      ...category,
      total: categoryExpenses,
      percentage: totalExpensesThisMonth
        ? (categoryExpenses / totalExpensesThisMonth) * 100
        : 0,
      remaining,
      overBudget
    };
  }).sort((a, b) => b.total - a.total);



  const regularCategories = categories.filter(
    (cat) => !['goal', 'debt', 'savings'].includes(cat.tag)
  );

  const regularBudget = regularCategories.reduce(
    (sum, c) => sum + (c.budget || 0),
    0
  );

  const regularExpensesTotal = currentMonthExpenses
    .filter(exp => {
      const category = regularCategories.find(c => String(c.id) === String(exp.categoryId));
      return !!category;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);
  const regularBudgetUsedPercentage = regularBudget > 0
    ? Math.round((regularExpensesTotal / regularBudget) * 100)
    : 0;

  const isInCurrentMonth = (d) =>
    d.getMonth() === currentMonth && d.getFullYear() === currentYear;

  // מזהי קטגוריות לפי סוג
  const regularCategoryIds = categories
    .filter(c => !['savings', 'goal', 'debt'].includes(c.tag))
    .map(c => String(c.id));

  const savingsCategoryIds = categories
    .filter(c => c.tag === 'savings')
    .map(c => String(c.id));

  const monthlyRegularTotal = expenses
    .filter(exp => isInCurrentMonth(new Date(exp.date)))
    .filter(exp => regularCategoryIds.includes(String(exp.categoryId)))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const monthlySavingsTotal = expenses
    .filter(exp => isInCurrentMonth(new Date(exp.date)))
    .filter(exp => savingsCategoryIds.includes(String(exp.categoryId)))
    .reduce((sum, exp) => sum + exp.amount, 0);

  {/* לפני ה־map, אפשר להגדיר פונקציה עזר (או בפנים) */ }
  const isSavingsCategory = (cat) =>
    cat?.tag === 'savings' || cat?.tag === 'goal'


  // מחוץ ל־return, אחרי חישוב monthlySavingsTotal
  const monthlyNonSavingsTotal = monthlyExpenses - monthlySavingsTotal;
  const savingsRatio = monthlyExpenses > 0
    ? (monthlySavingsTotal / monthlyExpenses) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">🚀 טוען נתונים…</p>
        </div>
      </div>
    );
  }
  if (userFatalError) {
    return (
      <FullPageError
        title={userFatalError.title}
        description={userFatalError.description}
        severity={userFatalError.severity}
      />
    )
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 from-blue-50 to-purple-50 relative">
      {/* Animated background elements */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-300" />
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700" />
      </div>
      {/* כפתור תפריט במובייל */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Overlay למובייל */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {/* תוכן עיקרי */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="p-4 border-t border-gray-200">
            <QuickAddExpenseButton
              onAddExpense={(expense) => addExpenseToDB(expense)}
              categories={categories}
              sidebarOpen={sidebarOpen}
            />
            {!sidebarOpen && !isPutIncomes && (
              <button
                onClick={() => { navigate('/monthlyIncome', { state: { isNewUser: false } }); }
                }
                className="flex items-center gap-2 bg-gradient-to-r from-blue-300 to-purple-500 p-4 rounded-full shadow-lg text-white"
              >
                {isOpen ? <X size={20} /> : <Plus size={20} />}
                <span className="text-sm">ספר על על ההכנסות לחודש זה</span>
              </button>
            )}
          </div>
          {/* כותרת אישית */}
          <div className="text-center mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-1">שלום, {user.displayName} 👋</h1>
            {/* תאריך של היום */}
            <p className="text-gray-500 text-sm mb-1">
              {format(new Date(), "EEEE, d בMMMM yyyy", { locale: he })}
            </p>
            <p className="text-gray-600 text-base">זה מצב התקציב שלך לחודש הנוכחי</p>
            {!sidebarOpen && (
              <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-30 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                משוב
              </button>
            )}

            {/* מודל המשוב */}
            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed z-50 inset-0">
              {/* הצללה אחורית */}
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

              {/* תוכן המודל במרכז המסך */}
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden z-10">
                  <div className="p-4 flex justify-between items-center border-b">
                    <h3 className="text-lg font-bold">משוב למערכת</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500 text-sm">
                      ✖ סגור
                    </button>
                  </div>
                  <div className="p-6">
                    <FeedbackForm />
                  </div>
                </Dialog.Panel>
              </div>
            </Dialog>

          </div>

          {/* כרטיסי סיכום */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8 text-center">
            {/* 1. סה"כ הוצאות */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">סה"כ הוצאות החודש</p>
              <p className="text-2xl font-bold text-gray-800">₪{monthlyExpenses.toLocaleString()}</p>
            </div>

            {/* 2. הוצאות רגילות */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">הוצאות רגילות</p>
              <p className="text-2xl font-bold text-red-500">
                ₪{monthlyRegularTotal.toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">מצב התקציב של ההוצאות הרגילות</p>
              {regularExpensesTotal <= regularBudget ? (
                <p className="text-2xl font-bold text-green-600">
                  נותרו ₪{(regularBudget - regularExpensesTotal).toLocaleString()}
                </p>
              ) : (
                <p className="text-2xl font-bold text-red-600">
                  חריגה של ₪{(regularExpensesTotal - regularBudget).toLocaleString()}
                </p>
              )}
            </div>
            {/* יתרה / חריגה */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">מצב התקציב הכולל</p>

              {totalSpent <= totalBudget ? (
                <p className="text-2xl font-bold text-green-600">
                  נותרו ₪{(totalBudget - totalSpent).toLocaleString()}
                </p>
              ) : (
                <p className="text-2xl font-bold text-red-600">
                  חריגה של ₪{(totalSpent - totalBudget).toLocaleString()} מהתקציב!
                </p>
              )}
            </div>
            {/* 3. הוצאות לחיסכון */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">חיסכון החודש</p>
              <p className="text-2xl font-bold text-green-500">₪{monthlySavingsTotal.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({savingsRatio.toFixed(0)}% מסך ההוצאות)
              </p>
            </div>
          </div>


          {/* מדי תקציב – כללי ורגיל בלבד */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* מד כללי */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">מצב התקציב הכולל</h3>
              <p className="text-sm text-gray-500 mb-4 text-center">
                התרשים מציג את אחוז ההוצאות מתוך כלל התקציב שהוגדר – כולל מטרות, חובות וחיסכון.
              </p>
              <GaugeChart
                id="budget-gauge-overall"
                nrOfLevels={30}
                colors={['#10B981', '#F59E0B', '#EF4444']}
                arcWidth={0.3}
                percent={budgetUsedPercentage / 100}
                textColor="#374151"
                needleColor="#111827"
                formatTextValue={() => `${budgetUsedPercentage.toFixed(0)}%`}
                style={{ width: '200px', maxWidth: '100%' }}
              />
            </div>

            {/* מד הוצאות רגילות */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">מצב התקציב של ההוצאות הרגילות</h3>
              <p className="text-sm text-gray-500 mb-4 text-center">
                התרשים מציג את אחוז ההוצאות בקטגוריות היומיום בלבד – ללא מטרות, חובות וחיסכון. כך תוכל לדעת אם אתה עומד בתקציב השוטף שלך.
              </p>
              <GaugeChart
                id="budget-gauge-regular"
                nrOfLevels={30}
                colors={['#10B981', '#F59E0B', '#EF4444']}
                arcWidth={0.3}
                percent={regularBudgetUsedPercentage / 100}
                textColor="#374151"
                needleColor="#111827"
                formatTextValue={() => `${regularBudgetUsedPercentage.toFixed(0)}%`}
                style={{ width: '200px', maxWidth: '100%' }}
              />
            </div>
          </div>


          {/* תובנות תקציביות */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              תובנות החודש
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              {generateQuickInsights().map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>{insight.icon}</span>
                  <span>{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <br></br>

          {/* תרשימים ונתונים נוספים */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/*תרשים קטגוריות משופר עם טיפול במקרי קצה*/}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* כותרת מתוקנת */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <PieIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <span>הוצאות לפי קטגוריות</span>
                </h3>

                {/* מידע נוסף אם נחוץ */}
                {categoriesWithExpenses?.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {categoriesWithExpenses.length} קטגוריות פעילות השבוע
                  </p>
                )}
              </div>

              {/* תוכן עיקרי */}
              <div className="space-y-4">
                {/* מקרה: אין נתונים כלל */}
                {(!displayCategories || displayCategories.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PieIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium mb-2">עדיין לא הוספת קטגוריות</p>
                    <p className="text-gray-400 text-sm">הוסף הוצאה ראשונה כדי לראות את התרשים</p>
                  </div>
                ) : (!categoriesWithExpenses || categoriesWithExpenses.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PieIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-gray-600 text-lg font-medium mb-2">אין הוצאות השבוע</p>
                    <p className="text-gray-400 text-sm">הוסף הוצאה ראשונה כדי לראות את החלוקה לפי קטגוריות</p>
                  </div>
                ) : (
                  // ענף שלישי: מחזירים אלמנט יחיד שעוטף גם את הרשימה וגם את הכפתור
                  <div>
                    {/* הצגת קטגוריות */}
                    <div className="space-y-6">
                      {(showAllCategories ? categoriesWithExpenses : categoriesWithExpenses.slice(0, 5)).map((category, index) => {
                        // בדיקות בטיחות
                        const safeTotal = Math.max(0, Number(category.total) || 0);
                        const safeBudget = category.budget && Number(category.budget) > 0 ? Number(category.budget) : null;
                        const hasBudget = safeBudget !== null;

                        // remaining מגיע מהלוגיקה שלך (תקציב - הוצאות); שלילי = חריגה
                        const safeRemaining = Number(category.remaining) || 0;
                        const isOnThePeni = hasBudget && safeRemaining === 0;

                        const percentOfBudget = hasBudget
                          ? Math.min(((safeTotal / (safeBudget)) * 100) || 0, 1000)
                          : 0;

                        // חיסכון?
                        const savingCat = isSavingsCategory(category);

                        // חריגה גולמית (במונחי הוצאות)
                        const isOverBudgetRaw = hasBudget && safeRemaining < 0;

                        // בקטגוריות רגילות: חריגה אמיתית; בחיסכון – חריגה חיובית (יעד הושג/עברנו)
                        const isOverBudget = savingCat ? false : isOverBudgetRaw;
                        const isPositiveOverSaving = savingCat && isOverBudgetRaw;

                        // "כמעט נגמר" לקטגוריות רגילות; בחיסכון – "כמעט יעד"
                        const isNearlyExhausted = hasBudget && !isOnThePeni && safeRemaining >= 0 && safeRemaining <= 50;

                        // צבע לבר התקדמות
                        const progressColorClass = savingCat
                          ? (isPositiveOverSaving || percentOfBudget >= 100
                            ? 'bg-emerald-600'
                            : percentOfBudget > 80
                              ? 'bg-emerald-500'
                              : 'bg-emerald-400')
                          : (isOverBudget || percentOfBudget === 100
                            ? 'bg-red-600'
                            : percentOfBudget > 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500');

                        return (
                          <div
                            key={category.id || `category-${index}`}
                            className="border-b border-gray-400 pb-4 last:border-b-0 last:pb-0"
                          >
                            {/* שורת מידע עליונה */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white"
                                  style={{ backgroundColor: category.color || '#6B7280' }}
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-gray-800 text-base truncate">
                                    {category.name || 'קטגוריה ללא שם'}
                                  </h4>
                                  <p className="text-sm text-gray-500 mt-1">
                                    ₪{safeTotal.toLocaleString('he-IL')}
                                    {hasBudget && (
                                      <span className="text-gray-400">
                                        {' / '}₪{(safeBudget).toLocaleString('he-IL')}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* סטטוס */}
                              <div className="flex-shrink-0 text-left">
                                {savingCat ? (
                                  isPositiveOverSaving ? (
                                    <div className="text-emerald-600 font-semibold text-sm">
                                      <span className="block">מעולה! חיסכון מעל היעד</span>
                                      <span className="block text-xs">
                                        +₪{Math.abs(safeRemaining).toLocaleString('he-IL')}
                                      </span>
                                    </div>
                                  ) : isNearlyExhausted ? (
                                    <div className="text-emerald-600 font-medium text-sm">
                                      <span className="block">כמעט משיגים את היעד</span>
                                      <span className="block text-xs text-gray-500">
                                        ₪{safeRemaining.toLocaleString('he-IL')} עד היעד
                                      </span>
                                    </div>
                                  ) : hasBudget && safeRemaining > 0 ? (
                                    <div className="text-emerald-600 font-medium text-sm">
                                      <span className="block">בדרך הנכונה</span>
                                      <span className="block text-xs text-gray-500">
                                        ₪{safeRemaining.toLocaleString('he-IL')} עד היעד
                                      </span>
                                    </div>
                                  ) : isOnThePeni ? (
                                    <div className="text-emerald-700 text-sm">
                                      <span className="block">יעד הושג</span>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">
                                      <span className="block">ללא יעד חודשי</span>
                                    </div>
                                  )
                                ) : (
                                  <>
                                    {isOverBudget ? (
                                      <div className="text-red-600 font-semibold text-sm">
                                        <span className="block">חריגה</span>
                                        <span className="block text-xs">
                                          +₪{Math.abs(safeRemaining).toLocaleString('he-IL')}
                                        </span>
                                      </div>
                                    ) : isNearlyExhausted ? (
                                      <div className="text-orange-600 font-medium text-sm">
                                        <span className="block">כמעט נגמר</span>
                                        <span className="block text-xs text-gray-500">
                                          ₪{safeRemaining.toLocaleString('he-IL')} נותרו
                                        </span>
                                      </div>
                                    ) : hasBudget && safeRemaining > 0 ? (
                                      <div className="text-green-600 font-medium text-sm">
                                        <span className="block">בתקציב</span>
                                        <span className="block text-xs text-gray-500">
                                          ₪{safeRemaining.toLocaleString('he-IL')} נותרו
                                        </span>
                                      </div>
                                    ) : isOnThePeni ? (
                                      <div className="text-gray-500 text-sm">
                                        <span className="block">מדויק</span>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-sm">
                                        <span className="block">ללא תקציב</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* בר התקדמות */}
                            {hasBudget && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                  <span>0%</span>
                                  <span className="text-lg font-bold text-gray-800">
                                    {Math.round(percentOfBudget)}%
                                  </span>
                                  <span>100%</span>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${progressColorClass}`}
                                    style={{
                                      width: `${Math.min(percentOfBudget, 100)}%`,
                                      minWidth: safeTotal > 0 ? '4px' : '0px',
                                    }}
                                  />
                                </div>

                                {/* הודעות סיכום – אחת בלבד לפי סוג */}
                                {!savingCat && isOverBudget && (
                                  <div className="text-xs text-red-600 font-medium text-center bg-red-50 rounded py-1">
                                    חריגה של {Math.round(percentOfBudget - 100)}% מהתקציב
                                  </div>
                                )}

                                {savingCat && isPositiveOverSaving && (
                                  <div className="text-xs font-medium text-center rounded py-2
                                    text-emerald-800 bg-emerald-100 border border-emerald-300">
                                    🎉 כל הכבוד! חיסכון {Math.round(percentOfBudget - 100)}% מעל היעד 🎉
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* כפתור הצגת עוד */}
                    {categoriesWithExpenses.length > 5 && (
                      <div className="pt-4 border-t border-gray-100">
                        <button
                          onClick={() => setShowAllCategories(!showAllCategories)}
                          className="w-full z-40 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 
                       text-sm font-medium transition-all duration-200 rounded-lg
                       border border-blue-200 hover:border-blue-300"
                        >
                          {showAllCategories
                            ? '🔼 הצג פחות קטגוריות'
                            : `🔽 הצג עוד ${categoriesWithExpenses.length - 5} קטגוריות`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
            {/* יעדים פעילים */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                יעדים פעילים
              </h3>
              {goals.length > 0 ? (
                <div className="space-y-4">
                  {goals.slice(0, 3).map((goal) => {
                    const progress = goal.currentAmount || 0;
                    const percentage = (progress / goal.targetAmount) * 100;

                    return (
                      <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800 text-sm lg:text-base">{goal.name}</h4>
                          <span className="text-xs lg:text-sm text-gray-600">
                            ₪{progress.toLocaleString()} / ₪{goal.targetAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs lg:text-sm text-gray-600 mt-1">{percentage.toFixed(1)}% הושלם</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">עדיין לא הוגדרו יעדים</p>
              )}
            </div>

            {budgetUsedPercentage > 100 && (
              <p className="mt-2 text-sm font-medium text-red-600 text-center mb-6">חריגה מהתקציב! 😬</p>
            )}

            {/* התראות חכמות מורחבות */}
            <CategoryBudgetAlertsPanel
              categories={categories}
              goals={goals}
              debts={debts}
              expenses={expenses}
            />

            {/* התראות קטגוריה */}
            <SmartFinancialTips
              categories={categories}
              goals={goals}
              debts={debts}
              expenses={expenses}
            />
          </div>
        </div>
      </div>
    </div>
  );
}