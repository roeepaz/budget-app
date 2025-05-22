import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import QuickAddExpenseButton from '../components/QuickAddExpenseButton';
import BudgetAdvisorPage from './BudgetAdvisorPage';
import { useUserData } from '../hooks/useUserData';
import { DollarSign} from 'lucide-react';

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const auth = getAuth();

const {
    categories,
    expenses,
    debts,
    goals,
    loading,
    addExpenseToDB
  } = useUserData(user?.uid);

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate('/'))
      .catch((error) => {
        console.error('Logout failed:', error);
        alert('אירעה שגיאה ביציאה מהמערכת');
      });
  };
   // All possible tags - FIXED: include 'savings'
  const tags = ['need', 'want', 'debt', 'emergency', 'goal', 'savings'];
  
  const tagColors = {
    need:      '#3B82F6', // blue
    want:      '#10B981', // green
    debt:      '#F59E0B', // yellow
    emergency: '#FF6384', // red
    goal:      '#8B5CF6', // purple
    savings:   '#36A2EB'  // light blue
  };
  const displayCategories = [
    ...categories,
    ...debts.map(d => ({
      id: `debt-${d.id}`,
      name: d.name,
      color: tagColors.debt,
      icon: '💳',
      tag: 'debt'
    })),
    ...goals.map(g => ({
      id: `goal-${g.id}`,
      name: g.name,
      color: tagColors.goal,
      icon: '🎯',
      tag: 'goal'
    }))
  ];
  if (loading) {
    return <div>🚀 טוען נתונים…</div>;
  }
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 to-purple-200">
      <div className="relative">
        <button
          onClick={handleLogout}
          className="absolute top-4 left-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition text-sm"
        >
          🔓 התנתק
        </button>
      </div>

      <main className="flex-grow flex items-center justify-center p-6">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight leading-snug">
              ניהול כלכלי חכם<br />
              <span className="text-yellow-500">מאת רועי פז המוכשר 🎓</span>
            </h1>
            <p className="text-lg text-gray-700">שלום, {user.displayName} 👋</p>

            <div className="flex gap-6 flex-wrap justify-center">
              <button
                onClick={() => navigate('/budget')}
                className="text-xl px-8 py-3 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
              >
                ניהול חסכונות 💰
              </button>
              <button
                onClick={() => navigate('/expense')}
                className="text-xl px-8 py-3 rounded-xl bg-green-600 text-white shadow-lg hover:bg-green-700 transition"
              >
                מעקב הוצאות 📊
              </button>
              <QuickAddExpenseButton
                onAddExpense={(expense) => addExpenseToDB(expense)}
                categories={displayCategories}
              />
              <button
                onClick={() => navigate('/budgetPlanner')}
                className="text-lg px-6 py-3 rounded-lg bg-yellow-500 text-gray-900 shadow-md hover:bg-yellow-600 transition duration-300"
              >
                ניהול תקציב 💸
              </button>
               <button
                onClick={() => navigate('/advisor')}
                className="text-lg px-6 py-3 rounded-lg bg-indigo-500 text-white shadow-md hover:bg-indigo-600 transition duration-300 flex items-center gap-2"
              >
                <DollarSign className="w-5 h-5" /> ייעוץ פיננסי חכם
              </button>

            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 bg-gradient-to-tr from-purple-50 to-yellow-50 text-gray-700 text-center rounded-t-xl shadow-inner border-t border-purple-200">
        <p className="text-sm font-medium tracking-wide">
          🎨 ניהול תקציב אישי — <span className="font-bold text-purple-600">רועי פז</span> © 2025
        </p>
      </footer>
    </div>
  );
}