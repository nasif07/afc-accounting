import React, { useState, useEffect } from 'react';
import { Plus, Search, Landmark, CreditCard, Wallet, MoreVertical, Edit2, Trash2, CheckCircle, History, Loader, RefreshCw } from 'lucide-react';
import { bankAPI } from '../services/apiMethods';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';

const BankCash = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileData, setReconcileData] = useState({ reconciledBalance: '', reconciledDate: new Date().toISOString().split('T')[0] });

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    accountType: 'savings',
    openingBalance: 0
  });

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const [accountsRes, balanceRes] = await Promise.all([
        bankAPI.getAll(),
        bankAPI.getTotalBalance()
      ]);
      setBankAccounts(accountsRes.data.data || []);
      setTotalBalance(balanceRes.data.data?.totalBalance || 0);
    } catch (error) {
      toast.error('Failed to load bank data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
        ifscCode: account.ifscCode,
        branchName: account.branchName || '',
        accountType: account.accountType,
        openingBalance: account.openingBalance || 0
      });
    } else {
      setEditingAccount(null);
      setFormData({
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        branchName: '',
        accountType: 'savings',
        openingBalance: 0
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAccount) {
        await bankAPI.update(editingAccount._id, formData);
        toast.success('Bank account updated successfully');
      } else {
        await bankAPI.create(formData);
        toast.success('Bank account created successfully');
      }
      setShowModal(false);
      fetchBankData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await bankAPI.delete(id);
        toast.success('Account deleted successfully');
        fetchBankData();
      } catch (error) {
        toast.error('Failed to delete account');
      }
    }
  };

  const handleReconcile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bankAPI.reconcile(editingAccount._id, reconcileData);
      toast.success('Account reconciled successfully');
      setShowReconcileModal(false);
      fetchBankData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reconciliation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'savings': return <Wallet className="text-blue-500" />;
      case 'current': return <Landmark className="text-purple-500" />;
      default: return <CreditCard className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank & Cash</h1>
          <p className="text-gray-600 mt-1">Manage your liquid assets and bank reconciliations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Liquid Balance</p>
              <h2 className="text-3xl font-bold mt-2">{formatCurrency(totalBalance)}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Landmark size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-100 text-sm">
            <RefreshCw size={14} className="mr-1" />
            Updated in real-time from ledger
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Active Accounts</p>
              <h2 className="text-3xl font-bold mt-2 text-gray-900">{bankAccounts.length}</h2>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <CreditCard size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Across {new Set(bankAccounts.map(a => a.bankName)).size} institutions
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Pending Reconciliation</p>
              <h2 className="text-3xl font-bold mt-2 text-gray-900">
                {bankAccounts.filter(a => !a.lastReconciledDate).length}
              </h2>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <History size={24} className="text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Accounts needing attention
          </div>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader className="animate-spin text-blue-600" size={40} />
          </div>
        ) : bankAccounts.length > 0 ? (
          bankAccounts.map((account) => (
            <Card key={account._id} className="hover:shadow-md transition-shadow overflow-hidden group">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                      {getAccountIcon(account.accountType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{account.bankName}</h3>
                      <p className="text-sm text-gray-500 font-mono">{account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(account)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(account._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-medium">Current Balance</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {formatCurrency(account.currentBalance || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-medium">Last Reconciled</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {account.lastReconciledDate ? new Date(account.lastReconciledDate).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant={account.isActive ? 'success' : 'danger'}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="info" className="capitalize">
                      {account.accountType}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingAccount(account);
                      setReconcileData({ 
                        reconciledBalance: account.currentBalance || 0, 
                        reconciledDate: new Date().toISOString().split('T')[0] 
                      });
                      setShowReconcileModal(true);
                    }}
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Reconcile
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Landmark size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Bank Accounts</h3>
            <p className="text-gray-500 max-w-xs text-center mt-1">
              Add your first bank or cash account to start tracking your liquid assets.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => handleOpenModal()}>
              <Plus size={18} className="mr-2" />
              Add Account
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            placeholder="e.g. HDFC Bank, Petty Cash"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Account Number"
              required
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Account #"
            />
            <Input
              label="IFSC Code"
              required
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
              placeholder="IFSC"
            />
          </div>
          <Input
            label="Account Holder Name"
            required
            value={formData.accountHolderName}
            onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
            placeholder="Name on account"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Account Type"
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              options={[
                { value: 'savings', label: 'Savings' },
                { value: 'current', label: 'Current' },
                { value: 'checking', label: 'Checking' },
                { value: 'money-market', label: 'Money Market' }
              ]}
            />
            <Input
              label="Opening Balance"
              type="number"
              value={formData.openingBalance}
              onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })}
              disabled={!!editingAccount}
            />
          </div>
          <Input
            label="Branch Name"
            value={formData.branchName}
            onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reconcile Modal */}
      <Modal 
        isOpen={showReconcileModal} 
        onClose={() => setShowReconcileModal(false)} 
        title="Reconcile Account"
      >
        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Enter the actual balance from your bank statement to reconcile with the system ledger.
            </p>
          </div>
          <Input
            label="Statement Balance"
            type="number"
            required
            value={reconcileData.reconciledBalance}
            onChange={(e) => setReconcileData({ ...reconcileData, reconciledBalance: parseFloat(e.target.value) })}
          />
          <Input
            label="Statement Date"
            type="date"
            required
            value={reconcileData.reconciledDate}
            onChange={(e) => setReconcileData({ ...reconcileData, reconciledDate: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowReconcileModal(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Processing...' : 'Complete Reconciliation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankCash;
