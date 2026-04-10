import React, { useState, useEffect } from 'react';
import {
  Plus,
  Landmark,
  CreditCard,
  Wallet,
  Edit2,
  Trash2,
  CheckCircle,
  History,
  Loader,
  RefreshCw,
} from 'lucide-react';
import { bankAPI } from '../services/apiMethods';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';

const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  if (typeof error?.message === 'string') {
    return error.message;
  }
  return fallback;
};

const BankCash = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [coaLoading, setCoaLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileData, setReconcileData] = useState({
    reconciledBalance: '',
    reconciledDate: new Date().toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    accountType: 'savings',
    openingBalance: 0,
    coaAccount: '',
  });

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: '',
      accountType: 'savings',
      openingBalance: 0,
      coaAccount: '',
    });
  };

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const [accountsRes, balanceRes] = await Promise.all([
        bankAPI.getAll(),
        bankAPI.getTotalBalance(),
      ]);

      setBankAccounts(accountsRes?.data?.data || []);
      setTotalBalance(balanceRes?.data?.data?.totalBalance || 0);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load bank data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCOAAccounts = async () => {
    setCoaLoading(true);
    try {
      // FIXED: Use leaf-nodes endpoint to get only leaf accounts (not parent accounts)
      // FIXED: Filter for asset accounts with status='active'
      const res = await api.get('/accounts/leaf-nodes?accountType=asset');
      const accounts = res?.data?.data || [];

      // FIXED: Filter by status='active' instead of isActive
      const assetAccounts = accounts.filter(
        (acc) =>
          acc &&
          acc.accountType === 'asset' &&
          acc.status === 'active' &&
          !acc.deletedAt
      );

      setCoaAccounts(assetAccounts);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load chart of accounts'));
    } finally {
      setCoaLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
    fetchCOAAccounts();
  }, []);

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bankName: account.bankName || '',
        accountNumber: account.accountNumber || '',
        accountHolderName: account.accountHolderName || '',
        ifscCode: account.ifscCode || '',
        branchName: account.branchName || '',
        accountType: account.accountType || 'savings',
        openingBalance: account.openingBalance || 0,
        coaAccount:
          typeof account.coaAccount === 'object'
            ? account.coaAccount?._id || ''
            : account.coaAccount || '',
      });
    } else {
      resetForm();
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.coaAccount) {
      toast.error('Please select a linked chart of account');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        openingBalance: Number(formData.openingBalance) || 0,
      };

      console.log(payload);

      if (editingAccount) {
        await bankAPI.update(editingAccount._id, payload);
        toast.success('Bank account updated successfully');
      } else {
        await bankAPI.create(payload);
        toast.success('Bank account created successfully');
      }

      handleCloseModal();
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Operation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this account?'
    );
    if (!confirmed) return;

    try {
      await bankAPI.delete(id);
      toast.success('Account deleted successfully');
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete account'));
    }
  };

  const handleReconcile = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await bankAPI.reconcile(editingAccount._id, {
        reconciledBalance: Number(reconcileData.reconciledBalance) || 0,
        reconciledDate: reconcileData.reconciledDate,
      });

      toast.success('Account reconciled successfully');
      setShowReconcileModal(false);
      await fetchBankData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Reconciliation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'savings':
        return <Wallet className="text-blue-500" />;
      case 'current':
        return <Landmark className="text-purple-500" />;
      default:
        return <CreditCard className="text-gray-500" />;
    }
  };

  const coaOptions = coaAccounts.map((acc) => ({
    value: acc._id,
    label: `${acc.accountCode} - ${acc.accountName}`,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank & Cash</h1>
          <p className="mt-1 text-gray-600">
            Manage your liquid assets and bank reconciliations
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-blue-100">
                Total Liquid Balance
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                {formatCurrency(totalBalance)}
              </h2>
            </div>
            <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
              <Landmark size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-100">
            <RefreshCw size={14} className="mr-1" />
            Updated in real-time from ledger
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                Active Accounts
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                {bankAccounts.length}
              </h2>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <CreditCard size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Across {new Set(bankAccounts.map((a) => a.bankName)).size} institutions
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                Pending Reconciliation
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                {bankAccounts.filter((a) => !a.lastReconciledDate).length}
              </h2>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <History size={24} className="text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Accounts needing attention
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader className="animate-spin text-blue-600" size={40} />
          </div>
        ) : bankAccounts.length > 0 ? (
          bankAccounts.map((account) => (
            <Card
              key={account._id}
              className="group overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="rounded-xl bg-gray-50 p-3 transition-colors group-hover:bg-blue-50">
                      {getAccountIcon(account.accountType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {account.bankName}
                      </h3>
                      <p className="font-mono text-sm text-gray-500">
                        {account.accountNumber}
                      </p>
                      {account.coaAccount && (
                        <p className="mt-1 text-xs text-gray-500">
                          Linked COA:{' '}
                          {typeof account.coaAccount === 'object'
                            ? `${account.coaAccount.accountCode || ''} ${account.coaAccount.accountName || ''}`.trim()
                            : account.coaAccount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(account)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(account._id)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Current Balance
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatCurrency(account.currentBalance || 0)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Last Reconciled
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {account.lastReconciledDate
                        ? new Date(account.lastReconciledDate).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {account.balanceError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {account.balanceError}
                  </div>
                )}

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
                        reconciledDate: new Date().toISOString().split('T')[0],
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
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-20">
            <Landmark size={48} className="mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">No Bank Accounts</h3>
            <p className="mt-1 max-w-xs text-center text-gray-500">
              Add your first bank or cash account to start tracking your liquid assets.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => handleOpenModal()}>
              <Plus size={18} className="mr-2" />
              Add Account
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            placeholder="e.g. Eastern Bank"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Account Number"
              required
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData({ ...formData, accountNumber: e.target.value })
              }
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
            onChange={(e) =>
              setFormData({ ...formData, accountHolderName: e.target.value })
            }
            placeholder="Name on account"
          />

          <Select
            label="Linked COA Account"
            required
            value={formData.coaAccount}
            onChange={(e) => setFormData({ ...formData, coaAccount: e.target.value })}
            options={coaOptions}
            disabled={coaLoading}
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
                { value: 'money-market', label: 'Money Market' },
              ]}
            />

            <Input
              label="Opening Balance"
              type="number"
              value={formData.openingBalance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  openingBalance: Number(e.target.value) || 0,
                })
              }
              disabled={!!editingAccount}
            />
          </div>

          <Input
            label="Branch Name"
            value={formData.branchName}
            onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
            placeholder="Optional"
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={handleCloseModal} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting || coaLoading}>
              {submitting ? 'Saving...' : 'Save Account'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        title="Reconcile Account"
      >
        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="mb-4 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Enter the actual balance from your bank statement to reconcile with
              the system ledger.
            </p>
          </div>

          <Input
            label="Statement Balance"
            type="number"
            required
            value={reconcileData.reconciledBalance}
            onChange={(e) =>
              setReconcileData({
                ...reconcileData,
                reconciledBalance: Number(e.target.value) || 0,
              })
            }
          />

          <Input
            label="Statement Date"
            type="date"
            required
            value={reconcileData.reconciledDate}
            onChange={(e) =>
              setReconcileData({
                ...reconcileData,
                reconciledDate: e.target.value,
              })
            }
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReconcileModal(false)}
              type="button"
            >
              Cancel
            </Button>
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