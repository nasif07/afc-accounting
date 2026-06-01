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
import { Table, Button, Badge, Card, CardContent, Modal, Textarea } from '../components/common';
import EmptyState from '../components/EmptyState';
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
  const [rejectModal, setRejectModal] = useState(null); // entryId being rejected
  const [rejectReason, setRejectReason] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingApprove, setPendingApprove] = useState(null);

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
        await updateMutation.mutateAsync({ id: editingEntry._id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowForm(false);
      setEditingEntry(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (entry) => {
    if (entry.status === 'posted' || entry.status === 'reversed' || entry.status === 'deleted') return;
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(pendingDelete);
    } catch (error) {
      console.error(error);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleConfirmApprove = async () => {
    try {
      await approveMutation.mutateAsync(pendingApprove);
    } catch (error) {
      console.error(error);
    } finally {
      setPendingApprove(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectModal, rejectionReason: rejectReason.trim() });
    } catch (error) {
      console.error(error);
    } finally {
      setRejectModal(null);
      setRejectReason('');
    }
  };

  const getEntryStatus = (row) => {
    if (row.status === 'posted' || row.approvalStatus === 'approved')
      return { label: 'Approved', variant: 'success' };
    if (row.approvalStatus === 'rejected')
      return { label: 'Rejected', variant: 'danger' };
    if (row.status === 'deleted')
      return { label: 'Deleted', variant: 'danger' };
    if (row.status === 'reversed')
      return { label: 'Reversed', variant: 'warning' };
    return { label: 'Pending', variant: 'warning' };
  };

  const canEditOrDelete = (row) =>
    row.approvalStatus === 'pending' && row.status === 'draft' && !row.isLocked;

  const columns = [
    { key: 'voucherNumber', label: 'Voucher #' },
    {
      key: 'voucherDate',
      label: 'Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    { key: 'description', label: 'Description' },
    {
      key: 'transactionType',
      label: 'Type',
      render: (value) => (
        <Badge variant="info">{TRANSACTION_TYPE_LABELS[value] || value || '-'}</Badge>
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
        <Badge variant={value ? 'success' : 'danger'}>{value ? 'Balanced' : 'Unbalanced'}</Badge>
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
        <div className="flex items-center gap-1">
          {canEditOrDelete(row) && (
            <>
              <Button size="icon-sm" variant="ghost"
                aria-label={`Edit journal entry ${row.voucherNumber}`}
                onClick={() => handleEdit(row)}>
                <Edit2 size={15} className="text-blue-600" />
              </Button>
              <Button size="icon-sm" variant="ghost"
                aria-label={`Delete journal entry ${row.voucherNumber}`}
                onClick={() => setPendingDelete(value)}>
                <Trash2 size={15} className="text-red-600" />
              </Button>
            </>
          )}
          {user?.role === 'director' &&
            row.approvalStatus === 'pending' &&
            row.status === 'draft' && (
              <>
                <Button size="icon-sm" variant="ghost"
                  aria-label={`Approve journal entry ${row.voucherNumber}`}
                  onClick={() => setPendingApprove(value)}>
                  <CheckCircle size={15} className="text-green-600" />
                </Button>
                <Button size="icon-sm" variant="ghost"
                  aria-label={`Reject journal entry ${row.voucherNumber}`}
                  onClick={() => { setRejectModal(value); setRejectReason(''); }}>
                  <XCircle size={15} className="text-red-600" />
                </Button>
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
          <p className="text-neutral-600 mt-2">Manage journal entries and double-entry transactions</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setEditingEntry(null); setShowForm(true); }}
          icon={Plus}>
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
        <Table columns={columns} data={entries} searchable paginated pageSize={10} />
      ) : (
        <EmptyState
          icon={Plus}
          title="No Journal Entries"
          description="Start by creating your first journal entry."
          action={() => { setEditingEntry(null); setShowForm(true); }}
          actionLabel="Create Entry"
        />
      )}

      <TransactionForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingEntry(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingEntry}
        accounts={availableAccounts}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Entry"
        size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this journal entry? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deleteMutation.isPending}
            onClick={handleConfirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Approve confirmation modal */}
      <Modal
        isOpen={!!pendingApprove}
        onClose={() => setPendingApprove(null)}
        title="Approve Entry"
        size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Approve this journal entry? It will be posted to the ledger.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingApprove(null)}>
            Cancel
          </Button>
          <Button
            variant="success"
            fullWidth
            loading={approveMutation.isPending}
            onClick={handleConfirmApprove}>
            Approve
          </Button>
        </div>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title="Reject Journal Entry"
        size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            required
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setRejectModal(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
