import React from 'react';
import { ChevronLeft, Target, Shield, PiggyBank, CreditCard, TrendingUp, Calculator, Brain, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SmartBudgetLanding = () => {
      const navigate = useNavigate();
    
  const handleNavigateToCategories = () => {
    // כאן תוכל להוסיף ניווט לדף הקטגוריות
      navigate('/categoryManager');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* כותרת ראשית */}
        <div className="text-center mb-12 pt-8">
          <div className="bg-white rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Calculator className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            ברוכים הבאים לניהול התקציב החכם שלכם!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            אני כאן בשבילכם - לעזור לכם לקחת שליטה מלאה על הכספים שלכם ולבנות עתיד כלכלי יציב ומאוזן
          </p>
        </div>

        {/* הסבר על המערכת */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-6">
            <Brain className="w-8 h-8 text-indigo-600 ml-4" />
            <h2 className="text-2xl font-bold text-gray-800">איך אני עוזר לכם?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full p-2 ml-3 mt-1">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">ניתוח תזרים מזומנים</h3>
                  <p className="text-gray-600">אנחנו נבנה יחד מפת תזרים מדויקת של ההכנסות וההוצאות שלכם</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 rounded-full p-2 ml-3 mt-1">
                  <Calculator className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">בניית תקציב חכם</h3>
                  <p className="text-gray-600">על בסיס התזרים שלכם, נבנה תקציב מותאם אישית ומאוזן</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-purple-100 rounded-full p-2 ml-3 mt-1">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">השגת מטרות</h3>
                  <p className="text-gray-600">נעזור לכם להגדיר ולהשיג מטרות כלכליות חשובות</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-orange-100 rounded-full p-2 ml-3 mt-1">
                  <Brain className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">יועץ אוטומטי</h3>
                  <p className="text-gray-600">המערכת תציע המלצות חכמות להטבת המצב הכלכלי שלכם</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* הקטגוריות - הבסיס להכל */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            הקטגוריות שלכם - הבסיס להכל! 🏗️
          </h2>
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-6 mb-6">
            <p className="text-gray-700 text-lg">
              <strong>חשוב לדעת:</strong> הקטגוריות שתגדירו הן הבסיס לכל המערכת שלנו. 
              הן יקבעו איך נבנה את התקציב שלכם, איך נעקוב אחרי ההוצאות, ואיך נכוון אתכם להצלחה כלכלית.
            </p>
          </div>

          {/* סוגי קטגוריות */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* קטגוריות בסיס */}
            <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-red-600 ml-2" />
                <h3 className="font-bold text-red-800">קטגוריות בסיס</h3>
              </div>
              <p className="text-red-700 text-sm mb-3">
                הוצאות חובה שאינן חלק מהתקציב הגמיש - כמו שכר דירה, חשבונות, ביטוח וכו'
              </p>
              <div className="bg-red-100 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ הוצאות אלה נחשבות כהוצאה חובה ונוכו אוטומטי מההכנסה לפני חישוב התקציב
                </p>
              </div>
            </div>

            {/* מותרות */}
            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-purple-600 rounded-full ml-2 flex items-center justify-center">
                  <span className="text-white text-xs">✨</span>
                </div>
                <h3 className="font-bold text-purple-800">מותרות</h3>
              </div>
              <p className="text-purple-700 text-sm">
                בילויים, אוכל במסעדות, קניות לא חיוניות - דברים שמשפרים את איכות החיים
              </p>
            </div>

            {/* קרן חירום */}
            <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-orange-600 ml-2" />
                <h3 className="font-bold text-orange-800">קרן חירום</h3>
              </div>
              <p className="text-orange-700 text-sm">
                הצד הבטוח שלכם - כסף שנשמר למקרי חירום בלתי צפויים
              </p>
            </div>

            {/* חסכונות */}
            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center mb-4">
                <PiggyBank className="w-6 h-6 text-green-600 ml-2" />
                <h3 className="font-bold text-green-800">חסכונות</h3>
              </div>
              <p className="text-green-700 text-sm">
                חסכונות כלליים לעתיד - לטיולים, קניות גדולות או פרישה
              </p>
            </div>

            {/* מטרות */}
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center mb-4">
                <Target className="w-6 h-6 text-blue-600 ml-2" />
                <h3 className="font-bold text-blue-800">מטרות</h3>
              </div>
              <p className="text-blue-700 text-sm">
                מטרות ספציפיות עם סכום ותאריך יעד - כמו קניית רכב או דירה
              </p>
            </div>

            {/* חובות */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <div className="flex items-center mb-4">
                <CreditCard className="w-6 h-6 text-gray-600 ml-2" />
                <h3 className="font-bold text-gray-800">חובות</h3>
              </div>
              <p className="text-gray-700 text-sm">
                חובות קיימים עם תוכנית פירעון - הלוואות, כרטיסי אשראי וכו'
              </p>
            </div>
          </div>
        </div>

        {/* מטרות וחובות - הסבר מפורט */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            מטרות וחובות - המנוע להצלחה שלכם 🎯
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Target className="w-8 h-8 text-blue-600 ml-3" />
                <h3 className="text-xl font-bold text-blue-800">מטרות</h3>
              </div>
              <ul className="space-y-3 text-blue-700">
                <li className="flex items-start">
                  <span className="text-blue-500 ml-2">•</span>
                  הגדירו מטרות ספציפיות עם סכום ותאריך יעד
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 ml-2">•</span>
                  המערכת תחשב כמה צריך לחסוך בחודש
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 ml-2">•</span>
                  מעקב אחרי ההתקדמות וההישגים
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <CreditCard className="w-8 h-8 text-gray-600 ml-3" />
                <h3 className="text-xl font-bold text-gray-800">חובות</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-gray-500 ml-2">•</span>
                  רשמו את כל החובות הקיימים
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 ml-2">•</span>
                  המערכת תכלול החזרים מינימליים בתקציב
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 ml-2">•</span>
                  יועץ לאסטרטגיות פירעון מיטביות
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* תהליך הבנייה */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            איך נבנה את התקציב שלכם? 🔨
          </h2>
          <div className="relative">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-6">
              
              <div className="flex flex-col items-center text-center bg-blue-50 rounded-xl p-6 flex-1">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-xl mb-4">1</div>
                <h3 className="font-bold text-blue-800 mb-2">תזרים מזומנים</h3>
                <p className="text-blue-700 text-sm">נאסוף נתונים על כל ההכנסות וההוצאות הקבועות שלכם</p>
              </div>

              <ArrowLeft className="text-gray-400 hidden md:block" />

              <div className="flex flex-col items-center text-center bg-green-50 rounded-xl p-6 flex-1">
                <div className="bg-green-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-xl mb-4">2</div>
                <h3 className="font-bold text-green-800 mb-2">חישוב יתרה</h3>
                <p className="text-green-700 text-sm">נחשב כמה כסף נותר אחרי הוצאות הבסיס והחזרי חובות</p>
              </div>

              <ArrowLeft className="text-gray-400 hidden md:block" />

              <div className="flex flex-col items-center text-center bg-purple-50 rounded-xl p-6 flex-1">
                <div className="bg-purple-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-xl mb-4">3</div>
                <h3 className="font-bold text-purple-800 mb-2">חלוקה חכמה</h3>
                <p className="text-purple-700 text-sm">נחלק את היתרה בין קטגוריות לפי העדיפויות שלכם</p>
              </div>
            </div>
          </div>
        </div>

        {/* היועץ האוטומטי */}
        <div className="bg-gradient-to-l from-indigo-50 to-blue-50 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-indigo-600 rounded-full p-3 ml-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">היועץ האוטומטי שלכם</h2>
              <p className="text-gray-600">AI חכם שמנתח את המצב שלכם ומציע המלצות מותאמות אישית</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-2">🔍 ניתוח מצב</h3>
              <p className="text-gray-600 text-sm">בודק את התזרים שלכם ומזהה הזדמנויות לשיפור</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-2">💡 המלצות חכמות</h3>
              <p className="text-gray-600 text-sm">מציע איך לחלק את התקציב בצורה המיטבית</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-2">📈 תכנון עתיד</h3>
              <p className="text-gray-600 text-sm">עוזר לתכנן מטרות ולבנות אסטרטגיה כלכלית</p>
            </div>
          </div>
        </div>

        {/* קריאה לפעולה */}
        <div className="bg-gradient-to-l from-indigo-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">מוכנים להתחיל? 🚀</h2>
          <p className="text-xl mb-8 text-blue-100">
            בואו נתחיל בהגדרת הקטגוריות שלכם - הצעד הראשון לשליטה כלכלית מלאה!
          </p>
          <button 
            onClick={handleNavigateToCategories}
            className="bg-white text-indigo-600 font-bold py-4 px-8 rounded-xl text-lg hover:bg-gray-100 transition-colors duration-200 shadow-lg transform hover:scale-105"
          >
            בואו נתחיל - לדף הקטגוריות ←
          </button>
        </div>

        {/* מרווח תחתון */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default SmartBudgetLanding;  