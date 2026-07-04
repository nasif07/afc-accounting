import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router";
import { selectOrgInfo } from "../store/slices/settingsSlice";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileText,
  Landmark,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardAPI } from "../services/apiMethods";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "../components/common";
import {
  EmptyState,
  ErrorState,
  SectionSkeleton,
} from "../components/common/Loaders";
import KPICard from "../components/reports/KPICard";

// Navy (new shell primary) + the existing consolidated emerald/red/amber/
// slate semantic colors, replacing the old ad-hoc teal/purple/cyan/pink set
// that had no relationship to the app's actual design tokens.
const chartColors = [
  "#203C8F",
  "#DC2626",
  "#059669",
  "#D97706",
  "#64748B",
  "#102050",
  "#B91C1C",
  "#94A3B8",
];

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function PanelState({ loading, error, empty, children, emptyText }) {
  if (loading) {
    return <SectionSkeleton rows={6} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (empty) {
    return <EmptyState description={emptyText || "No data available yet."} />;
  }

  return children;
}

function SummaryCard({ title, value, icon, color, href }) {
  return (
    <KPICard
      title={title}
      value={value}
      format="text"
      icon={icon}
      color={color}
      footer={
        href && (
          <Link
            to={href}
            className="mt-3 inline-flex text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-brand-navy">
            View details
          </Link>
        )
      }
    />
  );
}

// Hero stat: bank + petty cash balances combined, the closest real "how much
// liquid cash does the org have right now" figure the backend already
// computes (dashboard.service.js returns both separately; no new endpoint
// needed). The sparkline is real data too, not fabricated — it's the same
// 6-month incomeVsExpense series already fetched for the bar chart below,
// reduced to a monthly net (income − expense). That's a net CASH FLOW trend,
// not a literal balance history (the backend has no daily/monthly balance
// snapshots to chart), so it's captioned accordingly rather than implied to
// be "Net Position over time."
function NetPositionHero({ value, trendData, loading }) {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white shadow-none">
      <CardContent className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                Net Position
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-40 animate-pulse rounded bg-white/15 sm:h-9 sm:w-52" />
              ) : (
                <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{value}</p>
              )}
              <p className="mt-1 text-xs text-white/50">Bank + petty cash, current balance</p>
            </div>
          </div>

          <div className="lg:w-64">
            <div className="h-16 sm:h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="netFlowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fill="url(#netFlowFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-right text-[10px] uppercase tracking-wide text-white/40">
              6-month net cash flow
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();
  const variant =
    normalized === "approved"
      ? "success"
      : normalized === "pending"
        ? "warning"
        : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      {normalized}
    </Badge>
  );
}

