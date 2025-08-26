import React, { useMemo, useState, useEffect } from "react";
import {
  Loader2,
  Wallet,
  Save,
  PlusCircle,
  XCircle,
  Trash2,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,            // ✅ היה חסר
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
// למעלה בקובץ
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';

import Sidebar from "../components/Sidebar";

type MonthlyIncome = {
  salary: number;
  freelance: number;
  passive: number;
  other: number;
  total: number;
  timestamp?: any;
};

type Row = MonthlyIncome & {
  id: string;
  _dirty?: boolean;
  _saving?: boolean;
  _error?: string | null;
};

// Mock Firebase data
const mockData: Row[] = [
  { id: "2025-08", salary: 15000, freelance: 3500, passive: 1200, other: 800, total: 20500, _dirty: false, _saving: false, _error: null },
  { id: "2025-07", salary: 15000, freelance: 4200, passive: 1100, other: 300, total: 20600, _dirty: false, _saving: false, _error: null },
  { id: "2025-06", salary: 15000, freelance: 2800, passive: 1000, other: 1200, total: 20000, _dirty: false, _saving: false, _error: null },
  { id: "2025-05", salary: 14500, freelance: 3900, passive: 950, other: 650, total: 20000, _dirty: false, _saving: false, _error: null },
  { id: "2025-04", salary: 14500, freelance: 3200, passive: 900, other: 400, total: 19000, _dirty: false, _saving: false, _error: null },
  { id: "2025-03", salary: 14000, freelance: 2500, passive: 850, other: 650, total: 18000, _dirty: false, _saving: false, _error: null },
];

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function yyyymm(d = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function nextMonthKey(yyyy_mm: string): string {
  const [y, m] = yyyy_mm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return yyyymm(d);
}

function sortByMonthDesc(a: string, b: string) {
  return a > b ? -1 : a < b ? 1 : 0;
}

function formatMonth(monthId: string) {
  const [year, month] = monthId.split("-");
  const monthNames = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

// ---------- small components with types ----------
type StatCardColor = "blue" | "green" | "purple" | "orange";
type IconType = React.ComponentType<{ className?: string }>;

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: IconType;
  change?: number;
  color?: StatCardColor;
}> = ({ title, value, icon: Icon, change, color = "blue" }) => {
  const colorClasses: Record<StatCardColor, { grad: string; textBg: string }> = {
    blue: { grad: "from-blue-500 to-blue-600", textBg: "text-blue-600 bg-blue-50" },
    green: { grad: "from-green-500 to-green-600", textBg: "text-green-600 bg-green-50" },
    purple: { grad: "from-purple-500 to-purple-600", textBg: "text-purple-600 bg-purple-50" },
    orange: { grad: "from-orange-500 to-orange-600", textBg: "text-orange-600 bg-orange-50" },
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorClasses[color].grad} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {typeof change === "number" && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              change > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            <TrendingUp className={`w-3 h-3 ${change < 0 ? "rotate-180" : ""}`} />
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">₪{value.toLocaleString()}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
};

const CellNumber: React.FC<{
  value: number;
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => (
  <div className="px-2 text-center">
    <input
      inputMode="numeric"
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:text-gray-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// ==============================
//           PAGE
// ==============================
export default function MonthlyIncomePage() {
  const [rows, setRows] = useState<Row[]>(mockData);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showTable, setShowTable] = useState(true);
  const [viewMode, setViewMode] = useState<"chart" | "both">("both");
const [user] = useAuthState(auth as any);
const userId = user?.uid;

useEffect(() => {
  if (!userId) return;

  const load = async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'financial_data', userId, 'monthly_income');
      const snap = await getDocs(colRef);

      const data: Row[] = [];
      snap.forEach((docSnap) => {
        const id = docSnap.id; // "YYYY-MM"
        const d = docSnap.data() as Partial<MonthlyIncome>;
        const salary = Number(d.salary) || 0;
        const freelance = Number(d.freelance) || 0;
        const passive = Number(d.passive) || 0;
        const other = Number(d.other) || 0;
        const total = Number(d.total ?? salary + freelance + passive + other) || 0;

        data.push({
          id,
          salary,
          freelance,
          passive,
          other,
          total,
          timestamp: (d.timestamp as Timestamp) || undefined,
          _dirty: false,
          _saving: false,
          _error: null,
        });
      });

      // ממיינים יורד לפי חודש (האחרון למעלה)
      data.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
      setRows(data);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'Failed loading monthly income');
    } finally {
      setLoading(false);
    }
  };

  load();
}, [userId]);

  // statistics
  const stats = useMemo(() => {
    if (rows.length === 0) return null;

    const current = rows[0];
    const previous = rows[1];
    const totalIncome = rows.reduce((sum, row) => sum + row.total, 0);
    const avgIncome = totalIncome / rows.length;

    const salaryChange = previous ? ((current.salary - previous.salary) / previous.salary) * 100 : 0;
    const freelanceChange = previous ? ((current.freelance - previous.freelance) / previous.freelance) * 100 : 0;
    const totalChange = previous ? ((current.total - previous.total) / previous.total) * 100 : 0;

    return {
      currentTotal: current.total,
      avgIncome,
      totalIncome,
      currentSalary: current.salary,
      currentFreelance: current.freelance,
      salaryChange: Math.round(salaryChange),
      freelanceChange: Math.round(freelanceChange),
      totalChange: Math.round(totalChange),
    };
  }, [rows]);

  // chart data
  const chartData = useMemo(
    () =>
      rows
        .slice()
        .reverse()
        .map((row) => ({
          month: formatMonth(row.id),
          monthId: row.id,
          משכורת: row.salary,
          פרילנס: row.freelance,
          פסיבי: row.passive,
          אחר: row.other,
          'סה"כ': row.total, // ✅ אותה מחרוזת בדיוק כמו ב-dataKey
        })),
    [rows]
  );

  const pieData = useMemo(() => {
    if (rows.length === 0) return [];
    const current = rows[0];
    return [
      { name: "משכורת", value: current.salary, color: "#3B82F6" },
      { name: "פרילנס", value: current.freelance, color: "#10B981" },
      { name: "פסיבי", value: current.passive, color: "#8B5CF6" },
      { name: "אחר", value: current.other, color: "#F59E0B" },
    ].filter((item) => item.value > 0);
  }, [rows]);

  const onChangeCell = (id: string, field: keyof MonthlyIncome, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextVal = toNum(value);
        const salary = field === "salary" ? nextVal : r.salary;
        const freelance = field === "freelance" ? nextVal : r.freelance;
        const passive = field === "passive" ? nextVal : r.passive;
        const other = field === "other" ? nextVal : r.other;
        const total = salary + freelance + passive + other;
        return { ...r, [field]: nextVal, total, _dirty: true, _error: null };
      })
    );
  };

  const saveRow = async (id: string) => {
  if (!userId) return;
  setRows((prev) => prev.map((r) => (r.id === id ? { ...r, _saving: true, _error: null } : r)));

  try {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    const ref = doc(db, 'financial_data', userId, 'monthly_income', id);
    await setDoc(
      ref,
      {
        salary: row.salary || 0,
        freelance: row.freelance || 0,
        passive: row.passive || 0,
        other: row.other || 0,
        total: (row.salary || 0) + (row.freelance || 0) + (row.passive || 0) + (row.other || 0),
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, _dirty: false, _saving: false } : r))
    );
  } catch (e: any) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, _saving: false, _error: e?.message || 'Save failed' } : r
      )
    );
  }
};


  const revertRow = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, _dirty: false, _error: null } : r)));
  };


  const deleteMonth = async (id: string) => {
  if (!userId) return;
  try {
    await deleteDoc(doc(db, 'financial_data', userId, 'monthly_income', id));
    setRows((prev) => prev.filter((r) => r.id !== id));
  } catch (e: any) {
    setErr(e?.message || 'Failed deleting month');
  }
};
if (!userId) {
  return <div className="p-6 text-center">Loading or not authenticated…</div>;
}


  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" dir="rtl">
      {/* סיידבר - עמודה קבועה ב-desktop, נגללת בנפרד אם צריך */}
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* תוכן ראשי */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* עטיפה פנימית לרוחב מקסימלי עם ריווח; זה מה שיחזיק את התוכן ממורכז */}
        <div className="mx-auto max-w-7xl p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 shadow-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="mb-1 text-3xl font-bold text-gray-900">דוח הכנסות חודשיות</h1>
                <p className="text-gray-600">ניתוח מקצועי של ביצועים כלכליים</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("chart")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "chart" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BarChart3 className="ml-2 inline-block h-4 w-4" />
                  גרפים
                </button>
                <button
                  onClick={() => setViewMode("both")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "both" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Eye className="ml-2 inline-block h-4 w-4" />
                  הכל
                </button>
              </div>

              <button
                onClick={() => setShowTable(!showTable)}
                className="rounded-xl border border-gray-200 bg-white p-3 text-gray-600 transition-all hover:text-gray-900"
              >
                {showTable ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>

            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="הכנסה נוכחית" value={stats.currentTotal} icon={DollarSign} change={stats.totalChange} color="blue" />
              <StatCard title="ממוצע חודשי" value={Math.round(stats.avgIncome)} icon={TrendingUp} color="green" />
              <StatCard title="משכורת נוכחית" value={stats.currentSalary} icon={Wallet} change={stats.salaryChange} color="purple" />
              <StatCard title="הכנסה מפרילנס" value={stats.currentFreelance} icon={Calendar} change={stats.freelanceChange} color="orange" />
            </div>
          )}
        </div>

        {/* Error */}
        {err && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">{err}</div>}

        {/* Charts */}
        {(viewMode === "chart" || viewMode === "both") && (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Trend */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">מגמות הכנסה</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => [`₪${value.toLocaleString()}`, ""]}
                    labelStyle={{ color: "#374151" }}
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={'סה"כ'}    // ✅ תואם ל-chartData
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#totalGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Current breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">פילוח החודש הנוכחי</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`₪${value.toLocaleString()}`, ""]} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed bars */}
        {(viewMode === "chart" || viewMode === "both") && (
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">פירוט מקורות הכנסה</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip formatter={(value: number) => [`₪${value.toLocaleString()}`, ""]} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="משכורת" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="פרילנס" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="פסיבי" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="אחר" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table / Cards (Responsive) */}
{showTable && viewMode === "both" && (
  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
    {/* כותרת */}
    <div className="border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">טבלת נתונים מפורטת</h3>
    </div>

    {/* --- מובייל: כרטיסים --- */}
    <div className="md:hidden p-3 sm:p-4 space-y-3">
      {loading ? (
        <div className="flex items-center justify-center p-8 text-slate-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>טוען נתונים...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-slate-600">
          <BarChart3 className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium">לא נמצאו נתונים</p>
          <p className="text-xs text-gray-500 mt-1">הוסף חודש חדש כדי להתחיל לעקוב</p>
        </div>
      ) : (
        rows.map((r, index) => (
          <div
            key={r.id}
            className={`rounded-xl border ${index === 0 ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'} p-3 shadow-sm`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">
                {formatMonth(r.id)}
                {index === 0 && (
                  <span className="mr-2 align-middle rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                    חדש
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-gray-900">
                ₪{r.total.toLocaleString()}
              </div>
            </div>

            {/* Inputs grid */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-gray-500">משכורת
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={r.salary}
                  onChange={(e) => onChangeCell(r.id, "salary", e.target.value)}
                />
              </label>
              <label className="text-[11px] text-gray-500">פרילנס
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={r.freelance}
                  onChange={(e) => onChangeCell(r.id, "freelance", e.target.value)}
                />
              </label>
              <label className="text-[11px] text-gray-500">פסיבי
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={r.passive}
                  onChange={(e) => onChangeCell(r.id, "passive", e.target.value)}
                />
              </label>
              <label className="text-[11px] text-gray-500">אחר
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={r.other}
                  onChange={(e) => onChangeCell(r.id, "other", e.target.value)}
                />
              </label>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  title="שמור"
                  disabled={!r._dirty || r._saving}
                  onClick={() => saveRow(r.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
                    r._dirty ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {r._saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  שמור
                </button>
                <button
                  title="בטל"
                  disabled={!r._dirty || r._saving}
                  onClick={() => revertRow(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-60"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  בטל
                </button>
              </div>

              <button
                title="מחק חודש"
                onClick={() => deleteMonth(r.id)}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
              >
                <Trash2 className="h-4 w-4 inline-block ml-1" />
                מחק
              </button>
            </div>

            {r._error && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {r._error}
              </div>
            )}
          </div>
        ))
      )}
    </div>

    {/* --- דסקטופ/טאבלט: טבלה מלאה --- */}
    <div className="hidden md:block overflow-x-auto">
      <div className="grid grid-cols-8 border-b border-gray-100 bg-gray-50 px-6 py-4 text-sm font-semibold text-gray-700">
        <div>חודש</div>
        <div className="text-center">משכורת</div>
        <div className="text-center">פרילנס</div>
        <div className="text-center">פסיבי</div>
        <div className="text-center">אחר</div>
        <div className="text-center">סה״כ</div>
        <div className="text-center">פעולות</div>
        <div className="text-center">מחק</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>טוען נתונים...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-slate-600">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="mb-2 text-lg font-medium">לא נמצאו נתונים</p>
          <p>הוסף חודש חדש כדי להתחיל לעקוב אחר הכנסותיך</p>
        </div>
      ) : (
        rows.map((r, index) => (
          <div
            key={r.id}
            className={`grid grid-cols-8 items-center border-b border-gray-50 px-6 py-4 text-sm ${
              index === 0 ? "bg-blue-50" : ""
            }`}
          >
            <div className="font-semibold text-gray-900">
              {formatMonth(r.id)}
              {index === 0 && (
                <span className="mr-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">חדש</span>
              )}
            </div>

            <CellNumber value={r.salary} onChange={(v) => onChangeCell(r.id, "salary", v)} />
            <CellNumber value={r.freelance} onChange={(v) => onChangeCell(r.id, "freelance", v)} />
            <CellNumber value={r.passive} onChange={(v) => onChangeCell(r.id, "passive", v)} />
            <CellNumber value={r.other} onChange={(v) => onChangeCell(r.id, "other", v)} />

            <div className="text-center text-lg font-bold text-gray-900">
              ₪{r.total.toLocaleString()}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                title="שמור"
                disabled={!r._dirty || r._saving}
                onClick={() => saveRow(r.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm ${
                  r._dirty ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {r._saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                שמור
              </button>
              <button
                title="בטל שינויים"
                disabled={!r._dirty || r._saving}
                onClick={() => revertRow(r.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                בטל
              </button>
            </div>

            <div className="flex items-center justify-center">
              <button
                title="מחק חודש"
                onClick={() => deleteMonth(r.id)}
                className="rounded-lg bg-red-50 px-3 py-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {r._error && (
              <div className="col-span-8 mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {r._error}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </div>
)}
</div>
      </main>
    </div>
  );
}
