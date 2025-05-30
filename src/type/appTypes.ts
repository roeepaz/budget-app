// --- Types ---
export type CategoryTag = 'need'|'want'|'debt'|'emergency'|'goal' |'savings';
import { Timestamp } from 'firebase/firestore';

export interface Category {
  id: string | number;
  name: string;
  color: string;
  icon: string;
  tag: CategoryTag;
  currentAmount?: number; 
  budget?: number;
  hidden?: boolean;
    docId?: string;

}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  categoryId: string | number; // Allow both string and number for flexibility
  date: string; // ISO yyyy-MM-dd
  docId?: string;
}

export interface ExpenseTrackerProps {
  user: { uid: string } | null;
}
export interface Debt {
  id: string;
  name: string;
  principal: number;       
  annualRate: number;      
  termMonths: number;      
  minPayment: number;
  tag?:CategoryTag;      
  icon?: string;
  budget?:number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;  
  targetDate: Timestamp;
  priority: number;      
  tag?:CategoryTag;
  icon?:string;      
  budget?: number;
  
}

export interface BudgetInputs {
  income: number;          
  needs: number;           
  wants: number;           
  debts: Debt[];
  emergencyFund: number;   
  emergencyTargetMonths: number;
  currentSavings: number;  
  savingsGoals: SavingsGoal[];
  currency?: string;       
}

export interface DebtAllocation {
  id: string;
  name: string;
  minPayment: number;
  extraPayment: number;
  totalPayment: number;
  payoffMonths?: number;
}

export interface GoalAllocation {
  id: string;
  name: string;
  requiredMonthly: number;
  allocatedMonthly: number;
  shortfall: number;
  onTrack: boolean;
}

export interface BudgetResult {
  availableForAllocation: number;
  ratios: {
    debtServiceRatio: number;
    freeCashRatio: number;
    emergencyFundRatio: number;
    savingsRatio: number;
    healthScore: number;
  };
  allocations: {
    debtAllocations: DebtAllocation[];
    emergencyFundMonthly: number;
    emergencyFundGap: number;
    generalSavings: number;
    goalAllocations: GoalAllocation[];
    discretionarySpending: number;
  };
  recommendations: string[];
  warnings: string[];
}

export interface BudgetAdvisorPageProps {
  user: { uid: string } | null;
}
export interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  categoryId: string | number;
  startDate: string;  // "YYYY-MM-DD"
  endDate?: string;   // optional
  dayOfMonth: number; // 1–31
}