export default function Dashboard() {
  const { currency, currencySymbol } = useSelector(selectOrgInfo);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatMoney = useCallback((amount) => {
    const num = Number(amount || 0);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "BDT",
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `${currencySymbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    }
  }, [currency, currencySymbol]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await dashboardAPI.getSummary();
      setDashboard(response.data?.data || response.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load dashboard summary.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summaryCards = useMemo(() => {
    const summary = dashboard?.summary || {};

    return [
      {
        title: "Petty Cash",
        value: formatMoney(summary.pettyCash),
        icon: Wallet,
        color: "green",
        href: "/dashboard/petty-cash",
      },
      {
        title: "Bank Balance",
        value: formatMoney(summary.bankBalance),
        icon: Landmark,
        color: "blue",
        href: "/dashboard/bank-cash",
      },
      {
        title: "Monthly Income",
        value: formatMoney(summary.monthlyIncome),
        icon: ArrowUpRight,
        color: "teal",
        href: "/dashboard/reports",
      },
      {
        title: "Monthly Expense",
        value: formatMoney(summary.monthlyExpense),
        icon: ArrowDownRight,
        color: "red",
        href: "/dashboard/reports",
      },
      {
        title: "Pending Approval",
        value: String(summary.pendingApproval || 0),
        icon: AlertTriangle,
        color: "amber",
        href: "/director/approvals",
      },
    ];
  }, [dashboard, formatMoney]);

  const incomeVsExpense = useMemo(() => dashboard?.charts?.incomeVsExpense || [], [dashboard]);
  const expenseByCategory = dashboard?.charts?.expenseByCategory || [];
  const recentJournals = dashboard?.recentJournals || [];
  const recentPettyCash = dashboard?.recentPettyCash || [];
  const bankAlerts = dashboard?.bankReconciliationAlerts || [];

  const netPosition = formatMoney(
    (dashboard?.summary?.bankBalance || 0) + (dashboard?.summary?.pettyCash || 0),
  );
  const netFlowTrend = useMemo(
    () => incomeVsExpense.map((m) => ({ month: m.month, net: (m.income || 0) - (m.expense || 0) })),
    [incomeVsExpense],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:gap-4 sm:pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Accounting Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Approved ledger balances, current month performance, and
            reconciliation signals.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboard}
          icon={RefreshCcw}
          className="w-full md:w-auto">
          Refresh
        </Button>
      </header>

      {dashboard?.warnings?.pettyCash && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {dashboard.warnings.pettyCash}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-3 sm:space-y-4">
        <NetPositionHero value={netPosition} trendData={netFlowTrend} loading={loading} />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="shadow-none">
                  <CardContent className="p-3 sm:p-5">
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-100 sm:w-20" />
                    <div className="mt-2 h-5 w-20 animate-pulse rounded bg-slate-100 sm:mt-3 sm:h-6 sm:w-28" />
                  </CardContent>
                </Card>
              ))
            : summaryCards.map((card) => (
                <SummaryCard key={card.title} {...card} />
              ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5">
        <Card className="shadow-none lg:col-span-1 xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Income vs Expense
            </CardTitle>
            <Link
              to="/dashboard/reports"
              className="text-xs font-bold text-brand-navy hover:text-brand-navy-dark">
              Reports
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            <PanelState
              loading={loading}
              error={error}
              empty={incomeVsExpense.length === 0}
              emptyText="No approved income or expense journals yet.">
              <div className="h-[220px] sm:h-[270px] lg:h-[300px] xl:h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={incomeVsExpense}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${Number(value) / 1000}k`}
                    />
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#203C8F"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PanelState>
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-1 xl:col-span-2">
          <CardHeader className="border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Expense by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <PanelState
              loading={loading}
              error={error}
              empty={expenseByCategory.length === 0}
              emptyText="No approved expense journals this month.">
              <div className="h-72 sm:h-80 lg:h-[300px] xl:h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      innerRadius="30%"
                      outerRadius="55%"
                      paddingAngle={2}>
                      {expenseByCategory.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconSize={10}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </PanelState>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Recent Journals
            </CardTitle>
            <Link
              to="/dashboard/journal-entries"
              className="text-xs font-bold text-brand-navy hover:text-brand-navy-dark">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <PanelState
              loading={loading}
              error={error}
              empty={recentJournals.length === 0}
              emptyText="No journal entries found.">
              <div className="divide-y divide-slate-100">
                {recentJournals.map((journal) => (
                  <Link
                    key={journal.id}
                    to={`/dashboard/journal-entries/${journal.id}`}
                    className="flex items-start gap-3 p-4 transition hover:bg-slate-50">
                    <FileText className="mt-1 h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {journal.voucherNumber}
                        </p>
                        <StatusBadge status={journal.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {journal.description ||
                          journal.referenceNumber ||
                          "Journal entry"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(journal.voucherDate)} ·{" "}
                        {formatMoney(journal.totalDebit)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </PanelState>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Recent Petty Cash
            </CardTitle>
            <Link
              to="/dashboard/petty-cash"
              className="text-xs font-bold text-brand-navy hover:text-brand-navy-dark">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <PanelState
              loading={loading}
              error={error}
              empty={recentPettyCash.length === 0}
              emptyText="No approved petty cash movements found.">
              <div className="divide-y divide-slate-100">
                {recentPettyCash.map((row) => (
                  <div key={row.id} className="flex items-start gap-3 p-4">
                    {row.type === "deposit" ? (
                      <ArrowUpRight className="mt-1 h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="mt-1 h-4 w-4 text-red-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {row.voucherNumber}
                        </p>
                        <span
                          className={
                            row.type === "deposit"
                              ? "text-sm font-bold text-emerald-700"
                              : "text-sm font-bold text-red-700"
                          }>
                          {formatMoney(row.debit || row.credit)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {row.description || row.counterparty}
                      </p>
                      <p className="mt-1 text-xs capitalize text-slate-400">
                        {formatDate(row.date)} · {row.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PanelState>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Bank Reconciliation Alerts
            </CardTitle>
            <Link
              to="/dashboard/bank-cash"
              className="text-xs font-bold text-brand-navy hover:text-brand-navy-dark">
              Reconcile
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <PanelState
              loading={loading}
              error={error}
              empty={bankAlerts.length === 0}
              emptyText="No unreconciled approved bank transactions.">
              <div className="divide-y divide-slate-100">
                {bankAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-4">
                    {alert.type === "mismatch" ? (
                      <AlertTriangle className="mt-1 h-4 w-4 text-amber-600" />
                    ) : (
                      <Banknote className="mt-1 h-4 w-4 text-blue-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {alert.voucherNumber}
                        </p>
                        <span className="text-sm font-bold text-slate-700">
                          {formatMoney(alert.amount)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {alert.description || "Reconciliation alert"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs capitalize text-slate-400">
                        {alert.type === "mismatch" ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {alert.type.replace("-", " ")} ·{" "}
                        {formatDate(alert.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PanelState>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
