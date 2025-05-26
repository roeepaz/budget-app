// Sidebar.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import QuickAddExpenseButton from './QuickAddExpenseButton';
import {Expense, Category } from '../type/appTypes';
import {
  DollarSign,
  Menu,
  X,
  Home,
  PieChart as PieIcon,
  TrendingUp,
  Calculator,
  LogOut,
  Wallet,
  LucideIcon,
} from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  current?: boolean;
}

interface SidebarProps {
  user: { displayName?: string };
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  menuItems: MenuItem[];
  displayCategories: Category[];
  addExpenseToDB: (expense: any) => void;
}

export default function Sidebar({
  user,
  sidebarOpen,
  setSidebarOpen,
  menuItems,
  displayCategories,
  addExpenseToDB
}: SidebarProps) {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate('/'))
      .catch((error) => {
        console.error('Logout failed:', error);
        alert('אירעה שגיאה ביציאה מהמערכת');
      });
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 right-4 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>
        
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`
  fixed inset-y-0 right-0 z-50
  w-72 bg-white shadow-2xl
  transform transition-transform duration-300 ease-in-out
  ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
  flex flex-col h-screen
`}>

        <div className="p-6 border-b border-gray-200 bg-gradient-to-l from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">ניהול כלכלי חכם</h2>
              <p className="text-blue-100 text-sm mt-1">שלום, {user.displayName} 👋</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                if (location.pathname !== item.path) {
                  navigate(item.path);
                } else {
                  // אתה כבר בדף הזה – אפשר לגלול לראש העמוד למשל
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right ${
                item.current
                  ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <QuickAddExpenseButton
            onAddExpense={(expense) => addExpenseToDB(expense)}
            categories={displayCategories}
            className="w-full"
          />
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </button>
        </div>
      </div>
    </>
  );
}
