import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
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

const chartColors = [
  "#0f766e",
  "#dc2626",
  "#2563eb",
  "#ca8a04",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#4b5563",
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

function SummaryCard({ title, value, icon: Icon, tone, href }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:mt-3 sm:text-xl lg:text-2xl">
              {value}
            </p>
          </div>
          <div className={`rounded-lg p-2 ${tone}`}>
            <Icon size={20} />
          </div>
        </div>
        {href && (
          <Link
            to={href}
            className="mt-4 inline-flex text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-[#DA002E]">
            View details
          </Link>
        )}
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

  const formatMoney = (amount) => {
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
  };

  const loadDashboard = async () => {
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
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = dashboard?.summary || {};

    return [
      {
        title: "Petty Cash",
        value: formatMoney(summary.pettyCash),
        icon: Wallet,
        tone: "bg-emerald-50 text-emerald-700",
        href: "/dashboard/petty-cash",
      },
      {
        title: "Bank Balance",
        value: formatMoney(summary.bankBalance),
        icon: Landmark,
        tone: "bg-blue-50 text-blue-700",
        href: "/dashboard/bank-cash",
      },
      {
        title: "Monthly Income",
        value: formatMoney(summary.monthlyIncome),
        icon: ArrowUpRight,
        tone: "bg-teal-50 text-teal-700",
        href: "/dashboard/reports",
      },
      {
        title: "Monthly Expense",
        value: formatMoney(summary.monthlyExpense),
        icon: ArrowDownRight,
        tone: "bg-red-50 text-red-700",
        href: "/dashboard/expenses",
      },
      {
        title: "Pending Approval",
        value: String(summary.pendingApproval || 0),
        icon: AlertTriangle,
        tone: "bg-amber-50 text-amber-700",
        href: "/director/approvals",
      },
    ];
  }, [dashboard]);

  const incomeVsExpense = dashboard?.charts?.incomeVsExpense || [];
  const expenseByCategory = dashboard?.charts?.expenseByCategory || [];
  const recentJournals = dashboard?.recentJournals || [];
  const recentPettyCash = dashboard?.recentPettyCash || [];
  const bankAlerts = dashboard?.bankReconciliationAlerts || [];

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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="mt-3 h-6 w-28 animate-pulse rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5">
        <Card className="shadow-none lg:col-span-1 xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Income vs Expense
            </CardTitle>
            <Link
              to="/dashboard/reports"
              className="text-xs font-bold text-[#DA002E]">
              Reports
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            <PanelState
              loading={loading}
              error={error}
              empty={incomeVsExpense.length === 0}
              emptyText="No approved income or expense journals yet.">
              <div className="h-55 sm:h-67.5 lg:h-75 xl:h-80">
                <ResponsiveContainer width="100%" height="100%">
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
                      fill="#0f766e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#dc2626"
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
              <div className="h-72 sm:h-80 lg:h-75 xl:h-80">
                <ResponsiveContainer width="100%" height="100%">
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
              className="text-xs font-bold text-[#DA002E]">
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
              className="text-xs font-bold text-[#DA002E]">
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
              className="text-xs font-bold text-[#DA002E]">
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
