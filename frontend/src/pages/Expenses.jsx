import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, CheckCircle, DollarSign, Calendar, Tag } from "lucide-react";
import { useSelector } from "react-redux";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useExpenses, useCreateExpense, useUpdateExpense,
  useDeleteExpense, useApproveExpense,
} from "../hooks/useExpenses";
import { useVendors } from "../hooks/useVendors";
import SectionHeader from "../components/common/SectionHeader";
import { Input, Select, Button, Modal, Badge, Table, Card, CardContent } from "../components/common";

const EXPENSE_CATEGORIES = ["utilities", "maintenance", "supplies", "travel", "equipment", "other"];
const PAYMENT_MODES      = ["bank", "cheque", "card", "cash", "online"];

const statusVariant = (s) =>
  s === "approved" ? "success" : s === "rejected" ? "danger" : "warning";

// ── Zod validation schema ────────────────────────────────────────────────────
const expenseSchema = z.object({
  description:   z.string().min(3, "Description must be at least 3 characters"),
  amount:        z.coerce.number({ invalid_type_error: "Enter a valid amount" }).positive("Amount must be greater than 0"),
  category:      z.string().min(1, "Category is required"),
  vendor:        z.string().optional(),
  paymentMode:   z.string().min(1, "Payment mode is required"),
  invoiceNumber: z.string().optional(),
  invoiceDate:   z.string().optional(),
});

const EMPTY_VALUES = {
  description: "", amount: "", category: "utilities",
  vendor: "", paymentMode: "bank", invoiceNumber: "", invoiceDate: "",
};

export default function Expenses() {
  const { user } = useSelector((s) => s.auth);

  // ── React Query data ────────────────────────────────────────────────────────
  const { data: items = [], isLoading: loading } = useExpenses();
  const { data: vendors = [] }                   = useVendors();
  const createMutation  = useCreateExpense();
  const updateMutation  = useUpdateExpense();
  const deleteMutation  = useDeleteExpense();
  const approveMutation = useApproveExpense();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // ── React Hook Form ─────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm({ resolver: zodResolver(expenseSchema), defaultValues: EMPTY_VALUES });

  const openCreate = () => { reset(EMPTY_VALUES); setEditingId(null); setShowModal(true); };
  const openEdit   = (expense) => {
    reset({
      ...EMPTY_VALUES,
      ...expense,
      amount:      String(expense.amount || ""),
      invoiceDate: expense.invoiceDate ? expense.invoiceDate.split("T")[0] : "",
      vendor:      expense.vendor?._id || expense.vendor || "",
    });
    setEditingId(expense._id);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync(pendingDelete);
    setPendingDelete(null);
  };

  // ── Memoised stats ─────────────────────────────────────────────────────────
  const { totalAmount, pendingCount, approvedTotal } = useMemo(() => ({
    totalAmount:   items.reduce((s, c) => s + (c.amount || 0), 0),
    pendingCount:  items.filter((i) => i.approvalStatus === "pending").length,
    approvedTotal: items.filter((i) => i.approvalStatus === "approved")
                        .reduce((s, c) => s + c.amount, 0),
  }), [items]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: "description",
      label: "Expense Details",
      render: (value, row) => (
        <div>
          <p className="font-semibold text-slate-800">{value}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Calendar size={12} />
            {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "—"} ·{" "}
            {row.vendor?.vendorName || "No Vendor"}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (value) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600 capitalize">
          <Tag size={14} className="text-slate-400" /> {value}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (value, row) => (
        <div>
          <p className="font-bold text-slate-900">৳{value?.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-tight text-slate-400">{row.paymentMode}</p>
        </div>
      ),
    },
    {
      key: "approvalStatus",
      label: "Status",
      render: (value) => <Badge variant={statusVariant(value)}>{value?.toUpperCase() || "PENDING"}</Badge>,
    },
    {
      key: "_id",
      label: "Actions",
      render: (value, row) => (
        <div className="flex items-center gap-1">
          {row.approvalStatus === "pending" && (
            <>
              <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.description}`}
                onClick={() => openEdit(row)}>
                <Edit2 size={15} className="text-blue-600" />
              </Button>
              {user?.role === "director" && (
                <Button size="icon-sm" variant="ghost" aria-label={`Approve ${row.description}`}
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(value)}>
                  <CheckCircle size={15} className="text-emerald-600" />
                </Button>
              )}
              <Button size="icon-sm" variant="ghost" aria-label={`Delete ${row.description}`}
                onClick={() => setPendingDelete(value)}>
                <Trash2 size={15} className="text-rose-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [user, approveMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={DollarSign}
        title="Expense Tracker"
        description="Monitor and manage institutional spending and vendor payouts."
        buttonText="New Expense"
        onButtonClick={openCreate}
        buttonIcon={Plus}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Total Expenses",      value: `৳${totalAmount.toLocaleString()}`,    color: "text-slate-900"   },
          { label: "Pending Approval",    value: String(pendingCount),                  color: "text-amber-600"   },
          { label: "Approved This Month", value: `৳${approvedTotal.toLocaleString()}`,  color: "text-emerald-700" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="p-4">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            searchable
            paginated
            pageSize={10}
            emptyMessage="No expenses found."
          />
        </div>
      </Card>

      {/* Expense Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? "Update Expense Record" : "New Expense Entry"}
        size="lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Description" required placeholder="What was this expense for?"
                {...register("description")}
                error={errors.description?.message}
                touched={!!errors.description}
              />
            </div>

            <Input
              label="Amount (৳)" type="number" required
              {...register("amount")}
              error={errors.amount?.message}
              touched={!!errors.amount}
            />

            <Select label="Category" required {...register("category")}
              error={errors.category?.message} touched={!!errors.category}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </Select>

            <Select label="Vendor" {...register("vendor")}>
              <option value="">No Vendor</option>
              {vendors.map((v) => <option key={v._id} value={v._id}>{v.vendorName}</option>)}
            </Select>

            <Select label="Payment Mode" required {...register("paymentMode")}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </Select>

            <Input label="Invoice Number" placeholder="Optional" {...register("invoiceNumber")} />

            <Input label="Invoice Date" type="date" {...register("invoiceDate")} />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary"
              onClick={() => { setShowModal(false); setEditingId(null); }}>
              Discard
            </Button>
            <Button type="submit" loading={isSaving} fullWidth>
              {editingId ? "Update Record" : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete Expense" size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this expense? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" fullWidth loading={deleteMutation.isPending} onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
