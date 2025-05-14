import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BudgetApp from './BudgetApp';
import ExpenseTracker from './ExpenseTracke'; // שים לב לשם הקובץ!
import HomePage from './HomePage';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/budget" element={<BudgetApp />} />
      <Route path="/expense" element={<ExpenseTracker />} />
    </Routes>
  </BrowserRouter>
);
