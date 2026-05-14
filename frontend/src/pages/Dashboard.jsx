import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const chartColors = ["#0f766e", "#dc2626", "#2563eb", "#ca8a04", "#7c3aed", "#0891b2", "#be185d", "#4b5563"];

const formatBDT = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

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
    return (
      <div className="flex min-h-[180px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
        {emptyText || "No data available yet."}
      </div>
    );
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
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
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
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        value: formatBDT(summary.pettyCash),
        icon: Wallet,
        tone: "bg-emerald-50 text-emerald-700",
        href: "/dashboard/petty-cash",
      },
      {
        title: "Bank Balance",
        value: formatBDT(summary.bankBalance),
        icon: Landmark,
        tone: "bg-blue-50 text-blue-700",
        href: "/dashboard/bank-cash",
      },
      {
        title: "Monthly Income",
        value: formatBDT(summary.monthlyIncome),
        icon: ArrowUpRight,
        tone: "bg-teal-50 text-teal-700",
        href: "/dashboard/reports",
      },
      {
        title: "Monthly Expense",
        value: formatBDT(summary.monthlyExpense),
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
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accounting Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Approved ledger balances, current month performance, and reconciliation signals.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          <RefreshCcw size={16} />
          Refresh
        </button>
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="rounded-lg shadow-none">
                <CardContent className="p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 h-8 w-36 animate-pulse rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => <SummaryCard key={card.title} {...card} />)}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="rounded-lg shadow-none xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Income vs Expense
            </CardTitle>
            <Link to="/dashboard/reports" className="text-xs font-bold text-[#DA002E]">
              Reports
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            <PanelState
              loading={loading}
              error={error}
              empty={incomeVsExpense.length === 0}
              emptyText="No approved income or expense journals yet.">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpense}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${Number(value) / 1000}k`}
                    />
                    <Tooltip formatter={(value) => formatBDT(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PanelState>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none xl:col-span-2">
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
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={105}
                      paddingAngle={2}>
                      {expenseByCategory.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatBDT(value)} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </PanelState>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Recent Journals
            </CardTitle>
            <Link to="/dashboard/journal-entries" className="text-xs font-bold text-[#DA002E]">
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
                        {journal.description || journal.referenceNumber || "Journal entry"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(journal.voucherDate)} · {formatBDT(journal.totalDebit)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </PanelState>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Recent Petty Cash
            </CardTitle>
            <Link to="/dashboard/petty-cash" className="text-xs font-bold text-[#DA002E]">
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
                          {formatBDT(row.debit || row.credit)}
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

        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Bank Reconciliation Alerts
            </CardTitle>
            <Link to="/dashboard/bank-cash" className="text-xs font-bold text-[#DA002E]">
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
                          {formatBDT(alert.amount)}
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
                        {alert.type.replace("-", " ")} · {formatDate(alert.date)}
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
