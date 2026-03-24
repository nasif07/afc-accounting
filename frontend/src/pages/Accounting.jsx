import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, useApproveJournalEntry, useRejectJournalEntry, useChartOfAccounts } from '../hooks/useJournal';
import TransactionForm from '../components/TransactionForm';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency } from '../utils/currency';

export default function Accounting() {
  const { user } = useSelector((state) => state.auth);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Fetch data
  const { data: entries, isLoading: entriesLoading } = useJournalEntries();
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();

  // Mutations
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();
  const approveMutation = useApproveJournalEntry();
  const rejectMutation = useRejectJournalEntry();

  // Handle form submit
  const handleFormSubmit = async (data) => {
    if (editingEntry) {
      await updateMutation.mutateAsync({
        id: editingEntry._id,
        data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  // Handle edit
  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Handle approve
  const handleApprove = async (id) => {
    if (window.confirm('Approve this entry?')) {
      await approveMutation.mutateAsync(id);
    }
  };

  // Handle reject
  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      await rejectMutation.mutateAsync({ id, reason });
    }
  };

  // Close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Table columns
  const columns = [
    { key: 'voucherNumber', label: 'Voucher #' },
    {
      key: 'voucherDate',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    { key: 'description', label: 'Description' },
    { key: 'transactionType', label: 'Type', render: (value) => <Badge variant="info">{value}</Badge> },
    {
      key: 'totalDebit',
      label: 'Debit',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'totalCredit',
      label: 'Credit',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'isBalanced',
      label: 'Balance',
      render: (value) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Balanced' : 'Unbalanced'}
        </Badge>
      ),
    },
    {
      key: 'approvalStatus',
      label: 'Status',
      render: (value) => (
        <Badge
          variant={
            value === 'approved'
              ? 'success'
              : value === 'rejected'
              ? 'danger'
              : 'warning'
          }
        >
          {value || 'Pending'}
        </Badge>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.approvalStatus === 'pending' && (
            <>
              <button
                onClick={() => handleEdit(row)}
                className="text-blue-600 hover:text-blue-700 transition"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(value)}
                className="text-red-600 hover:text-red-700 transition"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {user?.role === 'director' && row.approvalStatus === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(value)}
                className="text-green-600 hover:text-green-700 transition"
                title="Approve"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleReject(value)}
                className="text-red-600 hover:text-red-700 transition"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Accounting</h1>
          <p className="text-neutral-600 mt-2">Manage journal entries and double-entry transactions</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingEntry(null);
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          New Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Entries</p>
            <p className="text-3xl font-bold text-neutral-900">{entries?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Pending Approval</p>
            <p className="text-3xl font-bold text-neutral-900">
              {entries?.filter((e) => e.approvalStatus === 'pending')?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Approved</p>
            <p className="text-3xl font-bold text-neutral-900">
              {entries?.filter((e) => e.approvalStatus === 'approved')?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Table */}
      {entriesLoading ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-neutral-600">Loading entries...</p>
        </div>
      ) : entries && entries.length > 0 ? (
        <Table
          columns={columns}
          data={entries}
          searchable
          paginated
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={Plus}
          title="No Journal Entries"
          description="Start by creating your first journal entry."
          action={() => {
            setEditingEntry(null);
            setShowForm(true);
          }}
          actionLabel="Create Entry"
        />
      )}

      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingEntry}
        accounts={accounts || []}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
