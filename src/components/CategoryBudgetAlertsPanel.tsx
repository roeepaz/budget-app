// components/CategoryBudgetAlertsPanel.tsx
import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck,
  Zap,
  Calendar,
  ArrowRight,
} from 'lucide-react';

// ---- App Types ----
export type CategoryTag = 'need' | 'want' | 'debt' | 'emergency' | 'goal' | 'savings';

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

export type Goal = { id: string | number; name: string; budget?: number };
export type Debt = { id: string | number; name: string; budget?: number };

export type Expense = {
  id: string;
  amount: number;
  date: string | number | Date;
  categoryId: string | number;
};

type Props = {
  categories: Category[];
  goals: Goal[];
  debts: Debt[];
  expenses: Expense[];
  limit?: number;
  nearThreshold?: number;
};

// ---- Internal computed types ----
type AlertItem = {
  id: string;
  name: string;
  tag: CategoryTag | 'goal' | 'debt';
  icon?: string;
  budget: number;
  spent: number;
  utilizationPct: number;
  remaining: number;
  dailyAllowance: number;
  projectedTotal: number;
  projectedSurplus: number; // positive = surplus, negative = deficit
  advice: string;
  severity: 'critical' | 'warning' | 'caution' | 'healthy';
};

const toStr = (v: string | number) => String(v);

// ---- Health Score Badge ----
const HealthScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bg: 'linear-gradient(135deg, #10B981, #059669)', text: '#fff', label: 'מצוין' };
    if (s >= 60) return { bg: 'linear-gradient(135deg, #3B82F6, #2563EB)', text: '#fff', label: 'טוב' };
    if (s >= 40) return { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', text: '#fff', label: 'דורש תשומת לב' };
    return { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', text: '#fff', label: 'דורש פעולה' };
  };
  const c = getScoreColor(score);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          background: c.bg,
          color: c.text,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '16px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        }}
      >
        {score}
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{c.label}</div>
        <div style={{ fontSize: '11px', color: '#64748B' }}>ציון בריאות</div>
      </div>
    </div>
  );
};

// ---- Month Progress Bar ----
const MonthProgressBar: React.FC<{ progress: number; dayOfMonth: number; daysInMonth: number }> = ({
  progress,
  dayOfMonth,
  daysInMonth,
}) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
        <Calendar className="w-3.5 h-3.5" />
        <span>יום {dayOfMonth} מתוך {daysInMonth}</span>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
        {Math.round(progress)}% מהחודש חלף
      </span>
    </div>
    <div
      style={{
        height: '6px',
        borderRadius: '3px',
        background: '#E2E8F0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: '3px',
          background: 'linear-gradient(90deg, #818CF8, #6366F1)',
          width: `${Math.min(progress, 100)}%`,
          transition: 'width 0.6s ease-out',
        }}
      />
    </div>
  </div>
);

// ---- Severity helpers ----
const severityConfig = {
  critical: {
    borderColor: '#EF4444',
    bgGradient: 'linear-gradient(135deg, rgba(254,226,226,0.6), rgba(254,202,202,0.3))',
    iconColor: '#DC2626',
    chipBg: '#FEE2E2',
    chipText: '#991B1B',
    chipLabel: '🔴 חריגה מהתקציב',
    barColor: 'linear-gradient(90deg, #EF4444, #DC2626)',
  },
  warning: {
    borderColor: '#F59E0B',
    bgGradient: 'linear-gradient(135deg, rgba(254,243,199,0.6), rgba(253,230,138,0.3))',
    iconColor: '#D97706',
    chipBg: '#FEF3C7',
    chipText: '#92400E',
    chipLabel: '🟠 קצב גבוה – דרוש עצירה',
    barColor: 'linear-gradient(90deg, #F59E0B, #D97706)',
  },
  caution: {
    borderColor: '#3B82F6',
    bgGradient: 'linear-gradient(135deg, rgba(219,234,254,0.6), rgba(191,219,254,0.3))',
    iconColor: '#2563EB',
    chipBg: '#DBEAFE',
    chipText: '#1E40AF',
    chipLabel: '🔵 מתקרב לתקרה',
    barColor: 'linear-gradient(90deg, #3B82F6, #2563EB)',
  },
  healthy: {
    borderColor: '#10B981',
    bgGradient: 'linear-gradient(135deg, rgba(209,250,229,0.6), rgba(167,243,208,0.3))',
    iconColor: '#059669',
    chipBg: '#D1FAE5',
    chipText: '#065F46',
    chipLabel: '🟢 תקין',
    barColor: 'linear-gradient(90deg, #10B981, #059669)',
  },
};

