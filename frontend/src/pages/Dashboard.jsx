import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DollarSign, TrendingUp, Users, AlertCircle, Plus } from 'lucide-react';
import { useReceipts } from '../hooks/useReceipts';
import { useAccountingSummary, useRevenueData, useRecentTransactions } from '../hooks/useAccounting';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/currency';

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const [dateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = useAccountingSummary();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: recentTransactions, isLoading: transactionsLoading } = useRecentTransactions(5);
  const { data: receipts } = useReceipts();

  // Calculate stats
  const stats = useMemo(() => {
    return [
      {
        title: 'Cash on Hand',
        value: formatCurrency(summary?.cashOnHand || 0),
        icon: DollarSign,
        trend: 'up',
        trendValue: '+12.5%',
        loading: summaryLoading,
      },
      {
        title: 'Accounts Receivable',
        value: formatCurrency(summary?.accountsReceivable || 0),
        icon: TrendingUp,
        trend: 'up',
        trendValue: '+8.2%',
        loading: summaryLoading,
      },
      {
        title: 'Accounts Payable',
        value: formatCurrency(summary?.accountsPayable || 0),
        icon: AlertCircle,
        trend: 'down',
        trendValue: '-3.1%',
        loading: summaryLoading,
      },
      {
        title: 'Total Receipts',
        value: formatCurrency(summary?.totalReceipts || 0),
        icon: DollarSign,
        trend: 'up',
        trendValue: '+15.3%',
        loading: summaryLoading,
      },
    ];
  }, [summary, summaryLoading]);

  // Table columns for recent transactions
  const transactionColumns = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type' },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'approved' ? 'success' : 'warning'}>
          {value || 'Pending'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-600 mt-2">
            Welcome back, {user?.name || 'User'}! Here's your financial overview.
          </p>
        </div>
        <Button variant="primary" className="gap-2">
          <Plus size={18} />
          Generate Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart
            data={revenueData || []}
            loading={revenueLoading}
            title="Revenue Trend"
          />
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-sm text-neutral-600">Total Students</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {receipts?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-sm text-neutral-600">Pending Approvals</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {receipts?.filter((r) => r.approvalStatus === 'pending')?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Approved Receipts</span>
                <span className="text-lg font-semibold text-neutral-900">
                  {receipts?.filter((r) => r.approvalStatus === 'approved')?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">Recent Transactions</h2>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>

        {transactionsLoading ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
            <p className="text-neutral-600">Loading transactions...</p>
          </div>
        ) : recentTransactions && recentTransactions.length > 0 ? (
          <Table
            columns={transactionColumns}
            data={recentTransactions}
            paginated={false}
            searchable={false}
          />
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="No Transactions Yet"
            description="Start by creating your first receipt or expense entry."
            action={() => window.location.href = '/receipts'}
            actionLabel="Create Receipt"
          />
        )}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Database</span>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">API Server</span>
              <Badge variant="success">Running</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Last Backup</span>
              <span className="text-xs text-neutral-600">Today at 10:30 AM</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
