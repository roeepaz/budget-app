import { useContext } from 'react';
import { UserDataContext, UserDataContextType } from '../context/UserDataContext';

export function useUserData(userId: string | null | undefined): UserDataContextType {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}