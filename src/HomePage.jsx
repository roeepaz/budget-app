import React from 'react';

export default function HomePage({ onSelect }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <h1 className="text-4xl font-bold mb-10 text-gray-800">ניהול כלכלי מאת רועי פז המוכשר</h1>
      <div className="flex gap-6">
        <button
          onClick={() => onSelect('budget')}
          className="text-2xl px-8 py-4 rounded-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
        >
          Budget App
        </button>
        <button
          onClick={() => onSelect('expense')}
          className="text-2xl px-8 py-4 rounded-lg bg-green-600 text-white shadow-lg hover:bg-green-700 transition"
        >
          Expense Tracker
        </button>
      </div>
    </div>
  );
}
