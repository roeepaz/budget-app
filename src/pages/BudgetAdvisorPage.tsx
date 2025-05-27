import { Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useBudgetModel} from '../hooks/useBudgetModel';
import { DollarSign, HeartPulse, TrendingUp, CheckCircle, AlertTriangle, Target, Moon, Sun } from 'lucide-react';
import {  Calculator, Shield, Wallet, PiggyBank, CreditCard } from 'lucide-react';
import { db } from '../firebaseConfig.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AdvisorBudgetBuilder from '../components/AdvisorBudgetBuilder';
import {BudgetInputs,BudgetAdvisorPageProps, Debt, SavingsGoal,Category} from '../type/appTypes'


// 2. Extract form-only fields from BudgetInputs
type FormState = Omit<BudgetInputs, 'debts' | 'savingsGoals'>;

export default function BudgetAdvisorPage({ user }: BudgetAdvisorPageProps) {
  
  const navigate = useNavigate();

const [showAdvisorBudget, setShowAdvisorBudget] = useState(false);

const [inputs, setInputs] = useState<BudgetInputs | null>(null);
const [darkMode, setDarkMode] = useState(false);

const [form, setForm] = useState<FormState>({
  income: 10000,
  needs: 4000,
  wants: 2000,
  emergencyFund: 0,
  emergencyTargetMonths: 3,
  currentSavings: 500,
  currency: '₪'
});

const today = new Date().toISOString().split('T')[0];

  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const userId = user?.uid;
const [loading, setLoading] = useState(true);
const [hasLoaded, setHasLoaded] = useState(false); // דגל לקריאה שהסתיימה
const [loadError, setLoadError] = useState(false);

const [newGoal, setNewGoal] = useState({
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
  priority: 3,
});

const [newDebt, setNewDebt] = useState({
  name: '',
  principal: 0,
  annualRate: 0,
  termMonths: 12,
  minPayment: 0,
});

const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
// Only calculate result if inputs are set
const result =  useBudgetModel(inputs) 


useEffect(() => {
  if (!userId) return;

  const loadUserData = async () => {
  try {
    const docRef = doc(db, 'financial_data', userId);
    const catRef = doc(db, 'users', userId);

    const [snapshot, catSnap] = await Promise.all([
      getDoc(docRef),
      getDoc(catRef)
    ]);

    // ערכים ריקים כגיבוי
    const defaultForm: FormState = {
      income: 0,
      needs: 0,
      wants: 0,
      emergencyFund: 0,
      emergencyTargetMonths: 3,
      currentSavings: 0,
      currency: '₪'
    };

    const defaultCategories: Category[] = [];

    if (!snapshot.exists()) {
      await setDoc(docRef, {
        form: defaultForm,
        debts: [],
        goals: []
      });
    }

    if (!catSnap.exists()) {
      await setDoc(catRef, {
        categories: defaultCategories
      });
    }

    // טען מחדש אחרי יצירה אם צריך
    const updatedSnap = snapshot.exists() ? snapshot : await getDoc(docRef);
    const updatedCatSnap = catSnap.exists() ? catSnap : await getDoc(catRef);

    const data = updatedSnap.data() as {
      form: Partial<FormState>;
      debts: Debt[];
      goals: SavingsGoal[];
    };

    const goals = (data.goals || []).map(g => ({
      ...g,
      targetDate: g.targetDate as Timestamp
    }));

   function sanitizeForm(form: Partial<FormState> | undefined): FormState {
  return {
    income: form?.income ?? 0,
    needs: form?.needs ?? 0,
    wants: form?.wants ?? 0,
    emergencyFund: form?.emergencyFund ?? 0,
    emergencyTargetMonths: form?.emergencyTargetMonths ?? 3,
    currentSavings: form?.currentSavings ?? 0,
    currency: form?.currency ?? '₪',
  };
}

// שימוש:
setForm(sanitizeForm(data.form));

    setDebts(data.debts || []);
    setGoals(goals);

    setCategories(updatedCatSnap.data()?.categories || []);

    setHasLoaded(true);
  } catch (error) {
    console.error("⚠️ שגיאה בטעינת הנתונים:", error);
    setLoadError(true);
    setHasLoaded(false);
  } finally {
    setLoading(false);
  }
};


  loadUserData();
}, [userId]);
  
  useEffect(() => {
    if (!userId || !hasLoaded) return; // מונע שמירה לפני טעינה
  
    const timeout = setTimeout(() => {
     setDoc(doc(db, 'financial_data', userId), {
  form,
  debts,
  goals,
}, { merge: true });
    }, 800); // שמירה אחרי 800ms של שקט
  
    return () => clearTimeout(timeout);
  }, [form, debts,goals, userId, hasLoaded]);

  useEffect(() => {
  if (!userId || !hasLoaded) return;

  const timeout = setTimeout(() => {
    setDoc(doc(db, 'users', userId), {
      categories, // שומר את הקטגוריות במסמך של המשתמש
    }, { merge: true }); // חשוב! שלא ימחוק שדות אחרים במסמך
  }, 800);

  return () => clearTimeout(timeout);
}, [categories, userId, hasLoaded]);

if (loading) {
  return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
}
  if (!user) {
  return <div>Loading or not authenticated...</div>;
}
if (loadError) {
  return (
    <div className="p-6 text-center text-red-600" dir="rtl">
      ❌ ארעה שגיאה בטעינת הנתונים. אנא נסה לרענן את הדף או בדוק את החיבור.
    </div>
  );
}

  const handleSubmit = () => {
  const emergencyFromCategory = categories.find(c => c.tag === 'emergency')?.currentAmount ?? 0;

  setInputs({
    ...form,
    emergencyFund: emergencyFromCategory,
    debts,
    savingsGoals: goals,
  });
};

// which goal (if any) is being edited

// when user clicks “ערוך”, populate the form
const startEditGoal = (g: SavingsGoal) => {
  setEditingGoalId(g.id);
  setNewGoal({
    name:         g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount ?? 0,
    targetDate:   g.targetDate.toDate().toISOString().split('T')[0], // ✅
    priority:     g.priority,
  });
};


 const addGoal = () => {
  if (!newGoal.name || !newGoal.targetAmount) return;

  if (editingGoalId) {
    setGoals(goals.map(g => {
      if (g.id === editingGoalId) {
        const rawDate = new Date(newGoal.targetDate + 'T00:00:00');
        const isValidDate = !isNaN(rawDate.getTime());

        return {
          ...g,
          name: newGoal.name,
          targetAmount: newGoal.targetAmount,
          currentAmount: newGoal.currentAmount,
          targetDate: isValidDate ? Timestamp.fromDate(rawDate) : g.targetDate,
          priority: newGoal.priority,
        };

      }
      return g;
    }));
    setEditingGoalId(null);
  } else {
    // הוספה רגילה
    if (!newGoal.targetDate) return; // במקרה חדש – חייב תאריך תקין

    setGoals([
      ...goals,
      {
        id: Date.now().toString(),
        name: newGoal.name,
        targetAmount: newGoal.targetAmount,
        currentAmount: newGoal.currentAmount,
        targetDate: Timestamp.fromDate(new Date(newGoal.targetDate + 'T00:00:00')),
        priority: newGoal.priority,
      },
    ]);
  }

  // איפוס טופס
  setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 3 });
};

  const addDebt = () => {
    if (!newDebt.name || newDebt.principal <= 0 || newDebt.minPayment <= 0) return;
    
    setDebts([
      ...debts,
      {
        id: Date.now().toString(),
        name: newDebt.name,
        principal: newDebt.principal,
        annualRate: newDebt.annualRate,
        termMonths: newDebt.termMonths,
        minPayment: newDebt.minPayment,
      },
    ]);
    setNewDebt({ name: '', principal: 0, annualRate: 0, termMonths: 12, minPayment: 0 });
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter(debt => debt.id !== id));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return `${form.currency}${amount.toLocaleString()}`;
  };
  // Build distribution lists
  const needsList = categories.filter(c => c.tag === 'need').map(c => c.name).join(', ');
  const wantsList = categories.filter(c => c.tag === 'want').map(c => c.name).join(', ');
