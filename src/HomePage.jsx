import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate('/'); // חזרה למסך ההתחברות
      })
      .catch((error) => {
        console.error('Logout failed:', error);
        alert('אירעה שגיאה ביציאה מהמערכת');
      });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <h1 className="text-4xl font-bold mb-6 text-gray-800 text-center">
        ניהול כלכלי חכם<br />מאת רועי פז המוכשר 🎓
      </h1>

      <p className="mb-4 text-lg text-gray-700">שלום, {user.displayName} 👋</p>

      <button
        onClick={handleLogout}
        className="mb-6 px-6 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition duration-300"
      >
        🔓 התנתק
      </button>

      <div className="flex gap-8">
        <button
          onClick={() => navigate('/budget')}
          className="text-2xl px-10 py-4 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition duration-300"
        >
          ניהול השקעות 💰
        </button>
        <button
          onClick={() => navigate('/expense')}
          className="text-2xl px-10 py-4 rounded-xl bg-green-600 text-white shadow-lg hover:bg-green-700 transition duration-300"
        >
          מעקב הוצאות 📊
        </button>
      </div>
    </div>
  );
}
