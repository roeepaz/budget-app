import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <h1 className="text-4xl font-bold mb-10 text-gray-800 text-center">
        ניהול כלכלי חכם<br />מאת רועי פז המוכשר 🎓
      </h1>

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
