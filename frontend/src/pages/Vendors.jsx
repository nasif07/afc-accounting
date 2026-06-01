import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Store, User, ClipboardList, Power } from "lucide-react";
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
} from "../hooks/useVendors";
import SectionHeader from "../components/common/SectionHeader";
import { Input, Select, Textarea, Button, Modal, Badge, Table } from "../components/common";

const PAYMENT_TERMS = ["net-15", "net-30", "net-60", "due-on-receipt", "custom"];

// Stable constant — defined outside component
const EMPTY_FORM = {
  vendorCode: "", vendorName: "", contactPerson: "",
  email: "", phone: "", address: "",
  paymentTerms: "net-30", taxId: "", isActive: true,
};

export default function Vendors() {
  const { data: items = [], isLoading: loading } = useVendors();
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = () => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit   = (vendor) => {
    setFormData({
      vendorCode:    vendor.vendorCode    || "",
      vendorName:    vendor.vendorName    || "",
      contactPerson: vendor.contactPerson || "",
      email:         vendor.email         || "",
      phone:         vendor.phone         || "",
      address:       vendor.address       || "",
      paymentTerms:  vendor.paymentTerms  || "net-30",
      taxId:         vendor.taxId         || "",
      isActive:      vendor.isActive      ?? true,
    });
    setEditingId(vendor._id);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync(pendingDelete);
    setPendingDelete(null);
  };

  const columns = useMemo(() => [
    {
      key: "vendorName",
      label: "Vendor & Code",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-600 text-sm">
            {value?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{value}</p>
            <p className="font-mono text-[11px] uppercase text-slate-500">{row.vendorCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact Person",
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value || "—"}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (value) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "success" : "secondary"}>{value ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.vendorName}`}
            onClick={() => openEdit(row)}>
            <Edit2 size={15} className="text-blue-600" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${row.vendorName}`}
            onClick={() => setPendingDelete(value)}>
            <Trash2 size={15} className="text-rose-600" />
          </Button>
        </div>
      ),
    },
  ], []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Store}
        title="Vendor Management"
        description="Manage supplier profiles, payment terms, and tax documentation."
        buttonText="Add Vendor"
        onButtonClick={openCreate}
        buttonIcon={Plus}
      />

      <Table
        columns={columns}
        data={items}
        loading={loading}
        searchable
        paginated
        pageSize={10}
        emptyMessage="No vendors found."
      />

      {/* Vendor Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Update Vendor Profile" : "Vendor Registration"}
        description="Synced with Master Database"
        size="2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              <Store size={13} aria-hidden="true" /> Identity &amp; Registration
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Input label="Vendor Code" name="vendorCode" value={formData.vendorCode}
                onChange={handleChange} required placeholder="VND-001" />
              <Input label="Business Name" name="vendorName" value={formData.vendorName}
                onChange={handleChange} required placeholder="Company Ltd." />
              <Input label="Tax ID / GSTIN" name="taxId" value={formData.taxId}
                onChange={handleChange} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-4">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
              <User size={13} aria-hidden="true" /> Contact Person Details
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Input label="Full Name" name="contactPerson" value={formData.contactPerson}
                onChange={handleChange} placeholder="Manager Name" />
              <Input label="Email Address" type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="vendor@email.com" />
              <Input label="Phone Number" type="tel" name="phone" value={formData.phone}
                onChange={handleChange} placeholder="+1..." />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
                <ClipboardList size={13} aria-hidden="true" /> Payment Terms
              </p>
              <Select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange}>
                {PAYMENT_TERMS.map((term) => (
                  <option key={term} value={term}>{term.replace(/-/g, " ")}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                <Power size={13} aria-hidden="true" /> Account Status
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                <input type="checkbox" name="isActive" checked={formData.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-slate-700">Vendor is Active and Verified</span>
              </label>
            </div>
          </div>

          <Textarea label="Business Address" name="address" rows={3}
            value={formData.address} onChange={handleChange}
            placeholder="Full physical address..." />

          <div className="flex gap-4 border-t border-slate-100 pt-6">
            <Button type="submit" size="lg" loading={isSaving} fullWidth>
              {editingId ? "Update Record" : "Create Vendor"}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete Vendor" size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this vendor? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" fullWidth loading={deleteMutation.isPending} onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
