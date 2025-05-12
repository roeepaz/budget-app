import React from 'react';
import { createRoot } from 'react-dom/client';
import BudgetApp from './BudgetApp';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<BudgetApp />);