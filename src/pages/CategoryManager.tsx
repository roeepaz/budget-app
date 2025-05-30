import { useState, useEffect, useMemo, use } from 'react';
import { Plus, Trash2, Edit3,Wallet, Calculator,Menu } from 'lucide-react';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useLocation } from 'react-router-dom';
import { Category, CategoryTag, Expense } from '../type/appTypes';
import Sidebar from '../components/Sidebar';
import { useUserData } from '../hooks/useUserData';
import { useNavigate } from 'react-router-dom';
export default function CategoryManager() {
  const location = useLocation();
  const [user] = useAuthState(auth);
  const userId = user?.uid;
  const navigate = useNavigate();
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
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4" dir="rtl">
    
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
  <header>
    

  <div className="flex justify-between items-center mb-8">
    {/* Logo + Title */}
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
        <Wallet className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          kesefy
        </h1>
        <p className="text-sm text-gray-600 font-medium">מנהל הכספים האישיים שלך</p>
      </div>
    </div>

    {/* כפתור תפריט (אם נדרש) */}
    <button 
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="md:hidden p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
    >
      <Menu className="w-6 h-6 text-gray-600" />
    </button>
  </div>

      </header>
    
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* כפתור צף לבניית תקציב - להוסיף לפני סגירת ה-div הראשי */}
      <div className="fixed top-20 left-6 z-50">
        <button
          onClick={() => navigate('/advisor')}
          className="group relative bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-3xl flex items-center space-x-3 animate-pulse hover:animate-none"
        >
          {/* אייקון */}
          <div className="bg-white/20 rounded-full p-2">
            <Calculator className="w-6 h-6" />
          </div>
          
          {/* טקסט */}
          <span className="text-lg whitespace-nowrap">בואו נבנה תקציב!</span>
          
          {/* חץ מנופנף */}
          <div className="transform transition-transform duration-300 group-hover:translate-x-1">
            <span className="text-xl">🚀</span>
          </div>
          
          {/* אפקט זוהר */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          
          {/* עיגולים מתרחבים */}
          <div className="absolute inset-0 rounded-full border-2 border-green-300 opacity-30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
        </button>
        
        {/* טולטיפ */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-gray-800 text-white text-sm py-2 px-3 rounded-lg whitespace-nowrap shadow-lg">
            מוכנים לבנות את התקציב החכם שלכם?
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      </div>
      {/* Add / Edit Category Form */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          {selectedCategoryId ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'}
        </h2>

        <div className="space-y-5">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם הקטגוריה</label>
            <input
              type="text"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="למשל: מכולת, שכירות וכו'"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              תיוג (מה מייצג הכסף שהולך לקטגוריה זו)
              <span className="block text-xs text-amber-600 mt-1 font-normal">
                *מטרות וחובות עדכן בדף היועץ
              </span>
            </label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
              value={newCategory.tag}
              onChange={(e) => setNewCategory({
                ...newCategory,
                tag: e.target.value as CategoryTag
              })}
            >
              <option value="need">🏠 צרכים (בסיסיים)</option>
              <option value="want">✨ רצונות (מותרות)</option>
              <option value="emergency">🚨 קרן חירום</option>
              <option value="savings">💰 חיסכון כללי</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">צבע</label>
            <input
              type="color"
              className="w-full p-2 h-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer"
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50"
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
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 flex items-center justify-center disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg font-medium"
              onClick={selectedCategoryId ? handleUpdateCategory : handleAddCategory}
              disabled={!newCategory.name.trim()}
            >
              <Plus className="ml-2 w-4 h-4" />
              {selectedCategoryId ? 'עדכן קטגוריה' : 'הוסף קטגוריה'}
            </button>
            
            {selectedCategoryId && (
              <button
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                onClick={handleCancelEdit}
              >
                ביטול
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 lg:col-span-2">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-blue-600 rounded-full"></div>
          כל הקטגוריות
        </h2>
        
        {/* Categories by Tag */}
        {tags.map(tag => {
          const tagCategories = visibleCategories.filter(cat => cat.tag === tag);
          if (tagCategories.length === 0) return null;

          const tagStyles = {
            need: {
              background: 'bg-gradient-to-r from-blue-50 to-indigo-50',
              border: 'border-blue-200',
              header: 'text-blue-800 border-blue-200',
              icon: '🏠'
            },
            want: {
              background: 'bg-gradient-to-r from-purple-50 to-pink-50',
              border: 'border-purple-200',
              header: 'text-purple-800 border-purple-200',
              icon: '✨'
            },
            emergency: {
              background: 'bg-gradient-to-r from-red-50 to-orange-50',
              border: 'border-red-200',
              header: 'text-red-800 border-red-200',
              icon: '🚨'
            },
            savings: {
              background: 'bg-gradient-to-r from-green-50 to-emerald-50',
              border: 'border-green-200',
              header: 'text-green-800 border-green-200',
              icon: '💰'
            },
             debt: { background: '...', border: '...', header: '...', icon: '...' },
              goal: { background: '...', border: '...', header: '...', icon: '...' }
          };

          const style = tagStyles[tag];

          return (
            <div key={tag} className={`mb-8 p-6 rounded-2xl border-2 ${style.background} ${style.border} shadow-sm`}>
              <h3 className={`text-lg font-bold mb-4 pb-3 border-b-2 ${style.header} flex items-center gap-2`}>
                <span className="text-xl">{style.icon}</span>
                {tagNames[tag]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {tagCategories.map(category => {
                  const categoryExpenses = expenses.filter(expense => expense.categoryId === category.id);
                  const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                  
                  return (
                    <div 
                      key={category.id} 
                      className="bg-white/70 backdrop-blur-sm border-2 border-white/50 rounded-xl p-4 flex flex-col relative group hover:shadow-lg hover:bg-white/90 transition-all duration-300"
                      style={{borderRightColor: category.color, borderRightWidth: '4px'}}
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2">
                        <button
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md transition-all duration-200"
                          onClick={() => handleEditCategory(category)}
                          title="עריכה"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all duration-200"
                          onClick={() => handleDeleteCategory(category.id)}
                          title="מחיקה"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center mb-3">
                        <span className="text-2xl ml-3">{category.icon}</span>
                        <span className="font-semibold text-gray-800">{category.name}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        {categoryExpenses.length} הוצאות
                      </div>
                      
                      {/* Show current amount for savings/emergency categories */}
                      {(category.tag === 'savings' || category.tag === 'emergency') && (
                        <div className="text-sm text-green-700 mb-2 bg-green-100 px-2 py-1 rounded-lg">
                          יתרה נוכחית: ₪{(category.currentAmount || 0).toFixed(2)}
                        </div>
                      )}
                      
                      <div className="mt-auto font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">
                        סה"כ הוצאות: ₪{totalAmount.toFixed(2)}
                      </div>
                      
                      {/* Budget information if exists */}
                      {category.budget && (
                        <div className="text-xs text-gray-500 mt-2 bg-yellow-50 px-2 py-1 rounded-lg">
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
          <div className="text-center py-12 text-gray-500">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium">אין עדיין קטגוריות</p>
            <p className="text-sm">הוסף קטגוריה ראשונה כדי להתחיל!</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
}