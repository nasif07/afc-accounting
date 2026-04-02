import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Search, Calendar, Download, Filter, ArrowLeftRight, Loader } from 'lucide-react';
import { accountingAPI, coaAPI } from '../services/apiMethods';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const Ledger = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Fetch leaf accounts for selection
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await coaAPI.getLeafNodes();
        setAccounts(response.data.data || []);
      } catch (error) {
        toast.error('Failed to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleFetchLedger = async () => {
    if (!selectedAccount) {
      toast.error('Please select an account');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await accountingAPI.getLedger(selectedAccount, params);
      setLedgerData(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  };

  const accountInfo = useMemo(() => {
    return accounts.find(a => a._id === selectedAccount);
  }, [accounts, selectedAccount]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
          <p className="text-gray-600 mt-1">View detailed transaction history for any account</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Download size={18} className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={loadingAccounts}
            >
              <option value="">-- Select Account --</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountCode} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <Button 
            onClick={handleFetchLedger} 
            disabled={loading || !selectedAccount}
            className="w-full"
          >
            {loading ? <Loader className="animate-spin mr-2" size={18} /> : <Filter size={18} className="mr-2" />}
            Generate Ledger
          </Button>
        </div>
      </Card>

      {/* Ledger Results */}
      {ledgerData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-blue-50 border-blue-100">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Opening Balance</p>
              <p className="text-xl font-bold text-blue-900 mt-1">
                {formatCurrency(ledgerData.openingBalance)}
              </p>
            </Card>
            <Card className="p-4 bg-green-50 border-green-100">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Debit</p>
              <p className="text-xl font-bold text-green-900 mt-1">
                {formatCurrency(ledgerData.totalDebit)}
              </p>
            </Card>
            <Card className="p-4 bg-red-50 border-red-100">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Total Credit</p>
              <p className="text-xl font-bold text-red-900 mt-1">
                {formatCurrency(ledgerData.totalCredit)}
              </p>
            </Card>
            <Card className="p-4 bg-purple-50 border-purple-100">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Closing Balance</p>
              <p className="text-xl font-bold text-purple-900 mt-1">
                {formatCurrency(ledgerData.closingBalance)}
              </p>
            </Card>
          </div>

          {/* Transaction Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-200">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher #</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Debit</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Credit</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-50/50 italic">
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>Opening Balance</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(ledgerData.openingBalance)}
                    </td>
                  </tr>
                  
                  {ledgerData.transactions.length > 0 ? (
                    ledgerData.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-blue-600">
                          {tx.voucherNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="font-medium text-gray-900">{tx.description}</div>
                          {tx.reference && <div className="text-xs text-gray-400">Ref: {tx.reference}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                          {formatCurrency(tx.runningBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        No transactions found for this period
                      </td>
                    </tr>
                  )}

                  {/* Closing Balance Row */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={5}>Closing Balance</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {formatCurrency(ledgerData.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <ArrowLeftRight size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Ledger Selected</h3>
          <p className="text-gray-500 max-w-xs text-center mt-1">
            Select an account and date range above to generate the general ledger report.
          </p>
        </div>
      )}
    </div>
  );
};

export default Ledger;
