import React, { useState } from 'react';
import { useBudgetModel, BudgetInputs, Debt, SavingsGoal } from '../hooks/useBudgetModel';
import { DollarSign, HeartPulse, TrendingUp, CheckCircle, AlertTriangle, Target, Moon, Sun } from 'lucide-react';

export default function BudgetAdvisorPage() {
  const [inputs, setInputs] = useState<BudgetInputs | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const [form, setForm] = useState({
    income: 10000,
    needs: 4000,
    wants: 2000,
    emergencyFund: 5000,
    emergencyTargetMonths: 3,
    currentSavings: 500,
    currency: '₪'
  });

  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

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

  // Only calculate result if inputs are set
  const result =  useBudgetModel(inputs) 

  const handleSubmit = () => {
    setInputs({
      ...form,
      debts,
      savingsGoals: goals,
    });
  };

  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) return;
    
    setGoals([
      ...goals,
      {
        id: Date.now().toString(),
        name: newGoal.name,
        targetAmount: newGoal.targetAmount,
        currentAmount: newGoal.currentAmount,
        targetDate: new Date(newGoal.targetDate),
        priority: newGoal.priority,
      },
    ]);
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

  return (
      <div className={`min-h-screen transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-50 text-gray-900'
          }`}>
        <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-4">
           <h1 className={`text-3xl font-bold flex items-center gap-2 ${
            darkMode ? 'text-blue-400' : 'text-blue-700'
          }`}>
            <span role="img" aria-label="brain">🧠</span>
            יועץ תקציבי חכם
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-yellow-500' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          מלא את הנתונים הכספיים שלך ותקבל ניתוח חכם עם המלצות אישיות לשיפור המצב הכלכלי.
        </p>

        {/* Basic Budget Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>הכנסה חודשית נטו</label>
            <input
              type="number"
              placeholder="לדוג׳: 10000"
              title="סך כל ההכנסות החודשיות לאחר ניכויים"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}             
               value={form.income}
              onChange={(e) => setForm({ ...form, income: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>הוצאות קבועות (צרכים)</label>
            <input
              type="number"
              placeholder="לדוג׳: 4000"
              title="הוצאות הכרחיות כמו שכירות, חשמל, מזון, תחבורה"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}  
              value={form.needs}
              onChange={(e) => setForm({ ...form, needs: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>הוצאות נלוות (רצונות)</label>
            <input
              type="number"
              placeholder="לדוג׳: 2000"
              title="בילויים, מסעדות, קניות לא הכרחיות וכדומה"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}  
              value={form.wants}
              onChange={(e) => setForm({ ...form, wants: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>חיסכון חירום נוכחי</label>
            <input
              type="number"
              placeholder="לדוג׳: 5000"
              title="כמה כסף כבר שמור בצד למקרי חירום"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}  
              value={form.emergencyFund}
              onChange={(e) => setForm({ ...form, emergencyFund: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>יעד חירום (חודשים)</label>
            <input
              type="number"
              placeholder="לדוג׳: 3"
              title="לכמה חודשי קיום תרצה שהחיסכון יכסה (מומלץ: 3-6 חודשים)"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}  
              value={form.emergencyTargetMonths}
              onChange={(e) => setForm({ ...form, emergencyTargetMonths: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col">
            <label className={`font-medium mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>חיסכון חודשי קבוע</label>
            <input
              type="number"
              placeholder="לדוג׳: 500"
              title="כמה כסף אתה חוסך בכל חודש בצורה קבועה"
              className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}  
              value={form.currentSavings}
              onChange={(e) => setForm({ ...form, currentSavings: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Savings Goals Section */}
        <div className={`p-4 rounded shadow mb-6 ${
          darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
        }`}>
          <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <Target className="w-5 h-5" />
            🎯 מטרות חסכון
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm items-end">
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>שם מטרה (למשל: חופשה)</label>
              <input
                type="text"
                placeholder="שם מטרה"
                className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newGoal.name || ''}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>סכום יעד</label>
              <input
                type="number"
                placeholder="סכום יעד"
                className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newGoal.targetAmount ?? ''}
                onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>סכום נוכחי (כמה כבר חסכת למטרה)</label>
              <input
                type="number"
                placeholder="סכום נוכחי"
                className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newGoal.currentAmount ?? ''}
                onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>תאריך יעד</label>
              <input
                type="date"
                className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newGoal.targetDate || ''}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>עדיפות (כמה המטרה דחופה לך)</label>
              <select
                className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newGoal.priority ?? ''}
                onChange={(e) => setNewGoal({ ...newGoal, priority: Number(e.target.value) })}
              >
                <option value={1}>עדיפות נמוכה</option>
                <option value={2}>עדיפות בינונית</option>
                <option value={3}>עדיפות בינונית-גבוהה</option>
                <option value={4}>עדיפות גבוהה</option>
                <option value={5}>עדיפות דחופה</option>
              </select>
            </div>
          </div>
          <button
            className={`mt-3 py-2 px-4 rounded text-sm transition-colors ${
              darkMode 
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={addGoal}
            disabled={!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate}
          >
            ➕ הוסף מטרה
          </button>

          {/* Display existing goals */}
          {goals.length > 0 && (
            <div className="mt-4">
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>מטרות קיימות:</h3>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className={`flex justify-between items-center p-2 rounded border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}>
                    <span className={`text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      🎯 {goal.name} - {formatCurrency(goal.currentAmount || 0)} / {formatCurrency(goal.targetAmount)} 
                      (עד {goal.targetDate.toLocaleDateString('he-IL')})
                    </span>
                    <button
                      className={`text-xs hover:underline ${darkMode ? 'text-red-400' : 'text-red-500'}`}
                      onClick={() => removeGoal(goal.id)}
                    >
                      הסר
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Debts Section */}
        <div className={`p-4 rounded shadow mb-6 ${
          darkMode ? 'bg-red-900/30' : 'bg-red-50'
        }`}>
          <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-red-400' : 'text-red-700'
          }`}>
            <DollarSign className="w-5 h-5" />
            💳 הלוואות קיימות
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm items-end">
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>שם ההלוואה (למשל: משכנתא, רכב)</label>
              <input
                type="text"
                placeholder="שם ההלוואה"
                className={`p-2 border rounded focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newDebt.name || ''}
                onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>סכום קרן (היתרה הנוכחית להחזר)</label>
              <input
                type="number"
                placeholder="סכום קרן"
                className={`p-2 border rounded focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newDebt.principal ?? ''}
                onChange={(e) => setNewDebt({ ...newDebt, principal: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ריבית שנתית באחוזים</label>
              <input
                type="number"
                placeholder="ריבית %"
                className={`p-2 border rounded focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newDebt.annualRate !== undefined ? newDebt.annualRate * 100 : ''}
                onChange={(e) => setNewDebt({ ...newDebt, annualRate: Number(e.target.value) / 100 })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>מספר חודשי תשלום שנותרו</label>
              <input
                type="number"
                placeholder="חודשים"
                className={`p-2 border rounded focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newDebt.termMonths ?? ''}
                onChange={(e) => setNewDebt({ ...newDebt, termMonths: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>תשלום חודשי מינימלי</label>
              <input
                type="number"
                placeholder="תשלום מינימלי"
                className={`p-2 border rounded focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={newDebt.minPayment ?? ''}
                onChange={(e) => setNewDebt({ ...newDebt, minPayment: Number(e.target.value) })}
              />
            </div>
          </div>

          <button
            className={`mt-3 py-2 px-4 rounded text-sm transition-colors ${
              darkMode 
                ? 'bg-red-700 text-white hover:bg-red-600'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            onClick={addDebt}
            disabled={!newDebt.name || newDebt.principal <= 0 || newDebt.minPayment <= 0}
          >
            ➕ הוסף הלוואה
          </button>
          {/* Display existing debts */}
          {debts.length > 0 && (
            <div className="mt-4">
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>הלוואות קיימות:</h3>
              <div className="space-y-2">
                {debts.map((debt) => (
                  <div key={debt.id} className={`flex justify-between items-center p-2 rounded border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}>
                    <span className={`text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      🏦 {debt.name} - קרן: {formatCurrency(debt.principal)} | 
                      ריבית: {(debt.annualRate * 100).toFixed(1)}% | 
                      תשלום: {formatCurrency(debt.minPayment)}
                    </span>
                    <button
                      className={`text-xs hover:underline ${darkMode ? 'text-red-400' : 'text-red-500'}`}
                      onClick={() => removeDebt(debt.id)}
                    >
                      הסר
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className={`py-3 px-6 rounded transition-colors font-medium ${
            darkMode 
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          הרץ ניתוח 🔍
        </button>

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