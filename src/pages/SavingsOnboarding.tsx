import React, { useState, useEffect } from 'react';
import { 
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  setDoc  ,
  doc,
  getDoc  
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  PiggyBank,
  Shield,
  Plus,
  ArrowRight,
  CheckCircle,
  Settings,
  Wallet,
  AlertCircle,
  
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

import {Category ,SavingsGoal, Expense} from '../type/appTypes'
import FullPageError from '../components/FullPageError';
import { useNavigate } from 'react-router-dom';
const formatDate = (ts?: Timestamp): string =>
  ts instanceof Timestamp
    ? ts.toDate().toLocaleDateString('he-IL')   // למשל: "8.6.2025"
    : '';
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);
};

interface NewGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;  // ISO-yyyy-MM-dd
}

export interface OnboardingResult {
  categories: Category[];
  goals: SavingsGoal[];
  totalSavings: number;
  totalGoals: number;
}

export default function SavingsOnboarding({ user }: { user: { uid: string } }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const initialSavingsCategories: Category[] = [];
  const [catsLoading, setCatsLoading] = useState(false);
const [catsError, setCatsError]     = useState<string| null>(null);
  const [savingsCategories, setSavingsCategories] = useState<Category[]>(initialSavingsCategories);
  const [goals, setGoals] = useState<SavingsGoal []>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [financialDocId, setFinancialDocId] = useState<string | null>(null);

const [newGoal, setNewGoal] = useState<NewGoal>({
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
});



useEffect(() => {
  async function load() {
    setCatsLoading(true);
    setCatsError(null);

    try {
      // 1) תביא את כל המסמכים בתת־האוסף categories
      const snap = await getDocs(
        collection(db, 'users', user.uid, 'categories')
      );

      // 2) המר אותם ל־Category[]
      const allCats: Category[] = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        color: d.data().color,
        icon: d.data().icon,
        tag: d.data().tag,
        currentAmount: d.data().currentAmount ?? 0,
        hidden: false,
        docId: d.id,
      }));

      // 3) פילטר לפי התגים הרצויים
      const filtered = allCats.filter(cat =>
        ['emergency', 'savings'].includes(cat.tag)
      );

      // 4) עדכן את ה-state
      setSavingsCategories(filtered);

    } catch (err: any) {
      console.error(err);
      setCatsError('שגיאה בטעינת קטגוריות');
    } finally {
      setCatsLoading(false);
    }
  }

  load();
}, [user.uid]);

useEffect(() => {
  async function loadLegacyGoals() {
    try {
      const colRef = collection(db, 'users', user.uid, 'financial_data');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        setGoals([]);
        return;
      }

      const firstDoc = snap.docs[0];
      setFinancialDocId(firstDoc.id);

      const data = firstDoc.data();
      const raw: any[] = Array.isArray(data.goals) ? data.goals : [];

      const parsed: SavingsGoal[] = raw.map((g, i) => ({
        id: typeof g.id === 'string' ? g.id : `legacy-${i}`,
        name: String(g.name),
        targetAmount: Number(g.targetAmount) || 0,
        currentAmount: Number(g.currentAmount) || 0,
        // אם הגדרת targetDate בתור מחרוזת, המירו ל‐Timestamp
        targetDate:
          typeof g.targetDate === 'string'
            ? new Date(g.targetDate)
            : g.targetDate instanceof Timestamp
            ? g.targetDate.toDate()
            : new Date(),
        // חובה לספק priority לפי ההגדרה ב‐SavingsGoal
        priority: Number(g.priority) || 0,
        // השדות האופציונליים (tag, icon, budget) נשארים undefined
      }));

      setGoals(parsed);
    } catch (err) {
      console.error('Error loading legacy goals:', err);
      setGoals([]);
    }
  }
  loadLegacyGoals();
}, [user.uid]);

 const updateCategoryAmount = async (
    id: string | number,
    amount: number,
    isSelected: boolean
  ) => {
    // update local state
    setSavingsCategories(prev =>
      prev.map(cat =>
        cat.id === id
          ? { ...cat, currentAmount: amount, hidden: !isSelected }
          : cat
      )
    );
    // merge ל־Firestore
    const catRef = doc(db, 'users', user.uid, 'categories', String(id));
    await updateDoc(catRef, {
      currentAmount: amount,
      hidden: !isSelected,
    });
  };

  // 2. כשמוסיפים או מוחקים מטרה – כבר יש updateDoc בשורת ה-saveGoalsField
  const saveGoalsField = async (updatedGoals: SavingsGoal[]) => {
    if (!financialDocId) return;
    const ref = doc(db, 'users', user.uid, 'financial_data', financialDocId);
    // merge רק לשדה goals במסמך, השאר נשמרים
    await updateDoc(ref, { goals: updatedGoals });
  };

