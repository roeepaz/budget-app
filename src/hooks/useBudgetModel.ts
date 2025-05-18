import React, { useMemo } from 'react';

// --- Types ---
export interface Debt {
  id: string;
  name: string;
  principal: number;       
  annualRate: number;      
  termMonths: number;      
  minPayment: number;      
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;  
  targetDate: Date;
  priority: number;        
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

export function useBudgetModel(inputs: BudgetInputs | null): BudgetResult | null {
  return useMemo(() => {
    if (!inputs) return null;

    const {
      income,
      needs,
      wants,
      debts,
      emergencyFund,
      emergencyTargetMonths,
      currentSavings,
      savingsGoals,
      currency = '$'
    } = inputs;

    // Validation
    if (income <= 0) {
      throw new Error('Income must be positive');
    }

  
     // --- Step 1: Calculate available cash for allocation ---
    const totalMinPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);
    const fixedExpenses       = needs + totalMinPayments;
    const availableForAllocation =
      income - fixedExpenses - currentSavings;

    // --- Step 2: Calculate key ratios ---
    const debtServiceRatio   = totalMinPayments / income;
    const freeCashRatio      = availableForAllocation / income;
    const emergencyTarget    = needs * emergencyTargetMonths;
    const emergencyFundRatio = emergencyTarget > 0
      ? Math.min(1, emergencyFund / emergencyTarget)
      : 1;
    const savingsRatio       = currentSavings / income;

    // --- Step 3: Calculate health score (0-100) ---
    const healthScore = Math.max(0, Math.min(100,
      (freeCashRatio >= 0.2 ? 25 : freeCashRatio * 125) +
      (debtServiceRatio <= 0.36
        ? 25
        : Math.max(0, 25 - (debtServiceRatio - 0.36) * 100)
      ) +
      (emergencyFundRatio * 25) +
      (savingsRatio >= 0.2 ? 25 : savingsRatio * 125)
    ));

    // --- Step 4: Emergency fund allocation ---
    const emergencyFundGap = Math.max(0, emergencyTarget - emergencyFund);
    let emergencyFundMonthly = 0;
    if (emergencyFundGap > 0 && emergencyFundRatio < 1) {
      const urgencyFactor = emergencyFundRatio < 0.25 ? 0.4 : 0.2;
      emergencyFundMonthly = Math.min(
        emergencyFundGap,
        availableForAllocation * urgencyFactor
      );
    }

    // --- Step 5: Debt allocation (avalanche) ---
    const debtAllocations: DebtAllocation[] = debts
      .sort((a, b) => b.annualRate - a.annualRate)
      .map(d => ({
        id: d.id,
        name: d.name,
        minPayment: d.minPayment,
        extraPayment: 0,
        totalPayment: d.minPayment,
        payoffMonths: calculatePayoffMonths(
          d.principal,
          d.minPayment,
          d.annualRate
        )
      }));

    let remainingForDebt       = Math.max(0, availableForAllocation - emergencyFundMonthly);
    let totalExtraDebtPayment  = 0;

    if (debtAllocations.length > 0) {
      const debtExtraFactor       = debtServiceRatio > 0.36 ? 0.6 : 0.3;
      totalExtraDebtPayment       = remainingForDebt * debtExtraFactor;
      const top                   = debtAllocations[0];
      top.extraPayment            = totalExtraDebtPayment;
      top.totalPayment            = top.minPayment + totalExtraDebtPayment;
      top.payoffMonths            = calculatePayoffMonths(
        debts.find(d => d.id === top.id)!.principal,
        top.totalPayment,
        debts.find(d => d.id === top.id)!.annualRate
      );
    }

    const remainingAfterDebt = remainingForDebt - totalExtraDebtPayment;

    // --- Step 6: Savings goals allocation ---
    let remaining = remainingAfterDebt;
    const goalAllocations: GoalAllocation[] = savingsGoals
      .map(g => {
        const current      = g.currentAmount ?? 0;
        const needed       = Math.max(0, g.targetAmount - current);
        const monthsToTarget = Math.max(1, getMonthsBetween(new Date(), g.targetDate));
        return {
          id: g.id,
          name: g.name,
          requiredMonthly: needed / monthsToTarget,
          allocatedMonthly: 0,
          shortfall: 0,
          onTrack: false
        };
      })
      .sort((a, b) => {
        const pa = savingsGoals.find(g => g.id === a.id)!.priority;
        const pb = savingsGoals.find(g => g.id === b.id)!.priority;
        return pb - pa;
      });

    for (const alloc of goalAllocations) {
      const give               = Math.min(alloc.requiredMonthly, remaining);
      alloc.allocatedMonthly   = give;
      alloc.shortfall          = alloc.requiredMonthly - give;
      alloc.onTrack            = alloc.shortfall <= 0.01;
      remaining               -= give;
      if (remaining <= 0) break;
    }

    // --- Step 7: General savings & discretionary spending ---
    const generalSavings         = remaining * 0.3;
    const discretionarySpending  = Math.max(0, remaining - generalSavings);
    // --- Step 8: Recommendations & warnings ---
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (debtServiceRatio > 0.36) {
      warnings.push(`High debt ratio (${(debtServiceRatio*100).toFixed(1)}%). Consider consolidation or boosting income.`);
    }
    if (debtAllocations.length) {
      recommendations.push(`Focus extra payment on "${debtAllocations[0].name}".`);
    }
    if (emergencyFundRatio < 0.5) {
      warnings.push(`Emergency fund critically low (${(emergencyFundRatio*100).toFixed(1)}%).`);
    } else if (emergencyFundRatio < 1) {
      recommendations.push(`Continue building emergency fund toward ${currency}${emergencyTarget}.`);
    }
    goalAllocations.forEach(g => {
      if (!g.onTrack) {
        warnings.push(`"${g.name}" underfunded by ${(g.shortfall/g.requiredMonthly*100).toFixed(0)}%.`);
      }
    });
    if (freeCashRatio < 0.1) {
      warnings.push(`Very tight budget.`);
    } else if (freeCashRatio > 0.4) {
      recommendations.push(`Good cash flow; consider more investments.`);
    }
    if (savingsRatio < 0.1) {
      recommendations.push(`Aim to save at least 10% of income.`);
    }

    return {
      availableForAllocation,
      ratios: {
        debtServiceRatio,
        freeCashRatio,
        emergencyFundRatio,
        savingsRatio,
        healthScore
      },
      allocations: {
        debtAllocations,
        emergencyFundMonthly,
        emergencyFundGap,
        generalSavings,
        goalAllocations,
        discretionarySpending
      },
      recommendations,
      warnings
    };
  }, [inputs]);
}

// Helpers
function calculatePayoffMonths(principal: number, payment: number, annualRate: number): number {
  if (annualRate === 0) return Math.ceil(principal / payment);
  const r = annualRate / 12;
  return Math.ceil(-Math.log(1 - (principal * r) / payment) / Math.log(1 + r));
}

function getMonthsBetween(start: Date, end: Date): number {
  return Math.max(1,
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}
