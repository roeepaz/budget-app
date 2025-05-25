import React, { useMemo } from 'react';

// --- Types ---
export interface Debt {
  id: string;
  name: string;
  principal: number;       
  annualRate: number;      
  termMonths: number;      
  minPayment: number;      
  userAllocatedPayment?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;  
  targetDate: Date;
  priority: number;        
  userAllocatedContribution?: number;
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

  
    // --- Step 1: Calculate initial discretionary funds & user-directed allocations ---
    const totalMinPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);
    const fixedExpenses = needs + totalMinPayments; // Expenses including minimum debt payments
    const discretionaryFundsPreUserAllocations = income - fixedExpenses - currentSavings;

    const totalUserAllocatedToDebts = debts.reduce((sum, d) => {
      // Use userAllocatedPayment if it's valid and >= minPayment, otherwise use minPayment
      const payment = (d.userAllocatedPayment !== undefined && d.userAllocatedPayment >= d.minPayment)
        ? d.userAllocatedPayment
        : d.minPayment;
      return sum + payment;
    }, 0);

    const totalUserAllocatedToSavingsGoals = savingsGoals.reduce((sum, g) => {
      return sum + (g.userAllocatedContribution ?? 0);
    }, 0);
    
    // Actual available for further model logic (e.g., general savings, discretionary)
    // This subtracts the *extra* paid to debts (beyond min) and all user-allocated savings
    const availableForAllocation = discretionaryFundsPreUserAllocations -
      (totalUserAllocatedToDebts - totalMinPayments) -
      totalUserAllocatedToSavingsGoals;

    // --- Step 2: Calculate key ratios ---
    // Debt service ratio should reflect actual user-allocated payments towards debts
    const actualDebtPaymentsTotal = debts.reduce((sum, d) => sum + (d.userAllocatedPayment ?? d.minPayment), 0);
    const debtServiceRatio = actualDebtPaymentsTotal / income;
    const freeCashRatio = availableForAllocation / income; // Based on remaining funds after user allocations
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
    // This allocation comes from the `availableForAllocation` which is *after* user-directed payments
    const emergencyFundGap = Math.max(0, emergencyTarget - emergencyFund);
    let emergencyFundMonthly = 0;
    let remainingAfterEmergency = availableForAllocation;

    if (emergencyFundGap > 0 && emergencyFundRatio < 1) {
      const urgencyFactor = emergencyFundRatio < 0.25 ? 0.4 : 0.2; // Prioritize EF if very low
      // Try to fill EF from the remaining availableForAllocation
      emergencyFundMonthly = Math.min(
        emergencyFundGap,
        Math.max(0, availableForAllocation * urgencyFactor) // Ensure non-negative allocation
      );
      remainingAfterEmergency = Math.max(0, availableForAllocation - emergencyFundMonthly);
    }

    // --- Step 5: Debt allocation ---
    // User allocations are prioritized. Model only suggests for unallocated or under-minimum.
    const debtAllocations: DebtAllocation[] = debts
      .sort((a, b) => b.annualRate - a.annualRate)
      .map(d => {
        let totalPayment = d.minPayment;
        if (d.userAllocatedPayment !== undefined && d.userAllocatedPayment >= d.minPayment) {
          totalPayment = d.userAllocatedPayment;
        } else if (d.userAllocatedPayment !== undefined && d.userAllocatedPayment < d.minPayment) {
          // This case will be handled by warnings; for calculation, use minPayment if user is below.
          totalPayment = d.minPayment; 
        }
        
        const extraPayment = totalPayment - d.minPayment;
        return {
          id: d.id,
          name: d.name,
          minPayment: d.minPayment,
          extraPayment: extraPayment,
          totalPayment: totalPayment,
          payoffMonths: calculatePayoffMonths(
            d.principal,
            totalPayment, // Use the determined totalPayment
            d.annualRate
          )
        };
      });

    // Model-driven extra payments are no longer applied directly here as user inputs take precedence.
    // `remainingAfterEmergency` is what's left for general savings/discretionary after user choices and EF.
    const remainingAfterDebt = remainingAfterEmergency; // No model-based debt top-up for now.

    // --- Step 6: Savings goals allocation ---
    // User contributions are prioritized. Model suggests for unallocated goals if funds remain.
    let remaining = remainingAfterDebt; // This is remainingAfterEmergency
    const goalAllocations: GoalAllocation[] = savingsGoals
      .map(g => {
        const current = g.currentAmount ?? 0;
        const needed = Math.max(0, g.targetAmount - current);
        const monthsToTarget = Math.max(1, getMonthsBetween(new Date(), g.targetDate));
        const requiredMonthly = needed / monthsToTarget;
        
        let allocatedMonthly = g.userAllocatedContribution ?? 0; // Prioritize user input
        let shortfall = requiredMonthly - allocatedMonthly;
        let onTrack = shortfall <= 0.01;

        // If user hasn't allocated, and model has funds, model can allocate
        if (g.userAllocatedContribution === undefined || g.userAllocatedContribution === null) {
            // This part is tricky: The problem states model should only apply if userAllocatedContribution is NOT set.
            // However, `availableForAllocation` (now `remaining`) already accounts for user goals.
            // So, if we allocate here, it's from a pool that *should* be for general savings/discretionary.
            // For now, let's assume model *tops up* if user hasn't allocated *enough*, from the remaining general pool.
            // This needs clarification based on desired behavior if user under-allocates but there are funds.
            // Sticking to: "model's current logic ... should only apply if userAllocatedContribution is NOT set"
            // This means if userAllocatedContribution is 0 or undefined, model *could* allocate from `remaining`.
            // If user *has* set a value, that's it.
            // Let's refine: Model will only try to allocate if user hasn't specified *any* contribution.
            if ((g.userAllocatedContribution === undefined || g.userAllocatedContribution === null) && remaining > 0) {
                 const modelGive = Math.min(requiredMonthly, remaining);
                 allocatedMonthly = modelGive; // Model allocates
                 shortfall = requiredMonthly - modelGive;
                 onTrack = shortfall <= 0.01;
                 remaining -= modelGive; // Model allocation consumes from the remaining pool
            } else if (g.userAllocatedContribution !== undefined && g.userAllocatedContribution !== null) {
                // User has allocated. `remaining` was already reduced by `totalUserAllocatedToSavingsGoals`
                // So, no change to `remaining` here based on user's own goal allocation.
            }
        }
        // If user allocated but it's less than required, onTrack and shortfall are already correct based on user's input.
        // If model allocated, it also updated these.

        return {
          id: g.id,
          name: g.name,
          requiredMonthly: requiredMonthly,
          allocatedMonthly: allocatedMonthly,
          shortfall: shortfall,
          onTrack: onTrack
        };
      })
      .sort((a, b) => { // Sort by priority for display or if model were to pick one
        const pa = savingsGoals.find(g => g.id === a.id)!.priority;
        const pb = savingsGoals.find(g => g.id === b.id)!.priority;
        return pb - pa;
      });
    
    // The `remaining` here is after user-directed debt (extra) and savings, and EF.
    // This is the pool for general savings and discretionary spending.
    const generalSavings = remaining * 0.3; // 30% of what's left after all user choices & EF
    const discretionarySpending = Math.max(0, remaining - generalSavings);

    // --- Step 8: Recommendations & warnings ---
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Debt related warnings/recommendations
    debts.forEach(d => {
      if (d.userAllocatedPayment !== undefined && d.userAllocatedPayment < d.minPayment) {
        warnings.push(`Your allocated payment for "${d.name}" (${currency}${d.userAllocatedPayment}) is below the minimum payment of ${currency}${d.minPayment}.`);
      }
    });
    if (debtServiceRatio > 0.36) { // Uses actual total debt payments now
      warnings.push(`High debt ratio (${(debtServiceRatio * 100).toFixed(1)}%). Your total debt payments are high relative to your income.`);
    }
    if (debtAllocations.length > 0) {
        const highestRateDebt = debtAllocations[0]; // Still sorted by rate
        const userAllocForHighest = debts.find(d=>d.id === highestRateDebt.id)?.userAllocatedPayment;
        if (userAllocForHighest !== undefined && userAllocForHighest > highestRateDebt.minPayment) {
             recommendations.push(`You're paying extra on "${highestRateDebt.name}", which is good as it's your highest rate debt! Consider if more is possible.`);
        } else {
            recommendations.push(`Consider allocating extra payments towards "${highestRateDebt.name}" as it has the highest interest rate.`);
        }
    }

    // Emergency fund warnings/recommendations
    if (emergencyFundRatio < 0.5) {
      warnings.push(`Emergency fund critically low (${(emergencyFundRatio * 100).toFixed(1)}% of target ${currency}${emergencyTarget}). Prioritize building this up.`);
    } else if (emergencyFundRatio < 1) {
      recommendations.push(`Continue building emergency fund. Current: ${currency}${emergencyFund}, Target: ${currency}${emergencyTarget}. Model suggests allocating ${currency}${emergencyFundMonthly.toFixed(0)}/month if possible from available funds.`);
    }

    // Savings goal warnings/recommendations
    goalAllocations.forEach(g => {
      if (!g.onTrack) {
         const userContribution = savingsGoals.find(sg => sg.id === g.id)?.userAllocatedContribution;
        if (userContribution !== undefined && userContribution > 0) {
            warnings.push(`"${g.name}" is underfunded. Your current allocation of ${currency}${g.allocatedMonthly.toFixed(0)} is less than the required ${currency}${g.requiredMonthly.toFixed(0)}/month. Shortfall: ${currency}${g.shortfall.toFixed(0)}/month.`);
        } else if (userContribution === undefined || userContribution === 0) {
             warnings.push(`"${g.name}" is not on track and has no user-defined contribution. It requires ${currency}${g.requiredMonthly.toFixed(0)}/month.`);
        }
      }
    });
    
    // Budget tightness warnings/recommendations
    if (freeCashRatio < 0.1 && availableForAllocation < (income * 0.05)) { // freeCashRatio is based on post-user-allocations
      warnings.push(`Very tight budget after your specified allocations. Discretionary spending is less than 5% of income.`);
    } else if (freeCashRatio > 0.3) { // Adjusted threshold as this is post-user-allocations
      recommendations.push(`Good cash flow after your allocations (${currency}${discretionarySpending.toFixed(0)} available for discretionary spending). Consider investing further if not already doing so.`);
    }
    
    // Overall savings ratio (currentSavings + totalUserAllocatedToSavingsGoals + emergencyFundMonthly + generalSavings)
    const totalMonthlySavings = currentSavings + totalUserAllocatedToSavingsGoals + emergencyFundMonthly + generalSavings;
    const totalSavingsRatio = totalMonthlySavings / income;
    if (totalSavingsRatio < 0.1) {
      recommendations.push(`Your overall savings rate is ${(totalSavingsRatio * 100).toFixed(0)}%. Aim to save at least 10-15% of your income, including debt reduction beyond minimums.`);
    }


    return {
      availableForAllocation: availableForAllocation, // This is now what's left for model-driven general/discretionary
      ratios: {
        debtServiceRatio, // Updated to reflect actual debt payments
        freeCashRatio,    // Updated to reflect funds after user allocations
        emergencyFundRatio,
        savingsRatio: totalSavingsRatio, // Updated to reflect total savings activity
        healthScore // Health score will implicitly update due to changes in ratios
      },
      allocations: {
        debtAllocations,        // Now reflects user-set payments primarily
        emergencyFundMonthly,   // Calculated from remaining available funds
        emergencyFundGap,
        generalSavings,         // Calculated from remaining available funds
        goalAllocations,        // Reflects user-set contributions primarily
        discretionarySpending   // Calculated from remaining available funds
      },
      recommendations,
      warnings
    };
  }, [inputs]);
}

// Helpers
function calculatePayoffMonths(principal: number, payment: number, annualRate: number): number {
  if (payment <= 0) return Infinity; // Avoid division by zero or log errors if payment is zero/negative
  if (principal <= 0) return 0; // Already paid off
  if (annualRate === 0) return Math.ceil(principal / payment);
  
  const monthlyRate = annualRate / 12;
  // If payment doesn't cover interest, it will never be paid off
  if (payment <= principal * monthlyRate) return Infinity; 

  // Standard loan amortization formula for number of payments (n)
  // n = -ln(1 - (P * r) / M) / ln(1 + r)
  // P = principal, r = monthlyRate, M = payment
  const num = -Math.log(1 - (principal * monthlyRate) / payment);
  const den = Math.log(1 + monthlyRate);
  if (den === 0) return Infinity; // Should not happen if rate > 0

  return Math.ceil(num / den);
}

function getMonthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months); // Ensure at least 1 month to avoid division by zero for requiredMonthly
}
