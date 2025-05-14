import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BudgetApp from './BudgetApp';
import ExpenseTracker from './home';
import HomePage from './homePage';

const container = document.getElementById('root');
const root = createRoot(container);

function AppRouter() {
  const [selectedApp, setSelectedApp] = useState(null);

  if (selectedApp === 'budget') return <BudgetApp />;
  if (selectedApp === 'expense') return <ExpenseTracker />;

  return <HomePage onSelect={setSelectedApp} />;
}

root.render(<AppRouter />);
