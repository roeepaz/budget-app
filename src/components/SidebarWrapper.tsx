// components/SidebarWrapper.tsx
import Sidebar from './Sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';
import { useUserData } from '../hooks/useUserData';
import { useState, useMemo } from 'react';
import { Category } from '../type/appTypes';
export default function SidebarWrapper({
  sidebarOpen,
  setSidebarOpen
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const {
    categories,
    debts,
    goals,
    addExpenseToDB
  } = useUserData(userId);

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
    id: `debt-${d.id}`,
    name: d.name,
    icon: '💳',
    tag: 'debt',
    color: tagColors.debt,
    budget: d.budget ?? 0,
    hidden: false
  })),
  ...goals.map((g): Category => ({
    id: `goal-${g.id}`,
    name: g.name,
    icon: '🎯',
    tag: 'goal',
    color: tagColors.goal,
    budget: g.budget ?? 0,
    currentAmount: g.currentAmount ?? 0,
    hidden: false
  }))
], [categories, debts, goals]);


  if (!user) return null;

  return (
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
  );
}
