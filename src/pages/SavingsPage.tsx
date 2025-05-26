import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  PieChart as PieIcon,
  Moon,
  Sun,
  Wallet,
  BarChart,
  TrendingUp,
  Layers,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc,updateDoc } from 'firebase/firestore';
import {SavingsGoal, Expense} from '../type/appTypes'

const DARK_MODE_KEY = 'budget-app-dark-mode';

// תגיות ל־Pie החסכונות
type CategoryTag = 'emergency'|'savings'|'goal';
interface SummaryCat {
  id: string;
  name: string;
  color: string;
  icon: string;
  tag: CategoryTag;
  currentAmount?: number;
}


const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#EF4444'];

// פונקציה להצגת סכומים בפורמט מתאים
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function SavingsPage({ user }: { user: { uid: string } }) {
  const userId = user.uid;

  // --- states for התקציב הרגיל ---
  const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => 
    JSON.parse(localStorage.getItem(DARK_MODE_KEY) || 'false')
  );

  // --- states for סיכום חסכונות ---
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [categories, setCategories] = useState<SummaryCat[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [activeTab, setActiveTab] = useState('savings');

  // להוספת מודאל הורדה:
  const [showWithdrawModal, setShowWithdrawModal] =
    useState(false);
  const [withdrawTarget, setWithdrawTarget] =
    useState<{ id: string; type: CategoryTag } | null>(null);
  const [withdrawAmount, setWithdrawAmount] =
    useState<number>(0);
  const [withdrawDesc, setWithdrawDesc] =
    useState<string>('');

  // 2) Load חסכונות (categories, expenses) ו־goals
  useEffect(() => {
    (async () => {
      try {
        // users/{uid}
        const uSnap = await getDoc(doc(db, 'users', userId));
        if (uSnap.exists()) {
          const d = uSnap.data() as any;
          setCategories(
            (d.categories || []).map((c: any) => {
              const base = {
                ...c,
                id: String(c.id),
                hidden: c.hidden ?? false,
                budget: c.budget ?? 0,
              };

              if (['savings', 'emergency'].includes(c.tag)) {
                return {
                  ...base,
                  currentAmount: c.currentAmount ?? 0
                };
              }

              return base;
            })
          );
          setExpenses(d.expenses || []);
        }
        // financial_data/{uid}
        const fSnap = await getDoc(doc(db, 'financial_data', userId));
        if (fSnap.exists()) {
          const d = fSnap.data() as any;
          setGoals(
  (d.goals || []).map((g: any) => ({
    ...g,
    targetDate: g.targetDate?.toDate ? g.targetDate.toDate() : new Date(g.targetDate)
  }))
);
        }
      } catch (error) {
    //console.error("⚠️ שגיאה בטעינת הנתונים:", error);
    setLoadError(true);
  } finally {
        setSummaryLoading(false);
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);


const handleWithdraw = async () => {
  if (!withdrawTarget || withdrawAmount <= 0) return;
  const { id, type } = withdrawTarget;

  let updatedCategories = categories;
  let updatedGoals = goals;

  if (type === 'goal') {
    updatedGoals = goals.map(g =>
      `goal-${g.id}` === id
        ? { ...g, currentAmount: (g.currentAmount ?? 0) - withdrawAmount }
        : g
    );
    setGoals(updatedGoals);
  } else {
    updatedCategories = categories.map(c =>
      String(c.id) === id
        ? { ...c, currentAmount: (c.currentAmount ?? 0) - withdrawAmount }
        : c
    );
    setCategories(updatedCategories);
  }

  try {
    // שמירה של כל הקטגוריות כמו שהן
    await setDoc(
      doc(db, 'users', userId),
      { categories: updatedCategories },
      { merge: true }
    );

    // שמירה של כל המטרות כמו שהן
    await setDoc(
      doc(db, 'financial_data', userId),
      { goals: updatedGoals },
      { merge: true }
    );
  } catch (e: any) {
    console.error('שגיאה בשמירת המשיכה:', e.code, e.message);
    alert(`שגיאה: ${e.code} - ${e.message}`);
  }

  // איפוס
  setWithdrawAmount(0);
  setWithdrawDesc('');
  setShowWithdrawModal(false);
};


  // --- חישוב סיכום חסכונות ל־Pie ---
  if (loading || summaryLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin" size={32} />
          <p className="text-lg font-medium">טוען נתונים...</p>
        </div>
      </div>
    );
  }
if (loadError) {
  return (
    <div className="p-6 text-center text-red-600" dir="rtl">
      ❌ ארעה שגיאה בטעינת הנתונים. אנא נסה לרענן את הדף או בדוק את החיבור.
    </div>
  );
}
  // בחר רק את הקרן emergency + savings
  const savingsCats = categories.filter(c => c.tag === 'emergency' || c.tag === 'savings');
  // מטרה כקטגוריה
  const goalCats = goals.map((g, idx) => ({
    id: `goal-${g.id}`,
    name: g.name,
    color: COLORS[(idx + savingsCats.length) % COLORS.length],
    icon: '🎯',
    tag: 'goal' as CategoryTag
  }));
  
  const displayCats = [...savingsCats, ...goalCats];
  
const totalPerCat = displayCats.map(c => {
  if (c.tag === 'goal') {
    const goal = goals.find(g => `goal-${g.id}` === c.id);
    return {
      name: c.name,
      value: goal?.currentAmount ?? 0,
      color: c.color
    };
  } else if (c.tag === 'savings' || c.tag === 'emergency') {
    const matchingCat = categories.find(cat => String(cat.id) === String(c.id));
    return {
      name: c.name,
      value: matchingCat?.currentAmount ?? 0,
      color: c.color
    };
  }

  // אחרת – קטגוריה לא רלוונטית להצגה
  return {
    name: c.name,
    value: 0,
    color: c.color
  };
}).filter(c => c.value > 0);


  
  const totalAll = totalPerCat.reduce((s, c) => s + c.value, 0);
  
  const pieData = totalPerCat.map(x => ({
    name: x.name,
    value: x.value,
    pct: totalAll ? ((x.value / totalAll) * 100).toFixed(1) : '0',
    color: x.color
  }));


  const renderTab = () => {
    switch(activeTab) {
      case 'savings':
        return (
          <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="font-semibold mb-4 flex items-center text-xl">
              <PieIcon className="ml-2" size={24}/> סיכום חסכונות
            </h2>
            <div className="h-64 mb-6">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={4}
                      label={({name, pct}) => `${pct}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), "סכום"]}
                      contentStyle={{ 
                        direction: 'rtl', 
                        textAlign: 'right',
                        borderRadius: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
                        color: isDarkMode ? '#fff' : '#000',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className={`text-gray-500 text-center`}>אין נתוני חסכונות להצגה</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {pieData.length > 0 ? (
                pieData.map(d => (
                  <div key={d.name} className={`flex justify-between items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: d.color }}></div>
                      <span className="font-medium">{d.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">{formatCurrency(d.value)}</span>
                      <span className="text-sm text-gray-500">{d.pct}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 rounded-lg bg-gray-100 text-gray-600">
                  לא קיימות הוצאות
                </div>
              )}
            </div>
            <button
          onClick={() => {
            setWithdrawTarget(null);
            setShowWithdrawModal(true);
          }}
          className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
        >
          ביצוע משיכה
        </button>
          </div>
        );
      
      case 'goals':
        return (
          <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="font-semibold mb-4 flex items-center text-xl">
              <Layers className="ml-2" size={24}/> מטרות חיסכון
            </h2>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map(goal => {
                    const current = goal.currentAmount ?? 0;

                  const progress = goal.targetAmount > 0
                  ? Math.min(100, (current / goal.targetAmount) * 100)
                  : 0;
                  
                 return (
                    <div key={goal.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{goal.name}</h3>
                        <span className="text-sm font-medium">
                          {formatCurrency(current)} / {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{progress.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className={`text-gray-500`}>לא הוגדרו מטרות חיסכון</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`} dir="rtl">
      <header className={`py-4 px-6 ${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-600'} text-white shadow-lg`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isDarkMode ? 'bg-indigo-800' : 'bg-indigo-500'}`}>
              <Wallet size={24}/>
            </div>
            <h1 className="text-xl font-bold">ניהול חסכונות</h1>
          </div>
          <button onClick={() => setIsDarkMode((prev: boolean) => !prev)}>
  {isDarkMode ? '☀' : '🌙'}
</button>

        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* סרגל ניווט */}
          <nav className={`md:col-span-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 h-fit`}>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveTab('savings')}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'savings' 
                      ? isDarkMode ? 'bg-indigo-900 text-white' : 'bg-indigo-100 text-indigo-800' 
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <PieIcon className="ml-3" size={20}/>
                  <span>חסכונות</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('goals')}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'goals' 
                      ? isDarkMode ? 'bg-indigo-900 text-white' : 'bg-indigo-100 text-indigo-800' 
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Layers className="ml-3" size={20}/>
                  <span>מטרות חיסכון</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('investments')}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === 'investments' 
                      ? isDarkMode ? 'bg-indigo-900 text-white' : 'bg-indigo-100 text-indigo-800' 
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp className="ml-3" size={20}/>
                  <span>השקעות</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* תצוגה ראשית */}
          <div className="md:col-span-4">
            {renderTab()}
          </div>

          {/* תקציר נתונים */}
          <div className="md:col-span-1">
            <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="font-semibold mb-3 text-lg">סיכום נתונים</h2>
              
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-sm text-gray-500 mb-1">סה"כ חסכונות</div>
                  <div className="font-bold text-lg">{formatCurrency(totalAll)}</div>
                </div>
                
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-sm text-gray-500 mb-1">מספר מטרות</div>
                  <div className="font-bold text-lg">{goals.length}</div>
                </div>

                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-sm text-gray-500 mb-1">קטגוריות חיסכון</div>
                  <div className="font-bold text-lg">{savingsCats.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
       {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className={`p-6 rounded-lg shadow-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
    <h2 className="text-xl font-bold mb-4">ביצוע משיכה</h2>

    {/* יעד נסיגה */}
    <label className="block mb-2 text-sm font-medium">בחר סוג נסיגה:</label>
    <select
  className={`w-full mb-4 p-2 border rounded ${
    isDarkMode
      ? 'bg-gray-700 text-white border-gray-600'
      : 'bg-white text-gray-900 border-gray-300'
  }`}
  onChange={e => {
    const val = e.target.value;
    if (val.startsWith('goal-')) {
      setWithdrawTarget({ id: val, type: 'goal' });
    } else {
      setWithdrawTarget({ id: val, type: val === 'emergency' ? 'emergency' : 'savings' });
    }
  }}
  value={withdrawTarget?.id || ''}
>

      <option value="">— בחר —</option>
      {categories
        .filter(c => c.tag === 'emergency' || c.tag === 'savings')
        .map(c => (
          <option key={c.id} value={String(c.id)}>
            {c.icon} {c.name}
          </option>
        ))}
      {goals.map(g => (
        <option key={`goal-${g.id}`} value={`goal-${g.id}`}>
          🎯 {g.name}
        </option>
      ))}
    </select>

    {/* סכום */}
<label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">סכום</label>
<input
  type="number"
  className="w-full mb-4 p-2 border rounded 
             bg-white text-gray-900 border-gray-300 
             dark:bg-gray-700 dark:text-white dark:border-gray-600 
             focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
  value={withdrawAmount || ''}
  onChange={e => setWithdrawAmount(parseFloat(e.target.value) || 0)}
/>

    {/* הגבלת סכום */}
    {withdrawTarget && (
      <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        מקסימום: {formatCurrency(
          (() => {
            if (withdrawTarget.type === 'goal') {
              const g = goals.find(g => `goal-${g.id}` === withdrawTarget.id);
              return g?.currentAmount ?? 0;
            } else {
              const c = categories.find(c => String(c.id) === withdrawTarget.id);
              return c?.currentAmount ?? 0;
            }
          })()
        )}
      </div>
    )}

    {/* תיאור */}
<label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">תיאור (אופציונלי)</label>
<input
  type="text"
  className="w-full mb-4 p-2 border rounded 
             bg-white text-gray-900 border-gray-300 
             dark:bg-gray-700 dark:text-white dark:border-gray-600 
             focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
  value={withdrawDesc}
  onChange={e => setWithdrawDesc(e.target.value)}
/>

    {/* שגיאה אם הסכום לא תקין */}
    {withdrawTarget && withdrawAmount > 0 && (() => {
      const max = withdrawTarget.type === 'goal'
        ? goals.find(g => `goal-${g.id}` === withdrawTarget.id)?.currentAmount ?? 0
        : categories.find(c => String(c.id) === withdrawTarget.id)?.currentAmount ?? 0;

      return withdrawAmount > max ? (
        <div className="text-red-500 text-sm mb-2">לא ניתן למשוך יותר ממה שיש ביעד</div>
      ) : null;
    })()}
<small className="text-sm text-gray-500 dark:text-gray-400">
  משיכת כסף תגרע מהחיסכון הקיים
</small>

    <div className="flex justify-end space-x-2">
      <button
        onClick={() => setShowWithdrawModal(false)}
        className={`px-4 py-2 rounded ${
          isDarkMode
            ? 'bg-gray-600 text-white hover:bg-gray-500'
            : 'bg-gray-300 hover:bg-gray-400'
        }`}
      >
        ביטול
      </button>

      <button
        onClick={handleWithdraw}
        disabled={
          !withdrawTarget ||
          withdrawAmount <= 0 ||
          (() => {
            const max = withdrawTarget.type === 'goal'
              ? goals.find(g => `goal-${g.id}` === withdrawTarget.id)?.currentAmount ?? 0
              : categories.find(c => String(c.id) === withdrawTarget.id)?.currentAmount ?? 0;
            return withdrawAmount > max;
          })()
        }
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        אשר נסיגה
      </button>
    </div>
  </div>
</div>

      )}
    </div>
  );
}