const addGoal = async () => {
  if (!newGoal.name || newGoal.targetAmount <= 0) return;

  const created: SavingsGoal = {
    id: Date.now().toString(),
    name: newGoal.name,
    targetAmount: newGoal.targetAmount,
    currentAmount: newGoal.currentAmount,
    // ממירים מחרוזת ל־Timestamp; אם לא הוזן תאריך – משתמשים ב־now()
    targetDate: newGoal.targetDate
      ? new Date(newGoal.targetDate)
      : new Date(),
    // חובה: ערך ברירת מחדל
    priority: 0,
    // שדות אופציונליים ישארו undefined
  };

  const updated = [...goals, created];
  setGoals(updated);
  await saveGoalsField(updated);

  // איפוס ה־form
  setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '' });
};

  // 4. מחיקת מטרה: מסנן ב-state ואז שומר שדה goals כולו
  const removeGoal = async (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    await saveGoalsField(updated);
  };


 const handleComplete = async () => {
    // 1) חישוב סכומים (אופציונלי אם לא צריכים להשתמש בהם כאן)
    const activeCategories = savingsCategories.filter(cat => !cat.hidden);
    const totalSavings = activeCategories.reduce(
      (sum, cat) => sum + (cat.currentAmount ?? 0),
      0
    );
    const totalGoals = goals.reduce(
      (sum, goal) => sum + (goal.currentAmount ?? 0),
      0
    );

    // 2) עדכון כל קטגוריה בתת־הקולקשן 'categories'
    await Promise.all(
      savingsCategories.map(cat => {
        const catDocId = cat.docId ?? String(cat.id);
        const ref = doc(
          db,
          'users',
          user.uid,
          'categories',
          catDocId
        );
        return updateDoc(ref, {
          currentAmount: cat.currentAmount ?? 0,
          hidden: cat.hidden
        });
      })
    );

    // 3) עדכון מטרות ב־'financial_data/{docId}' (merge של השדה 'goals')
    if (financialDocId) {
      const goalsRef = doc(
        db,
        'users',
        user.uid,
        'financial_data',
        financialDocId
      );
      await updateDoc(goalsRef, { goals });
    }
    await setDoc(doc(db, 'income_update', user.uid), {
      onboardingStep: 'done'
    }, { merge: true });
    // 4) ניווט לדשבורד
    navigate('/advisor');
  };

const totalAmount =
  savingsCategories
    .filter(cat => !cat.hidden)
    .reduce((sum, cat) => sum + (cat.currentAmount ?? 0), 0)
  + goals.reduce((sum, goal) => sum + (goal.currentAmount ?? 0), 0);
if (catsLoading)  return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">🚀 טוען נתונים…</p>
        </div>
      </div>
    );