// Compute budget distribution recommendations
  const baseNames = goals /* placeholder to get category names? assume categories state exists*/;
  // Instead, derive from form tags: assume categories list in closure
  // Real code should import categories from context or hook
  // For demonstration, we'll use form.needs and form.wants
  const needsAmt = form.needs;
  const wantsAmt = result?.allocations.discretionarySpending ?? 0;
  const emergencyAmt = result?.allocations.emergencyFundMonthly ?? 0;
  const generalSavAmt = result?.allocations.generalSavings ?? 0;

  const totalDebt = result?.allocations?.debtAllocations?.reduce(
  (sum, d) => sum + (d.totalPayment ?? 0),
  0
);

const totalGoals = result?.allocations?.goalAllocations?.reduce(
  (sum, g) => sum + (g.allocatedMonthly ?? 0),
  0
);

const emergencyFundMonthly = result?.allocations?.emergencyFundMonthly ?? 0;
const generalSavings = result?.allocations?.generalSavings ?? 0;
const discretionarySpending = result?.allocations?.discretionarySpending ?? 0;

  return (
       <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50/30 to-slate-50 text-slate-900'
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${darkMode ? 'white' : 'rgb(59, 130, 246)'} 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative p-6 max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className={`group relative ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative text-3xl bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  🧠
                </div>
              </div>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                יועץ תקציבי חכם
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-0 group-hover:w-full transition-all duration-700"></div>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`group relative p-3 rounded-2xl transition-all duration-300 hover:scale-110 ${
              darkMode 
                ? 'bg-slate-800/50 hover:bg-slate-700/50 text-amber-400 border border-slate-700' 
                : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200 shadow-lg backdrop-blur-sm'
            }`}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {darkMode ? (
              <Sun className="w-6 h-6 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <Moon className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
            )}
          </button>
        </div>
        
        <p className={`text-lg mb-8 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          מלא את הנתונים הכספיים שלך ותקבל ניתוח מקצועי עם המלצות מותאמות אישית לשיפור המצב הכלכלי שלך.
        </p>

        {/* Basic Inputs Section */}
        <div className={`p-8 rounded-3xl shadow-xl mb-8 backdrop-blur-sm border relative overflow-hidden ${
          darkMode 
            ? 'bg-slate-800/40 border-slate-700/50' 
            : 'bg-white/60 border-white/20 shadow-blue-100/50'
        }`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
            darkMode ? 'text-slate-100' : 'text-slate-800'
          }`}>
            <Calculator className="w-7 h-7 text-blue-500" />
            נתונים בסיסיים
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
  { key: 'income', label: 'הכנסה חודשית נטו', icon: Wallet, placeholder: '10,000', color: 'green' },
  { key: 'needs', label: 'הוצאות קבועות', icon: Shield, placeholder: '4,000', color: 'orange' },
  { key: 'emergencyTargetMonths', label: 'יעד חירום (חודשים)', icon: Shield, placeholder: '3', color: 'blue' },
  { key: 'currentSavings', label: 'חיסכון חודשי קבוע', icon: PiggyBank, placeholder: '500', color: 'purple' }
].map(({ key, label, icon: Icon, placeholder, color }) => {
  const typedKey = key as keyof typeof form;

  return (
    <div key={key} className="group relative">
      <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
        <Icon className={`inline w-4 h-4 mr-2 text-${color}-500`} />
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          placeholder={placeholder}
          className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 focus:scale-105 ${
            darkMode 
              ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:bg-slate-700/70' 
              : 'bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:bg-white backdrop-blur-sm'
          } focus:ring-4 focus:ring-blue-400/20 focus:outline-none group-hover:border-blue-300`}
          value={form[typedKey] || ''}
          onChange={(e) => setForm({ ...form, [typedKey]: Number(e.target.value) })}
        />
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-${color}-400/10 to-${color}-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>
      </div>
    </div>
  );
})
}
          </div>
        </div>

        {/* Goals Section */}
        <div className={`p-8 rounded-3xl shadow-xl mb-8 backdrop-blur-sm border relative overflow-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-800/50' 
            : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-200/50'
        }`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
          
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
            darkMode ? 'text-blue-300' : 'text-blue-700'
          }`}>
            <Target className="w-7 h-7" />
            🎯 מטרות חסכון
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <input
              type="text"
              placeholder="שם מטרה"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-blue-400 backdrop-blur-sm'
              }`}
              value={newGoal.name || ''}
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="סכום יעד"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-blue-400 backdrop-blur-sm'
              }`}
              value={newGoal.targetAmount || ''}
              onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="סכום נוכחי"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-blue-400 backdrop-blur-sm'
              }`}
              value={newGoal.currentAmount || ''}
              onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
            />
            <input
              type="date"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white focus:border-blue-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-blue-400 backdrop-blur-sm'
              }`}
              value={newGoal.targetDate || ''}
              onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
            />
            <button
              onClick={addGoal}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 font-semibold shadow-lg"
            >
              ➕ הוסף מטרה
            </button>
          </div>

          {goals.length > 0 && (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all hover:scale-102 ${
                  darkMode 
                    ? 'bg-slate-800/60 border-slate-700' 
                    : 'bg-white/80 border-slate-200 backdrop-blur-sm'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold">
                      🎯
                    </div>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {goal.name}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
{formatCurrency(goal.currentAmount ?? 0)} / {formatCurrency(goal.targetAmount ?? 0)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className={`text-sm px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-all ${
                      darkMode ? 'text-red-400 hover:bg-red-500' : 'text-red-500'
                    }`}
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debts Section */}
        <div className={`p-8 rounded-3xl shadow-xl mb-8 backdrop-blur-sm border relative overflow-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-red-900/30 to-pink-900/30 border-red-800/50' 
            : 'bg-gradient-to-br from-red-50/80 to-pink-50/80 border-red-200/50'
        }`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-pink-400"></div>
          
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
            darkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            <CreditCard className="w-7 h-7" />
            💳 הלוואות קיימות
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <input
              type="text"
              placeholder="שם ההלוואה"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-red-400 backdrop-blur-sm'
              }`}
              value={newDebt.name || ''}
              onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="סכום קרן"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-red-400 backdrop-blur-sm'
              }`}
              value={newDebt.principal || ''}
              onChange={(e) => setNewDebt({ ...newDebt, principal: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="ריבית %"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-red-400 backdrop-blur-sm'
              }`}
              value={newDebt.annualRate ? newDebt.annualRate * 100 : ''}
              onChange={(e) => setNewDebt({ ...newDebt, annualRate: Number(e.target.value) / 100 })}
            />
            <input
              type="number"
              placeholder="תשלום חודשי"
              className={`p-3 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-red-400' 
                  : 'bg-white/80 border-slate-200 text-slate-900 focus:border-red-400 backdrop-blur-sm'
              }`}
              value={newDebt.minPayment || ''}
              onChange={(e) => setNewDebt({ ...newDebt, minPayment: Number(e.target.value) })}
            />
            <button
              onClick={addDebt}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 font-semibold shadow-lg"
            >
              ➕ הוסף הלוואה
            </button>
          </div>

          {debts.length > 0 && (
            <div className="space-y-3">
              {debts.map((debt) => (
                <div key={debt.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all hover:scale-102 ${
                  darkMode 
                    ? 'bg-slate-800/60 border-slate-700' 
                    : 'bg-white/80 border-slate-200 backdrop-blur-sm'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      🏦
                    </div>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {debt.name}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        קרן: {formatCurrency(debt.principal)} | תשלום: {formatCurrency(debt.minPayment)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDebt(debt.id)}
                    className={`text-sm px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-all ${
                      darkMode ? 'text-red-400 hover:bg-red-500' : 'text-red-500'
                    }`}
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleSubmit}
            className={`group relative px-12 py-6 text-xl font-bold rounded-3xl transition-all duration-500 transform hover:scale-110 shadow-2xl ${
              darkMode
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500'
                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400'
            }`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/30 via-indigo-400/30 to-purple-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div className="relative flex items-center gap-4">
              <TrendingUp className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
              <span>הרץ ניתוח מקצועי</span>
              <div className="text-2xl group-hover:animate-bounce">🔍</div>
            </div>
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Financial Health Overview */}
            <div className={`p-6 rounded-lg shadow ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30'
                : 'bg-gradient-to-r from-blue-50 to-blue-100'
            }`}>
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                <HeartPulse className="w-6 h-6" />
                📊 סקירת מצב כלכלי
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded shadow-sm ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ציון בריאות כלכלית</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {result.ratios.healthScore.toFixed(0)}/100
                  </div>
                </div>
                <div className={`p-3 rounded shadow-sm ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>יחס שירות חוב</div>
                  <div className={`text-lg font-bold ${result.ratios.debtServiceRatio > 0.36 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}`}>
                    {(result.ratios.debtServiceRatio * 100).toFixed(1)}%
                  </div>
                </div>
                <div className={`p-3 rounded shadow-sm ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>קרן חירום</div>
                  <div className={`text-lg font-bold ${result.ratios.emergencyFundRatio < 1 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : (darkMode ? 'text-green-400' : 'text-green-600')}`}>
                    {(result.ratios.emergencyFundRatio * 100).toFixed(0)}%
                  </div>
                </div>
                <div className={`p-3 rounded shadow-sm ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>תזרים זמין</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {formatCurrency(result.availableForAllocation)}
                  </div>
                </div>
              </div>
            </div>


            {/* Allocations */}
            <div className={`p-6 rounded-lg shadow ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30'
                : 'bg-gradient-to-r from-blue-50 to-blue-100'
            }`}>
               <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>📌 הקצאות מומלצות</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Debt Allocations */}
                {result.allocations.debtAllocations.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded">
                    <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">💳 פירעון חובות</h3>
                    <div className="space-y-2">
                      {result.allocations.debtAllocations.map(debt => (
                        <div key={debt.id} className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{debt.name}</div>
                          <div className="flex justify-between text-gray-900 dark:text-gray-100">
                            <span>מינימום: {formatCurrency(debt.minPayment)}</span>
                            {debt.extraPayment > 0 && (
                              <span className="text-green-600 dark:text-green-400">
                                +{formatCurrency(debt.extraPayment)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            סה״כ: {formatCurrency(debt.totalPayment)}
                            {debt.payoffMonths && ` (${debt.payoffMonths} חודשים)`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              
                {/* Emergency Fund */}
              {result.allocations.emergencyFundMonthly > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded">
                  <h3 className="font-bold text-yellow-700 mb-2">🛡️ קרן חירום</h3>
                  <div className="text-xs text-gray-600">
                    <div>הקצאה חודשית: {formatCurrency(result.allocations.emergencyFundMonthly)}</div>
                    <div className="text-xs text-gray-600">
                      חסר עד יעד: {formatCurrency(result.allocations.emergencyFundGap)}
                    </div>
                  </div>
                </div>
              )}

                {/* General Savings */}
                {result.allocations.generalSavings > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded">
                    <h3 className="font-bold text-green-700 dark:text-green-400 mb-2">💰 חיסכון כללי</h3>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(result.allocations.generalSavings)}
                    </div>
                  </div>
                )}

                {/* Discretionary Spending */}
                {result.allocations.discretionarySpending > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded">
                    <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2">🎉 הוצאות נוספות</h3>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(result.allocations.discretionarySpending)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Savings Goals */}
            {result.allocations.goalAllocations.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Target className="w-6 h-6" />
                  🎯 מטרות חסכון
                </h2>
                <div className="space-y-3">
                  {result.allocations.goalAllocations.map(goal => (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 p-4 rounded border dark:border-gray-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{goal.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            נדרש: {formatCurrency(goal.requiredMonthly)} | 
                            מוקצה: {formatCurrency(goal.allocatedMonthly)}
                          </div>
                        </div>
                        <div className="text-right">
                          {goal.onTrack ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          )}
                          <div className="text-xs text-gray-900 dark:text-gray-100">
                            {goal.onTrack ? 'במסלול' : `חסר ${formatCurrency(goal.shortfall)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
           <div className="mt-8 text-center">
            <button
              onClick={() => setShowAdvisorBudget(true)}
              className={`group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-900/30'
                  : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white hover:from-blue-400 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30'
              }`}
            >
              {/* רקע מנצנץ */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300"></div>
              
              {/* תוכן הכפתור */}
              <div className="relative flex items-center gap-3">
                <div className="text-2xl animate-bounce">🤖</div>
                <div className="flex flex-col items-start">
                  <span className="text-xl font-extrabold tracking-wide">
                    בנה תקציב בקלות!
                  </span>
                  <span className="text-sm opacity-90 font-normal">
                    עם המלצות היועץ הפיננסי שלך
                  </span>
                </div>
                <div className="text-2xl group-hover:rotate-12 transition-transform duration-300">📊</div>
              </div>   
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-blue-300/30 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>  
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-300/50 via-indigo-300/50 to-blue-300/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{backgroundClip: 'padding-box'}}></div>
            </button>
            
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
              ✨ קבל המלצות מותאמות אישית לתקציב המושלם שלך
            </div>
          </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded">
                <h3 className="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  🚨 אזהרות
                </h3>
                <ul className="list-disc pl-5 text-sm text-red-800 dark:text-red-400 space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded">
                <h3 className="font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  💡 המלצות
                </h3>
                <ul className="list-disc pl-5 text-sm text-green-800 dark:text-green-400 space-y-1">
                  {result.recommendations.map((recommendation, i) => (
                    <li key={i}>{recommendation}</li>
                  ))}
                </ul>
              </div>
              
            )}
 
          {showAdvisorBudget && result && (
            <AdvisorBudgetBuilder
                allocations={{
                  ...result.allocations,
                  emergencyFundMonthly,
                  generalSavings,
                  discretionarySpending,
                  debtAllocations: result.allocations.debtAllocations ?? [],
                  goalAllocations: result.allocations.goalAllocations ?? [],
                }}
                totalDebt={totalDebt}
                totalGoals={totalGoals}
                totalSavings={generalSavings}
                totalEmergency={emergencyFundMonthly}
                totalWants={discretionarySpending}
                totalNeeds={form.needs}
                categories={categories.filter((cat: any) => !cat.hidden)}
                goals={goals.map(g => ({
                  ...g,
                  budget: result.allocations.goalAllocations.find(ga => ga.id === g.id)?.allocatedMonthly ?? g.budget ?? 0,
                }))}
                debts={debts.map(d => ({
                  ...d,
                  budget: result.allocations.debtAllocations.find(da => da.id === d.id)?.totalPayment ?? d.budget ?? 0,
                }))}
              onClose={() => {
                  setShowAdvisorBudget(false);
                  //navigate('/BudgetPlanner'); 
                }}

                onUpdate={async (updatedCategories, updatedGoals, updatedDebts) => {
                  const userDoc = doc(db, 'users', user.uid);
                  const financialDoc = doc(db, 'financial_data', user.uid);

                  // 1. עדכון סטייט מקומי
                  setCategories(updatedCategories.filter(cat =>
                    !['goal', 'debt'].includes(cat.tag)
                  ));

                  setGoals(updatedGoals);
                  setDebts(updatedDebts);

                  // 2. שמירה ל־Firestore
                  await setDoc(userDoc, { categories: updatedCategories }, { merge: true });
                  await setDoc(financialDoc, {
                    form,
                    goals: updatedGoals,
                    debts: updatedDebts,
                  }, { merge: true });

                  // 3. מעבר בטוח לעמוד הבא
                  navigate('/BudgetPlanner');
                }}
                />
                )}
            <div className="text-center">
              <div className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                הניתוח מבוסס על הנתונים שסיפקת ועל עקרונות תכנון פיננסי על פי דעתי אין באמור המלצה לפעולה או יעוץ פיננסי 🎯
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}