// ---- Alert Card ----
const AlertCard: React.FC<{
  item: AlertItem;
  monthProgress: number;
  expanded: boolean;
  onToggle: () => void;
}> = ({ item, monthProgress, expanded, onToggle }) => {
  const config = severityConfig[item.severity];
  const daysLeft = Math.max(1, Math.round((1 - monthProgress / 100) * 30));

  return (
    <div
      style={{
        background: config.bgGradient,
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: `1px solid ${config.borderColor}22`,
        borderRight: `4px solid ${config.borderColor}`,
        padding: '16px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      onClick={onToggle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Top row: Icon + Name + Daily Allowance Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {item.icon && <span style={{ fontSize: '20px' }}>{item.icon}</span>}
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>{item.name}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              ₪{item.spent.toLocaleString()} מתוך ₪{item.budget.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Daily allowance pill */}
          {item.remaining > 0 ? (
            <div
              style={{
                background: item.dailyAllowance > 0 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              ₪{Math.round(item.dailyAllowance).toLocaleString()}/יום
            </div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              חריגה ₪{Math.abs(item.remaining).toLocaleString()}
            </div>
          )}

          {/* Expand chevron */}
          <div style={{ color: '#94A3B8' }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Progress bar with month-progress marker */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <div
          style={{
            height: '8px',
            borderRadius: '4px',
            background: '#E2E8F0',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '4px',
              background: config.barColor,
              width: `${Math.min(item.utilizationPct, 100)}%`,
              transition: 'width 0.8s ease-out',
            }}
          />
        </div>
        {/* Month progress marker */}
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            right: `${100 - Math.min(monthProgress, 100)}%`,
            width: '2px',
            height: '12px',
            background: '#6366F1',
            borderRadius: '1px',
            opacity: 0.7,
          }}
          title={`${Math.round(monthProgress)}% מהחודש חלף`}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
        <span>ניצול {Math.round(item.utilizationPct)}%</span>

        {/* Projection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {item.projectedSurplus >= 0 ? (
            <>
              <TrendingDown className="w-3 h-3" style={{ color: '#10B981' }} />
              <span style={{ color: '#059669', fontWeight: 600 }}>
                צפי: עודף ₪{Math.round(item.projectedSurplus).toLocaleString()}
              </span>
            </>
          ) : (
            <>
              <TrendingUp className="w-3 h-3" style={{ color: '#EF4444' }} />
              <span style={{ color: '#DC2626', fontWeight: 600 }}>
                צפי: חריגה ₪{Math.abs(Math.round(item.projectedSurplus)).toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expandable advice section */}
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(148,163,184,0.2)',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              lineHeight: '1.7',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.iconColor }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: config.iconColor }}>המלצה אישית</div>
                <div>{item.advice}</div>
                {item.remaining > 0 && daysLeft > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'rgba(99,102,241,0.08)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#4338CA',
                      fontWeight: 600,
                    }}
                  >
                    💡 נותרו {daysLeft} ימים בחודש · מותר עד ₪{Math.round(item.dailyAllowance).toLocaleString()} ליום
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Empty State (All Healthy) ----
const EmptyState: React.FC<{ healthScore: number; totalBudget: number; totalSpent: number; monthProgress: number }> = ({
  healthScore,
  totalBudget,
  totalSpent,
  monthProgress,
}) => {
  const remaining = totalBudget - totalSpent;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - new Date().getDate();
  const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(209,250,229,0.8), rgba(167,243,208,0.4), rgba(110,231,183,0.2))',
        borderRadius: '20px',
        padding: '28px 24px',
        textAlign: 'center',
        border: '1px solid rgba(16,185,129,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative dots */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: '50%',
            background: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'][i % 4],
            opacity: 0.3 + Math.random() * 0.3,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '12px' }}>
          <ShieldCheck style={{ width: '40px', height: '40px', color: '#059669', margin: '0 auto' }} />
        </div>
        <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', marginBottom: '6px' }}>
          מצוין! כל הקטגוריות בטווח בטוח 🎯
        </h4>
        <p style={{ fontSize: '13px', color: '#047857', marginBottom: '16px', lineHeight: '1.6' }}>
          ציון הבריאות הפיננסי שלך: <strong>{healthScore}/100</strong>
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '12px',
              padding: '10px 18px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#047857', marginBottom: '2px' }}>נותר מתקציב</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46' }}>
              ₪{Math.max(0, remaining).toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '12px',
              padding: '10px 18px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#047857', marginBottom: '2px' }}>מותר ליום</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46' }}>
              ₪{Math.max(0, Math.round(dailyAllowance)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----
export default function CategoryBudgetAlertsPanel({
  categories,
  goals,
  debts,
  expenses,
  limit = 8,
  nearThreshold = 0.8,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { alerts, healthScore, overLimit, fastPace, nearLimit, monthProgress, dayOfMonth, daysInMonth, totalBudget, totalSpent } =
    useMemo(() => {
      // ---- Month progress ----
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const dim = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dom = now.getDate();
      const mp = (dom / dim) * 100;
      const daysLeft = Math.max(1, dim - dom);

      // ---- Current month expenses by categoryId ----
      const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const spentById = currentMonthExpenses.reduce<Record<string, number>>((acc, e) => {
        const cid = toStr(e.categoryId);
        acc[cid] = (acc[cid] || 0) + (e.amount || 0);
        return acc;
      }, {});

      // ---- Build items ----
      const buildItem = (
        id: string,
        name: string,
        tag: AlertItem['tag'],
        budget: number,
        icon?: string
      ): AlertItem => {
        const spent = spentById[id] || 0;
        const utilizationPct = budget > 0 ? (spent / budget) * 100 : 0;
        const remaining = budget - spent;
        const dailyAllowance = remaining > 0 ? remaining / daysLeft : 0;

        // Projection: If we keep spending at current daily rate
        const avgDailySpend = dom > 0 ? spent / dom : 0;
        const projectedTotal = avgDailySpend * dim;
        const projectedSurplus = budget - projectedTotal;

        // Determine severity
        let severity: AlertItem['severity'] = 'healthy';
        if (spent > budget) severity = 'critical';
        else if ((utilizationPct / 100) > Math.max(0.4, mp / 100 + 0.2)) severity = 'warning';
        else if (utilizationPct >= 85) severity = 'caution';

        // Generate personalized advice
        let advice = '';
        if (severity === 'critical') {
          const overBy = spent - budget;
          advice = `חרגת ב-₪${Math.round(overBy).toLocaleString()} מהתקציב. הקפד לצמצם הוצאות בקטגוריה זו לשארית החודש. שקול להעביר תקציב מקטגוריות שיש בהן עודף כדי לכסות את החריגה.`;
        } else if (severity === 'warning') {
          const needToSave = Math.round((spent - budget * (mp / 100)) / daysLeft);
          advice = `קצב ההוצאות מהיר ביחס להתקדמות החודש. כדי לא לחרוג, הגבל את ההוצאה היומית ל-₪${Math.max(0, Math.round(dailyAllowance)).toLocaleString()} בלבד. נסה לדחות רכישות גדולות לחודש הבא.`;
        } else if (severity === 'caution') {
          advice = `נותרו רק ₪${Math.max(0, Math.round(remaining)).toLocaleString()} עד לתקרה. תשמור על הוצאה של עד ₪${Math.round(dailyAllowance).toLocaleString()} ליום ותסיים את החודש בשלום.`;
        } else {
          advice = `הקטגוריה במצב טוב. בקצב הנוכחי צפוי עודף של ₪${Math.round(projectedSurplus).toLocaleString()} – שקול להפנות את העודף לחיסכון או מטרה.`;
        }

        return {
          id,
          name,
          tag,
          icon,
          budget,
          spent,
          utilizationPct,
          remaining,
          dailyAllowance,
          projectedTotal,
          projectedSurplus,
          advice,
          severity,
        };
      };

      const catItems = (categories || [])
        .filter(c => !c.hidden && (c.budget ?? 0) > 0)
        .map(c => buildItem(toStr(c.id), c.name, c.tag ?? ('category' as any), c.budget ?? 0, c.icon));

      const goalItems = (goals || [])
        .filter(g => (g.budget ?? 0) > 0)
        .map(g => buildItem(`goal-${toStr(g.id)}`, g.name, 'goal', g.budget ?? 0, '🎯'));

      const debtItems = (debts || [])
        .filter(d => (d.budget ?? 0) > 0)
        .map(d => buildItem(`debt-${toStr(d.id)}`, d.name, 'debt', d.budget ?? 0, '💳'));

      const allItems = [...catItems, ...goalItems, ...debtItems];

      // ---- Categorize ----
      const over = allItems.filter(i => i.severity === 'critical').sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget));
      const fast = allItems.filter(i => i.severity === 'warning').sort((a, b) => b.utilizationPct - a.utilizationPct);
      const near = allItems.filter(i => i.severity === 'caution').sort((a, b) => b.utilizationPct - a.utilizationPct);

      const alertItems = [...over, ...fast, ...near];

      // ---- Health Score ----
      // Calculate based on weighted average of all items
      const totalBudgetSum = allItems.reduce((s, i) => s + i.budget, 0);
      const totalSpentSum = allItems.reduce((s, i) => s + i.spent, 0);

      let score = 100;
      if (totalBudgetSum > 0) {
        const overallUtil = totalSpentSum / totalBudgetSum;
        const expectedUtil = mp / 100;
        const ratio = expectedUtil > 0 ? overallUtil / expectedUtil : overallUtil;

        // Perfect: ratio <= 1 (spending at or below month pace)
        // Progressively penalize as ratio increases
        if (ratio <= 0.8) score = 100;
        else if (ratio <= 1.0) score = 100 - (ratio - 0.8) * 50; // 100..90
        else if (ratio <= 1.2) score = 90 - (ratio - 1.0) * 100; // 90..70
        else if (ratio <= 1.5) score = 70 - (ratio - 1.2) * 100; // 70..40
        else score = Math.max(0, 40 - (ratio - 1.5) * 80);

        // Penalize for each critical/warning item
        score -= over.length * 8;
        score -= fast.length * 4;
        score = Math.max(0, Math.min(100, Math.round(score)));
      }

      return {
        alerts: alertItems,
        healthScore: score,
        overLimit: over,
        fastPace: fast,
        nearLimit: near,
        monthProgress: mp,
        dayOfMonth: dom,
        daysInMonth: dim,
        totalBudget: totalBudgetSum,
        totalSpent: totalSpentSum,
      };
    }, [categories, goals, debts, expenses, nearThreshold]);

  const empty = alerts.length === 0;

  return (
  <div
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      border: '1px solid rgba(226,232,240,0.6)',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      position: 'relative',
      zIndex: 0
    }}
    dir="rtl"
  >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              borderRadius: '14px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
            }}
          >
            <Flame style={{ width: '22px', height: '22px', color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              מרכז בקרה פיננסי (beta)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              ניתוח חכם ותובנות לחודש הנוכחי
            </p>
          </div>
        </div>

        <HealthScoreBadge score={healthScore} />
      </div>

      {/* Month progress */}
      <MonthProgressBar progress={monthProgress} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />

      {empty ? (
        <EmptyState
          healthScore={healthScore}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          monthProgress={monthProgress}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Section: Critical */}
          {overLimit.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: severityConfig.critical.chipBg,
                    color: severityConfig.critical.chipText,
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {severityConfig.critical.chipLabel}
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{overLimit.length} פריטים</span>
              </div>
              {overLimit.slice(0, limit).map(item => (
                <div key={item.id} style={{ marginBottom: '8px' }}>
                  <AlertCard
                    item={item}
                    monthProgress={monthProgress}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Section: Warning (fast pace) */}
          {fastPace.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: severityConfig.warning.chipBg,
                    color: severityConfig.warning.chipText,
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {severityConfig.warning.chipLabel}
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{fastPace.length} פריטים</span>
              </div>
              {fastPace.slice(0, limit).map(item => (
                <div key={item.id} style={{ marginBottom: '8px' }}>
                  <AlertCard
                    item={item}
                    monthProgress={monthProgress}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Section: Caution (near limit) */}
          {nearLimit.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: severityConfig.caution.chipBg,
                    color: severityConfig.caution.chipText,
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {severityConfig.caution.chipLabel}
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{nearLimit.length} פריטים</span>
              </div>
              {nearLimit.slice(0, limit).map(item => (
                <div key={item.id} style={{ marginBottom: '8px' }}>
                  <AlertCard
                    item={item}
                    monthProgress={monthProgress}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
