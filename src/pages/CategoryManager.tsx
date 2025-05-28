import { useState, useEffect, useMemo, use } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useLocation } from 'react-router-dom';
import { Category, CategoryTag, Expense } from '../type/appTypes';
import Sidebar from '../components/Sidebar';
import { useUserData } from '../hooks/useUserData';

export default function CategoryManager() {
  const location = useLocation();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

const {
  categories,
  expenses,
  debts,
  goals,
  loading,
  setCategories,
  setExpenses,
  setDebts,
  setGoals,
  setLoading,
  setHasLoaded,
  addExpenseToDB
} = useUserData(userId);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    icon: '📊',
    tag: 'need'
  });

  const iconOptions = [
    { value: '🍔', label: '🍔 אוכל' },
    { value: '🏠', label: '🏠 דיור' },
    { value: '🚗', label: '🚗 תחבורה' },
    { value: '💡', label: '💡 שירותים' },
    { value: '🎬', label: '🎬 בידור' },
    { value: '💊', label: '💊 בריאות' },
    { value: '👕', label: '👕 ביגוד' },
    { value: '📚', label: '📚 חינוך' },
    { value: '💰', label: '💰 חיסכון' },
    { value: '🧒', label: '🧒 ילדים' },
    { value: '🛡️', label: '🛡️ ביטחון' },
    { value: '🎯', label: '🎯 מטרות' },
    { value: '💳', label: '💳 חובות' },
    { value: '📊', label: '📊 אחר' }
  ];

  const tagNames: Record<CategoryTag, string> = {
    need: 'צרכים',
    want: 'רצונות',
    debt: 'חובות',
    emergency: 'קרן חירום',
    goal: 'מטרות',
    savings: 'חסכונות'
  };

  // צבעי רקע עדינים לכל תיוג
  const tagBackgroundColors: Record<CategoryTag, string> = {
    need: 'bg-blue-50 border-blue-100',
    want: 'bg-emerald-50 border-emerald-100',
    debt: 'bg-amber-50 border-amber-100',
    emergency: 'bg-red-50 border-red-100',
    goal: 'bg-purple-50 border-purple-100',
    savings: 'bg-cyan-50 border-cyan-100'
  };

  // צבעי כותרת לכל תיוג
  const tagHeaderColors: Record<CategoryTag, string> = {
    need: 'text-blue-700 border-blue-200',
    want: 'text-emerald-700 border-emerald-200',
    debt: 'text-amber-700 border-amber-200',
    emergency: 'text-red-700 border-red-200',
    goal: 'text-purple-700 border-purple-200',
    savings: 'text-cyan-700 border-cyan-200'
  };

  const visibleCategories = useMemo(() => categories.filter(c => !c.hidden), [categories]);

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;

    const isSavingType = newCategory.tag === 'savings' || newCategory.tag === 'emergency';

    const cat: Category = {
      id: Date.now(),
      name: newCategory.name,
      color: newCategory.color,
      icon: newCategory.icon,
      tag: newCategory.tag,
      ...(isSavingType && { currentAmount: 0 })
    };
    setCategories(prev => [...prev, cat]);
    saveCategoriesToDB(userId!, [...categories, cat]);

    resetCategoryForm();
  };

  const handleUpdateCategory = () => {
    if (!selectedCategoryId || !newCategory.name.trim()) return;

    const updatedCategory: Category = {
  ...newCategory,
  id: Number(selectedCategoryId),
  currentAmount: ['savings', 'emergency'].includes(newCategory.tag) ? 0 : undefined
};
    const updatedList = categories.map(cat =>
  cat.id === Number(selectedCategoryId) ? updatedCategory : cat
);

setCategories(updatedList);
saveCategoriesToDB(userId!, updatedList);


    resetCategoryForm();
  };

  const handleDeleteCategory = (categoryId: string | number) => {
    const confirmMsg = expenses.some(exp => exp.categoryId === categoryId)
      ? 'קטגוריה זו מכילה הוצאות. האם להסתיר?' : 'האם להסיר את הקטגוריה?';

    if (!confirm(confirmMsg)) return;

    const updated = categories.map(cat =>
      cat.id === categoryId ? { ...cat, hidden: true } : cat
    );
    setCategories(updated);
    saveCategoriesToDB(userId!, updated);

  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategoryId(String(category.id));
    setNewCategory({
      name: category.name,
      color: category.color,
      icon: category.icon,
      tag: category.tag
    });
  };

  const resetCategoryForm = () => {
    setSelectedCategoryId('');
    setNewCategory({
      name: '',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      icon: '📊',
      tag: 'need'
    });
  };
const handleCancelEdit = () => {
  setSelectedCategoryId('');
  setNewCategory({
    name: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    icon: '📊',
    tag: 'need',
  });
};
const saveCategoriesToDB = async (userId: string, categories: Category[]) => {
  if (!userId) return;

  const cleaned = categories.map(cat => {
    const c = { ...cat };
    Object.keys(c).forEach(k => {
      if (c[k as keyof Category] === undefined) {
        delete c[k as keyof Category];
      }
    });
    return c;
  });

  await setDoc(doc(db, 'users', userId), {
    categories: cleaned
  }, { merge: true });
};

