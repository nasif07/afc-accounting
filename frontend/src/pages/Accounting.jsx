import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import {
  useJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useApproveJournalEntry,
  useRejectJournalEntry,
  useChartOfAccounts,
} from '../hooks/useJournal';
import TransactionForm from '../components/TransactionForm';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency } from '../utils/currency';

const TRANSACTION_TYPE_LABELS = {
  receipt: 'Receipt',
  payment: 'Payment',
  'journal-entry': 'Journal Entry',
  transfer: 'Transfer',
};

export default function Accounting() {
  const { user } = useSelector((state) => state.auth);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const { data: accounts = [] } = useChartOfAccounts();

  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();
  const approveMutation = useApproveJournalEntry();
  const rejectMutation = useRejectJournalEntry();

  const availableAccounts = useMemo(() => {
    return accounts.filter(
      (acc) =>
        !acc.hasChildren &&
        acc.status === 'active' &&
        acc.isActive !== false &&
        !acc.deletedAt
    );
  }, [accounts]);

  const handleFormSubmit = async (data) => {
    try {
      if (editingEntry) {
        await updateMutation.mutateAsync({
          id: editingEntry._id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }

      setShowForm(false);
      setEditingEntry(null);
    } catch (error) {
      // mutation hooks usually handle toast/error state upstream
      console.error(error);
    }
  };

  const handleEdit = (entry) => {
    if (entry.status === 'posted' || entry.status === 'reversed' || entry.status === 'deleted') {
      return;
    }
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm('Approve this entry?')) {
      try {
        await approveMutation.mutateAsync(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason && reason.trim()) {
      try {
        await rejectMutation.mutateAsync({
          id,
          rejectionReason: reason.trim(),
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const getEntryStatus = (row) => {
    if (row.status === 'posted' || row.approvalStatus === 'approved') {
      return { label: 'Approved', variant: 'success' };
    }

    if (row.approvalStatus === 'rejected') {
      return { label: 'Rejected', variant: 'danger' };
    }

    if (row.status === 'deleted') {
      return { label: 'Deleted', variant: 'danger' };
    }

    if (row.status === 'reversed') {
      return { label: 'Reversed', variant: 'warning' };
    }

    return { label: 'Pending', variant: 'warning' };
  };

  const canEditOrDelete = (row) => {
    return row.approvalStatus === 'pending' && row.status === 'draft' && !row.isLocked;
  };

  const columns = [
    { key: 'voucherNumber', label: 'Voucher #' },
    {
      key: 'voucherDate',
      label: 'Date',
      render: (value) =>
        value ? new Date(value).toLocaleDateString() : '-',
    },
    { key: 'description', label: 'Description' },
    {
      key: 'transactionType',
      label: 'Type',
      render: (value) => (
        <Badge variant="info">
          {TRANSACTION_TYPE_LABELS[value] || value || '-'}
        </Badge>
      ),
    },
    {
      key: 'totalDebit',
      label: 'Debit',
      render: (value) => formatCurrency(value || 0),
    },
    {
      key: 'totalCredit',
      label: 'Credit',
      render: (value) => formatCurrency(value || 0),
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
      render: (_, row) => {
        const status = getEntryStatus(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: '_id',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {canEditOrDelete(row) && (
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

          {user?.role === 'director' &&
            row.approvalStatus === 'pending' &&
            row.status === 'draft' && (
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

  const pendingCount = entries.filter(
    (e) => e.approvalStatus === 'pending' && e.status === 'draft'
  ).length;

  const approvedCount = entries.filter(
    (e) => e.approvalStatus === 'approved' || e.status === 'posted'
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Accounting</h1>
          <p className="text-neutral-600 mt-2">
            Manage journal entries and double-entry transactions
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Entries</p>
            <p className="text-3xl font-bold text-neutral-900">{entries.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Pending Approval</p>
            <p className="text-3xl font-bold text-neutral-900">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Approved</p>
            <p className="text-3xl font-bold text-neutral-900">{approvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {entriesLoading ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-neutral-600">Loading entries...</p>
        </div>
      ) : entries.length > 0 ? (
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

      <TransactionForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingEntry}
        accounts={availableAccounts}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}