if (catsError)    return <FullPageError
        title={catsError}
        description={'לא הצלחנו לטעות את הנתונים, נסה שוב מאוחר יותר'}
        severity={'error'}
      />    ;

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ברוכים הבאים לניהול החסכונות!</h1>
            <p className="text-gray-600">ספרו לנו על היתרה הנוחכית בחסכונות שלכם!</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <span className="text-sm font-medium">הגדרת חסכונות קיימים</span>
            </div>
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">2</div>
              <span className="text-sm text-gray-500">הגדרת מטרות חיסכון</span>
            </div>
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">3</div>
              <span className="text-sm text-gray-500">סיכום והשלמה</span>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
          >
            <span>בואו נתחיל</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">חסכונות קיימים</h2>
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500">
                  <span>שלב 1 מתוך 3</span>
                </div>
              </div>
              <p className="text-gray-600">סמנו את סוגי החסכונות שיש לכם כרגע והזינו את הסכומים</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {savingsCategories.map(category => (
                <div
                  key={category.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    !category.hidden
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!category.hidden}
                        onChange={e =>
                          updateCategoryAmount(
                            category.id,
                            category.currentAmount ?? 0,
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {!category.hidden && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        סכום נוכחי
                      </label>
                      <input
                        type="number"
                        value={category.currentAmount ?? ''}
                        onChange={e =>
                          updateCategoryAmount(
                            category.id,
                            parseFloat(e.target.value) || 0,
                            true
                          )
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="הזן סכום..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">סה"כ חסכונות נוכחיים:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    savingsCategories
                      .filter(c => !c.hidden)                                  // בחר רק נבחרות
                      .reduce((sum, c) => sum + (c.currentAmount ?? 0), 0)      // סכום currentAmount
                  )}
                </span>
              </div>
            </div>
         <div className="flex justify-between items-center pt-6">
        <button
          onClick={() => navigate('/advisor')}
          className="flex items-center space-x-2 rtl:space-x-reverse text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>צריך להוסיף קטגוריות חדשות?</span>
        </button>

        <button
          onClick={() => setStep(3)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
        >
          <span>המשך</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">מטרות חיסכון</h2>
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500">
                  <span>שלב 2 מתוך 3</span>
                </div>
              </div>
              <p className="text-gray-600">הוסיפו מטרות חיסכון שאתם רוצים להשיג (אופציונלי)</p>
              <p className="text-gray-600">עליהם תספרו בשלב הבא, קצת סבלנות</p>
            </div>
{/*
            <div className="mb-6">
              {goals.length > 0 ? (
                <div className="space-y-4 mb-6">
                 {goals.map(goal => {
                    // ברירת מחדל ל־currentAmount
                    const current = goal.currentAmount ?? 0;
                    // המרת תאריך
                    const dateStr = formatDate(goal.targetDate);

                    return (
                      <div
                        key={goal.id}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-medium">{goal.name}</h3>
                          <p className="text-sm text-gray-600">
                            יעד: {formatCurrency(goal.targetAmount)} | נוכחי: {formatCurrency(current)}
                          </p>
                          {dateStr && (
                            <p className="text-sm text-gray-500">עד תאריך: {dateStr}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeGoal(goal.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>עדיין לא הוספתם מטרות חיסכון</p>
                </div>
              )}

              {!showGoalForm ? (
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Plus className="w-5 h-5" />
                  <span>הוסף מטרת חיסכון</span>
                </button>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם המטרה</label>
                    <input
                      type="text"
                      value={newGoal.name}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="למשל: חופשה, רכב חדש..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סכום יעד</label>
                      <input
                        type="number"
                        value={newGoal.targetAmount || ''}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סכום נוכחי</label>
                      <input
                        type="number"
                        value={newGoal.currentAmount || ''}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, currentAmount: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך יעד (אופציונלי)</label>
                    <input
                      type="date"
                      value={newGoal.targetDate}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                    <button
                      onClick={() => setShowGoalForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={addGoal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      הוסף מטרה
                    </button>
                  </div>
                </div>
              )}
            </div>
            */}

            <div className="flex justify-between items-center pt-6 border-t">
              <button
                onClick={() => setStep(2)}
                className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
              >
                <span>חזור</span>
              </button>
              
              <button
                onClick={() => setStep(4)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
              >
                <span>המשך</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
  // רק הקטגוריות שלא מוסתרים
  const activeCategories = savingsCategories.filter(cat => !cat.hidden);

  // סכום החסכונות מתוך currentAmount (או 0 אם undefined)
  const totalSavings = activeCategories.reduce(
    (sum, cat) => sum + (cat.currentAmount ?? 0),
    0
  );

  // סכום כל המטרות מתוך currentAmount (או 0 אם undefined)
  const totalGoals = goals.reduce(
    (sum, goal) => sum + (goal.currentAmount ?? 0),
    0
  );

  // סכום כולל
  const grandTotal = totalSavings + totalGoals;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">מעולה! סיימנו את ההגדרה</h2>
            <p className="text-gray-600">הנה סיכום של המצב הכספי שלכם</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* חסכונות */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <PiggyBank className="w-5 h-5 ml-2" />
                חסכונות קיימים
              </h3>
              {activeCategories.length > 0 ? (
                <div className="space-y-3">
                  {activeCategories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center">
                      <span className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                      <span className="font-medium">
                        {formatCurrency(cat.currentAmount ?? 0)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 font-bold text-lg">
                    סה"כ: {formatCurrency(totalSavings)}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">לא הוגדרו חסכונות</p>
              )}
            </div>

            {/* מטרות */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <Wallet className="w-5 h-5 ml-2" />
                מטרות חיסכון
              </h3>
              {goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.map(goal => {
                    const current = goal.currentAmount ?? 0;
                    const percent = goal.targetAmount
                      ? Math.min(100, (current / goal.targetAmount) * 100)
                      : 0;

                    return (
                      <div key={goal.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-sm">
                            {formatCurrency(current)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-3 font-bold text-lg">
                    סה"כ: {formatCurrency(totalGoals)}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">לא הוגדרו מטרות</p>
              )}
            </div>
          </div>

          {/* סיכום כולל */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center mb-8">
            <h3 className="text-xl font-bold mb-2">סה"כ נכסים פיננסיים</h3>
            <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(3)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              חזור לעריכה
            </button>

            <button
              onClick={handleComplete}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
            >
              <CheckCircle className="w-5 h-5" />
              <span>התחל להשתמש במערכת</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  return null;
}