const tags: CategoryTag[] = ['need', 'want', 'debt', 'emergency', 'goal', 'savings'];

const tagColors = {
    need: '#3B82F6',
    want: '#10B981',
    debt: '#F59E0B',
    emergency: '#FF6384',
    goal: '#8B5CF6',
    savings: '#36A2EB'
  };

const displayCategories: Category[] = useMemo(() => [
  ...categories,
  ...debts.map((d): Category => ({
    ...d,
    id: `debt-${d.id}`,
    name: d.name,
    color: tagColors.debt,
    icon: '💳',
    tag: 'debt',
    budget: d.budget ?? 0, // אם אתה לא שומר, אפשר 0
    currentAmount: undefined,
    hidden: false,
  })),
  ...goals.map((g): Category => ({
    ...g,
    id: `goal-${g.id}`,
    name: g.name,
    color: tagColors.goal,
    icon: '🎯',
    tag: 'goal',
    budget: g.budget ?? 0,
    currentAmount: g.currentAmount ?? 0,
    hidden: false,
  }))
], [categories, debts, goals]);


if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">🚀 טוען נתונים…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <Sidebar
        user={{
    uid: user.uid,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined
  }}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        displayCategories={displayCategories}
        addExpenseToDB={addExpenseToDB}
      />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ניהול קטגוריות</h1>
        <p className="text-gray-600 mt-2">הוסף, ערוך ומחק קטגוריות להוצאות שלך</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add / Edit Category Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {selectedCategoryId ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'}
          </h2>

          <div className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הקטגוריה</label>
              <input
                type="text"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="למשל: מכולת, שכירות וכו'"
              />
            </div>

            {/* Tag */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תיוג (מה מייצג הכסף שהולך לקטגוריה זו)
                <br></br>
                *מטרות וחובות עדכן בדף היועץ
              </label>
              <select
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                value={newCategory.tag}
                onChange={(e) => setNewCategory({
                  ...newCategory,
                  tag: e.target.value as CategoryTag
                })}
              >
                <option value="need">צרכים (בסיסיים)</option>
                <option value="want">רצונות (מותרות)</option>
                <option value="emergency">קרן חירום</option>
                <option value="savings">חיסכון כללי</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">צבע</label>
              <input
                type="color"
                className="w-full p-1 h-10 border rounded focus:ring-blue-500 focus:border-blue-500"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אייקון</label>
              <select
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                value={newCategory.icon}
                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              >
                {iconOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>


            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center disabled:bg-gray-400"
                onClick={selectedCategoryId ? handleUpdateCategory : handleAddCategory}
                disabled={!newCategory.name.trim()}
              >
                <Plus className="ml-2 w-4 h-4" />
                {selectedCategoryId ? 'עדכן קטגוריה' : 'הוסף קטגוריה'}
              </button>
              
              {selectedCategoryId && (
                <button
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  onClick={handleCancelEdit}
                >
                  ביטול
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">כל הקטגוריות</h2>
          
          {/* Categories by Tag */}
          {tags.map(tag => {
            const tagCategories = visibleCategories.filter(cat => cat.tag === tag);
            if (tagCategories.length === 0) return null;

            return (
              <div key={tag} className={`mb-6 p-4 rounded-lg border-2 ${tagBackgroundColors[tag]}`}>
                <h3 className={`text-lg font-medium mb-3 pb-2 border-b-2 ${tagHeaderColors[tag]}`}>
                  {tagNames[tag]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {tagCategories.map(category => {
                    const categoryExpenses = expenses.filter(expense => expense.categoryId === category.id);
                    const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                    
                    return (
                      <div 
                        key={category.id} 
                        className="bg-white border rounded-lg p-4 flex flex-col relative group hover:shadow-md transition-shadow"
                        style={{borderRightColor: category.color, borderRightWidth: '4px'}}
                      >
                        {/* Action Buttons */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => handleEditCategory(category)}
                            title="עריכה"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                            onClick={() => handleDeleteCategory(category.id)}
                            title="מחיקה"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center mb-2">
                          <span className="text-2xl ml-2">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        
                        <div className="text-sm text-gray-500 mb-2">
                          {categoryExpenses.length} הוצאות
                        </div>
                        
                        {/* Show current amount for savings/emergency categories */}
                        {(category.tag === 'savings' || category.tag === 'emergency') && (
                          <div className="text-sm text-green-600 mb-2">
                            יתרה נוכחית: ₪{(category.currentAmount || 0).toFixed(2)}
                          </div>
                        )}
                        
                        <div className="mt-auto font-medium">
                          סה"כ הוצאות: ₪{totalAmount.toFixed(2)}
                        </div>
                        
                        {/* Budget information if exists */}
                        {category.budget && (
                          <div className="text-xs text-gray-400 mt-1">
                            תקציב: ₪{category.budget.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Plus className="mx-auto w-12 h-12 mb-2 opacity-50" />
              <p>אין עדיין קטגוריות. הוסף קטגוריה ראשונה!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}