import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DollarSign, TrendingUp, Users, AlertCircle, Plus, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
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
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData(dateRange.startDate, dateRange.endDate);
  const { data: recentTransactions, isLoading: transactionsLoading } = useRecentTransactions(5);
  const { data: receipts } = useReceipts();

  // Optimized Stats Logic
  const stats = useMemo(() => [
    {
      title: 'Cash on Hand',
      value: formatCurrency(summary?.cashOnHand || 0),
      icon: DollarSign,
      trend: 'up',
      trendValue: '12.5%',
      color: 'blue',
      loading: summaryLoading,
    },
    {
      title: 'Accounts Receivable',
      value: formatCurrency(summary?.accountsReceivable || 0),
      icon: TrendingUp,
      trend: 'up',
      trendValue: '8.2%',
      color: 'emerald',
      loading: summaryLoading,
    },
    {
      title: 'Accounts Payable',
      value: formatCurrency(summary?.accountsPayable || 0),
      icon: AlertCircle,
      trend: 'down',
      trendValue: '3.1%',
      color: 'rose',
      loading: summaryLoading,
    },
    {
      title: 'Total Receipts',
      value: formatCurrency(summary?.totalReceipts || 0),
      icon: RefreshCcw,
      trend: 'up',
      trendValue: '15.3%',
      color: 'amber',
      loading: summaryLoading,
    },
  ], [summary, summaryLoading]);

  // Define Table Columns with Standard ERP Styling
  const transactionColumns = useMemo(() => [
    { 
      key: 'date', 
      label: 'Date',
      render: (value) => <span className="text-gray-500 font-medium">{new Date(value).toLocaleDateString()}</span>
    },
    { 
      key: 'description', 
      label: 'Description',
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>
    },
    { 
      key: 'type', 
      label: 'Category',
      render: (value) => <Badge variant="secondary" className="uppercase text-[10px] tracking-widest">{value}</Badge>
    },
    {
      key: 'amount',
      label: 'Amount',
      // Align numbers to the right - a standard accounting rule
      className: "text-right", 
      render: (value) => (
        <span className={`font-mono font-bold ${value < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge 
          className="capitalize shadow-sm"
          variant={value === 'approved' ? 'success' : value === 'pending' ? 'warning' : 'error'}
        >
          {value || 'Pending'}
        </Badge>
      ),
    },
  ], []);

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-10 font-sans antialiased">
      
      {/* 1. Minimalist Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
            Overview <span className="text-[#DA002E]">.</span>
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Bonjour, {user?.name?.split(' ')[0] || 'Admin'}. Monitoring the financial pulse of AF-Chittagong.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-xs font-bold uppercase tracking-wider h-11 px-6">
            Export PDF
          </Button>
          <Button className="bg-[#DA002E] hover:bg-[#b80027] text-white text-xs font-bold uppercase tracking-wider h-11 px-6 shadow-lg shadow-red-100 gap-2">
            <Plus size={16} /> New Entry
          </Button>
        </div>
      </header>

      {/* 2. Optimized Stats Grid (No Borders, Subtle Backgrounds) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow" />
        ))}
      </section>

      {/* 3. Primary Data Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-gray-50">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400">Revenue Performance</CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">Fiscal Year 2026</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <RevenueChart data={revenueData || []} loading={revenueLoading} height={350} />
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          {/* Quick Metrics Panel */}
          <Card className="border-none shadow-sm bg-[#111827] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex justify-between items-center group cursor-default">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Enrolled Students</p>
                  <p className="text-2xl font-black tracking-tighter mt-0.5">{receipts?.length || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-800 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex justify-between items-center group cursor-default">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Approvals</p>
                  <p className="text-2xl font-black tracking-tighter mt-0.5 text-amber-400">
                    {receipts?.filter((r) => r.approvalStatus === 'pending')?.length || 0}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <AlertCircle size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Integrity Card */}
          <Card className="border-none shadow-sm bg-gray-50">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">System Integrity</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Core API
                </span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Operational</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Secondary Row: Transactions Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">Recent Transactions</h2>
          <Button variant="link" className="text-xs font-bold text-[#DA002E] uppercase tracking-widest">View Ledger</Button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          {transactionsLoading ? (
             <div className="p-20 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-gray-100 border-t-[#DA002E] rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing Ledger...</p>
             </div>
          ) : (
            <Table columns={transactionColumns} data={recentTransactions} hoverable={true} transparentHeader={true} />
          )}
        </div>
      </section>
    </div>
  );
}