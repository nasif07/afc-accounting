import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Users, Mail, MapPin, CreditCard, Briefcase } from "lucide-react";
import {
  useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
} from "../hooks/useEmployees";
import SectionHeader from "../components/common/SectionHeader";
import { Input, Select, Textarea, Button, Modal, Badge, Table } from "../components/common";

// Defined outside component — stable reference, no recreations on every render
const STATUS_OPTIONS = ["active", "inactive", "on-leave", "resigned"];

const EMPTY_FORM = {
  employeeCode: "", name: "", email: "", phone: "",
  designation: "teacher", department: "",
  dateOfJoining: "", dateOfBirth: "",
  address: "", city: "", state: "", zipCode: "", country: "",
  bankAccountNumber: "", bankName: "", status: "active", notes: "",
};

const statusVariant = (s) =>
  s === "active" ? "success" : s === "on-leave" ? "warning" : "secondary";

export default function Employees() {
  const { data: items = [], isLoading: loading } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = () => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit   = (emp) => {
    const f = { ...emp };
    if (f.dateOfJoining) f.dateOfJoining = f.dateOfJoining.split("T")[0];
    if (f.dateOfBirth)   f.dateOfBirth   = f.dateOfBirth.split("T")[0];
    setFormData(f);
    setEditingId(emp._id);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      key: "name",
      label: "Employee",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
            {value?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{value}</p>
            <p className="font-mono text-xs text-gray-500">#{row.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      label: "Designation",
      render: (value) => (
        <span className="text-sm capitalize text-gray-600">{value?.replace("_", " ")}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <Badge variant={statusVariant(value)}>{value}</Badge>,
    },
    {
      key: "department",
      label: "Department",
      render: (value) => <span className="text-sm text-gray-600">{value || "N/A"}</span>,
    },
    {
      key: "_id",
      label: "Actions",
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.name}`}
            onClick={() => openEdit(row)}>
            <Edit2 size={15} className="text-blue-600" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${row.name}`}
            onClick={() => setPendingDelete(value)}>
            <Trash2 size={15} className="text-red-600" />
          </Button>
        </div>
      ),
    },
  ], []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Users}
        title="Employee Directory"
        description="Comprehensive management of staff records, payroll data, and employment status."
        buttonText="Add Employee"
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
        emptyMessage="No employees found."
      />

      {/* Employee Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Employee Profile" : "New Employee Registration"}
        description="Provide all details to maintain an accurate staff record."
        size="2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Briefcase size={14} aria-hidden="true" /> Professional Info
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="Employee Code" name="employeeCode" value={formData.employeeCode}
                onChange={handleChange} required />
              <Input label="Full Name" name="name" value={formData.name}
                onChange={handleChange} required />
              <Select label="Status" name="status" value={formData.status}
                onChange={handleChange}
                options={STATUS_OPTIONS.map((o) => ({ value: o, label: o }))} />
              <Input label="Designation" name="designation" value={formData.designation}
                onChange={handleChange} />
              <Input label="Department" name="department" value={formData.department}
                onChange={handleChange} />
              <Input label="Joining Date" type="date" name="dateOfJoining"
                value={formData.dateOfJoining} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Mail size={14} aria-hidden="true" /> Contact &amp; Personal
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="Email" type="email" name="email" value={formData.email}
                onChange={handleChange} />
              <Input label="Phone" type="tel" name="phone" value={formData.phone}
                onChange={handleChange} />
              <Input label="Date of Birth" type="date" name="dateOfBirth"
                value={formData.dateOfBirth} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <MapPin size={14} aria-hidden="true" /> Address Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Input label="Street Address" name="address" value={formData.address}
                  onChange={handleChange} />
              </div>
              <Input label="City" name="city" value={formData.city} onChange={handleChange} />
              <Input label="State/Province" name="state" value={formData.state} onChange={handleChange} />
              <Input label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} />
              <Input label="Country" name="country" value={formData.country} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <CreditCard size={14} aria-hidden="true" /> Financial &amp; Notes
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
              <Input label="Account Number" name="bankAccountNumber"
                value={formData.bankAccountNumber} onChange={handleChange} />
              <div className="md:col-span-2">
                <Textarea label="Administrative Notes" name="notes" rows={3}
                  value={formData.notes} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-100 pt-6">
            <Button type="submit" size="lg" loading={isSaving}>
              {editingId ? "Update Employee Record" : "Register Employee"}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete Employee" size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this employee? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" fullWidth loading={deleteMutation.isPending} onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
