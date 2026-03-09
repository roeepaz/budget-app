import React, { useState, useEffect } from 'react';
import { Target, DollarSign, Plus, Edit2, Trash2, CheckCircle, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Debt, SavingsGoal } from '../type/appTypes';
import { db } from '../firebaseConfig.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import FullPageError from '../components/FullPageError';

interface GoalsAndDebtsTrackerProps {
  user: { uid: string } | null;
  darkMode?: boolean;
}

interface ProgressUpdate {
  id: string;
  amount: number;
  date: string;
  type: 'payment' | 'deposit';
  note?: string;
}

export default function GoalsAndDebtsTracker({ user, darkMode = false }: GoalsAndDebtsTrackerProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'debts'>('goals');

  // Form states
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
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  // Progress update states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressTarget, setProgressTarget] = useState<{ id: string; type: 'goal' | 'debt' } | null>(null);
  const [progressAmount, setProgressAmount] = useState(0);
  const [progressNote, setProgressNote] = useState('');

  const userId = user?.uid;
  const today = new Date().toISOString().split('T')[0];

  // Load data from Firebase
  useEffect(() => {
    if (!userId) return;

    const loadUserData = async () => {
      try {
        const docRef = doc(db, 'financial_data', userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as {
            goals: Array<{
              id: string;
              name: string;
              targetAmount: number;
              currentAmount: number;
              priority: number;
              targetDate: unknown;
              completed?: boolean;
            }>;
            debts: Array<Debt & { currentPrincipal?: number; completed?: boolean }>;
          };

          // נרמול תאריכים למטרות
          const loadedGoals: SavingsGoal[] = (data.goals || []).map(g => ({
            id: g.id,
            name: g.name,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            priority: g.priority,
            completed: g.completed || false,
            targetDate:
              g.targetDate instanceof Timestamp
                ? g.targetDate.toDate()
                : new Date(g.targetDate as string),
          }));

          // טעינת חובות עם מידע נוכחי
          const loadedDebts: (Debt & { currentPrincipal?: number; completed?: boolean })[] = 
            (data.debts || []).map(d => ({
              ...d,
              currentPrincipal: d.currentPrincipal || d.principal,
              completed: d.completed || false,
            }));

          setGoals(loadedGoals);
          setDebts(loadedDebts);
        }
      } catch (error) {
        console.error('שגיאה בטעינת נתונים', error);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  // Save data to Firebase
  useEffect(() => {
    if (!userId || !hasLoaded) return;

    const timeout = setTimeout(() => {
      setDoc(doc(db, 'financial_data', userId), {
        goals,
        debts,
      }, { merge: true });
    }, 800);

    return () => clearTimeout(timeout);
  }, [goals, debts, userId, hasLoaded]);

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`;
  };

  // Calculate progress percentage
  const getGoalProgress = (goal: SavingsGoal) => {
    return Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100);
  };

  const getDebtProgress = (debt: Debt & { currentPrincipal?: number }) => {
    const remaining = debt.currentPrincipal ?? debt.principal;
    return Math.max(((debt.principal - remaining) / debt.principal) * 100, 0);
  };

  // Check if goal/debt is completed
  const isGoalCompleted = (goal: SavingsGoal) => {
    return (goal.currentAmount || 0) >= goal.targetAmount;
  };

  const isDebtCompleted = (debt: Debt & { currentPrincipal?: number }) => {
    return (debt.currentPrincipal ?? debt.principal) <= 0;
  };

  // Add new goal
  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) return;

    if (editingGoalId) {
      // Update existing goal
      setGoals(goals.map(g =>
        g.id === editingGoalId
          ? {
              ...g,
              name: newGoal.name,
              targetAmount: newGoal.targetAmount,
              currentAmount: newGoal.currentAmount,
              targetDate: new Date(newGoal.targetDate),
              priority: newGoal.priority,
            }
          : g
      ));
      setEditingGoalId(null);
    } else {
      // Add new goal
      setGoals([
        ...goals,
        {
          id: Date.now().toString(),
          name: newGoal.name,
          targetAmount: newGoal.targetAmount,
          currentAmount: newGoal.currentAmount,
          targetDate: new Date(newGoal.targetDate),
          priority: newGoal.priority,
          // Removed completed: false since it's not in the type
        },
      ]);
    }

    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 3 });
  };

  // Add new debt
  const addDebt = () => {
    if (!newDebt.name || newDebt.principal <= 0 || newDebt.minPayment <= 0) return;

    if (editingDebtId) {
      // Update existing debt
      const debtData = {
        name: newDebt.name,
        principal: newDebt.principal,
        annualRate: newDebt.annualRate,
        termMonths: newDebt.termMonths,
        minPayment: newDebt.minPayment
      };
      setDebts(debts.map(d =>
        d.id === editingDebtId
          ? { ...d, ...debtData }
          : d
      ));
      setEditingDebtId(null);
    } else {
      // Add new debt
      const debtData = {
        name: newDebt.name || '',
        principal: newDebt.principal || 0,
        annualRate: newDebt.annualRate || 0,
        termMonths: newDebt.termMonths || 1,
        minPayment: newDebt.minPayment || 0
      };
      setDebts([
        ...debts,
        {
          id: Date.now().toString(),
          ...debtData,
        },
      ]);
    }

    setNewDebt({ name: '', principal: 0, annualRate: 0, termMonths: 12, minPayment: 0 });
  };

  // Start editing
  const startEditGoal = (goal: SavingsGoal) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate.toISOString().split('T')[0],
      priority: goal.priority,
    });
  };

  const startEditDebt = (debt: Debt & { currentPrincipal?: number }) => {
    setEditingDebtId(debt.id);
    setNewDebt({
      name: debt.name,
      principal: debt.principal,
      annualRate: debt.annualRate,
      termMonths: debt.termMonths,
      minPayment: debt.minPayment,
    });
  };

  // Update progress
  const updateProgress = () => {
    if (!progressTarget || progressAmount <= 0) return;

    if (progressTarget.type === 'goal') {
        
      setGoals(goals.map(g =>
        g.id === progressTarget.id
          ? { ...g, currentAmount: Math.min((g.currentAmount || 0) + progressAmount, g.targetAmount) }
          : g
      ));
    } else {
      setDebts(debts.map(d =>
        d.id === progressTarget.id
          ? { ...d, currentPrincipal: Math.max(((d as any).currentPrincipal || d.principal) - progressAmount, 0) }
          : d
      ));
    }

    setShowProgressModal(false);
    setProgressTarget(null);
    setProgressAmount(0);
    setProgressNote('');
  };

  // Mark as completed and remove
  const removeItem = (id: string, type: 'goal' | 'debt') => {
    if (type === 'goal') {
      setGoals(goals.filter(g => g.id !== id));
    } else {
      setDebts(debts.filter(d => d.id !== id));
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
  }

  if (!user) {
    return <div>Loading or not authenticated...</div>;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${
            darkMode ? 'text-blue-400' : 'text-blue-700'
          }`}>
            <TrendingUp className="w-8 h-8" />
            מעקב מטרות וחובות
          </h1>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            נהל ועקוב אחר ההתקדמות שלך במטרות החיסכון ופירעון החובות
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'goals'
                ? darkMode
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Target className="w-5 h-5 inline ml-2" />
            מטרות חיסכון ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'debts'
                ? darkMode
                  ? 'bg-red-700 text-white'
                  : 'bg-red-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <DollarSign className="w-5 h-5 inline ml-2" />
            חובות והלוואות ({debts.length})
          </button>
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            {/* Add/Edit Goal Form */}
            <div className={`p-6 rounded-lg shadow ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {editingGoalId ? 'ערוך מטרה' : 'הוסף מטרה חדשה'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>שם המטרה</label>
                  <input
                    type="text"
                    placeholder="חופשה, רכב, דירה..."
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>סכום יעד</label>
                  <input
                    type="number"
                    placeholder="50000"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newGoal.targetAmount || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>סכום נוכחי</label>
                  <input
                    type="number"
                    placeholder="5000"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newGoal.currentAmount || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>תאריך יעד</label>
                  <input
                    type="date"
                    min={today}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>עדיפות</label>
                  <select
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: Number(e.target.value) })}
                  >
                    <option value={1}>נמוכה</option>
                    <option value={2}>בינונית</option>
                    <option value={3}>בינונית-גבוהה</option>
                    <option value={4}>גבוהה</option>
                    <option value={5}>דחופה</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={addGoal}
                    disabled={!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? 'bg-blue-700 text-white hover:bg-blue-600 disabled:bg-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                    }`}
                  >
                    <Plus className="w-5 h-5 inline ml-2" />
                    {editingGoalId ? 'שמור שינויים' : 'הוסף מטרה'}
                  </button>
                </div>
              </div>

              {editingGoalId && (
                <button
                  onClick={() => {
                    setEditingGoalId(null);
                    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 3 });
                  }}
                  className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  ביטול עריכה
                </button>
              )}
            </div>

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal) => {
                const progress = getGoalProgress(goal);
                const isCompleted = isGoalCompleted(goal);
                const daysLeft = Math.ceil((goal.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={goal.id} className={`p-6 rounded-lg shadow transition-all ${
                    isCompleted
                      ? darkMode 
                        ? 'bg-green-900/30 border-2 border-green-500'
                        : 'bg-green-50 border-2 border-green-500'
                      : darkMode 
                        ? 'bg-gray-800 hover:bg-gray-750'
                        : 'bg-white hover:shadow-lg'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {goal.name}
                          {isCompleted && <CheckCircle className="w-5 h-5 text-green-500 inline mr-2" />}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          עדיפות: {['', 'נמוכה', 'בינונית', 'בינונית-גבוהה', 'גבוהה', 'דחופה'][goal.priority]}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditGoal(goal)}
                          className={`p-2 rounded hover:bg-opacity-80 ${
                            darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(goal.id, 'goal')}
                          className={`p-2 rounded hover:bg-opacity-80 ${
                            darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {formatCurrency(goal.currentAmount || 0)} מתוך {formatCurrency(goal.targetAmount)}
                        </span>
                        <span className={`font-medium ${isCompleted ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`w-full bg-gray-200 rounded-full h-3 ${darkMode ? 'bg-gray-700' : ''}`}>
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Date and Status */}
                    <div className="flex justify-between items-center mb-4">
                      <div className={`flex items-center gap-2 text-sm ${
                        daysLeft < 0 
                          ? 'text-red-500' 
                          : daysLeft < 30 
                            ? 'text-orange-500' 
                            : darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        {daysLeft < 0 
                          ? `פג לפני ${Math.abs(daysLeft)} ימים`
                          : `${daysLeft} ימים נותרו`
                        }
                      </div>
                      {!isCompleted && daysLeft < 0 && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>

                    {/* Action Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => {
                          setProgressTarget({ id: goal.id, type: 'goal' });
                          setShowProgressModal(true);
                        }}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          darkMode 
                            ? 'bg-blue-700 text-white hover:bg-blue-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        הוסף כסף למטרה
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Debts Tab */}
        {activeTab === 'debts' && (
          <div className="space-y-6">
            {/* Add/Edit Debt Form */}
            <div className={`p-6 rounded-lg shadow ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {editingDebtId ? 'ערוך חוב' : 'הוסף חוב חדש'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>שם החוב</label>
                  <input
                    type="text"
                    placeholder="משכנתא, הלוואת רכב..."
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newDebt.name}
                    onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>סכום קרן</label>
                  <input
                    type="number"
                    placeholder="100000"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newDebt.principal || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, principal: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>ריבית שנתية (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="4.5"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newDebt.annualRate ? newDebt.annualRate * 100 : ''}
                    onChange={(e) => setNewDebt({ ...newDebt, annualRate: Number(e.target.value) / 100 })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>תקופה (חודשים)</label>
                  <input
                    type="number"
                    placeholder="240"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newDebt.termMonths || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, termMonths: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>תשלום חודשי</label>
                  <input
                    type="number"
                    placeholder="3000"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newDebt.minPayment || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, minPayment: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={addDebt}
                    disabled={!newDebt.name || newDebt.principal <= 0 || newDebt.minPayment <= 0}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? 'bg-red-700 text-white hover:bg-red-600 disabled:bg-gray-700'
                        : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                    }`}
                  >
                    <Plus className="w-5 h-5 inline ml-2" />
                    {editingDebtId ? 'שמור שינויים' : 'הוסף חוב'}
                  </button>
                </div>
              </div>

              {editingDebtId && (
                <button
                  onClick={() => {
                    setEditingDebtId(null);
                    setNewDebt({ name: '', principal: 0, annualRate: 0, termMonths: 12, minPayment: 0 });
                  }}
                  className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  ביטול עריכה
                </button>
              )}
            </div>
                        {/* Debts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {debts.map((debt) => {
                const progress = getDebtProgress(debt);
                const isCompleted = isDebtCompleted(debt);

                return (
                  <div key={debt.id} className={`p-6 rounded-lg shadow transition-all ${
                    isCompleted
                      ? darkMode 
                        ? 'bg-green-900/30 border-2 border-green-500'
                        : 'bg-green-50 border-2 border-green-500'
                      : darkMode 
                        ? 'bg-gray-800 hover:bg-gray-750'
                        : 'bg-white hover:shadow-lg'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {debt.name}
                          {isCompleted && <CheckCircle className="w-5 h-5 text-green-500 inline mr-2" />}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          תשלום חודשי: {formatCurrency(debt.minPayment)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditDebt(debt)}
                          className={`p-2 rounded hover:bg-opacity-80 ${
                            darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(debt.id, 'debt')}
                          className={`p-2 rounded hover:bg-opacity-80 ${
                            darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {formatCurrency(((debt as any).currentPrincipal ?? debt.principal))} מתוך {formatCurrency(debt.principal)}
                        </span>
                        <span className={`font-medium ${isCompleted ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`w-full bg-gray-200 rounded-full h-3 ${darkMode ? 'bg-gray-700' : ''}`}>
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => {
                          setProgressTarget({ id: debt.id, type: 'debt' });
                          setShowProgressModal(true);
                        }}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          darkMode 
                            ? 'bg-red-700 text-white hover:bg-red-600'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        בצע תשלום
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

{showProgressModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
    }`}>
      <h3 className="text-xl font-semibold mb-4 text-center">
        {progressTarget?.type === 'goal' ? 'הוסף כסף למטרה' : 'בצע תשלום על חוב'}
      </h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">סכום</label>
        <input
          type="number"
          className={`w-full p-3 border rounded-lg ${
            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
          }`}
          value={progressAmount || ''}
          onChange={(e) => setProgressAmount(Number(e.target.value))}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">הערה (לא חובה)</label>
        <input
          type="text"
          className={`w-full p-3 border rounded-lg ${
            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
          }`}
          value={progressNote}
          onChange={(e) => setProgressNote(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowProgressModal(false)}
          className={`px-4 py-2 rounded-lg font-medium ${
            darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          ביטול
        </button>
        <button
          onClick={updateProgress}
          disabled={progressAmount <= 0}
          className={`px-4 py-2 rounded-lg font-medium ${
            darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white disabled:bg-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
          }`}
        >
          אישור
        </button>
      </div>
    </div>
  </div>
)}
      </div> {/* סגירת הפנימית של max-w-6xl */}
    </div>
  );
}
