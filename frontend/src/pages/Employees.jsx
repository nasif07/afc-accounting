import { useMemo, useState, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Mail,
  MapPin,
  CreditCard,
  Briefcase,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "../hooks/useEmployees";
import SectionHeader from "../components/common/SectionHeader";
import {
  Input,
  Select,
  Textarea,
  Button,
  Modal,
  Badge,
  Table,
  DatePicker,
} from "../components/common";
import EmployeeDetailsModal from "../components/employees/EmployeeDetailsModal";

const STATUS_OPTIONS = ["active", "inactive", "on-leave", "resigned"];

const EMPTY_FORM = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  designation: "teacher",
  department: "",
  dateOfJoining: "",
  dateOfBirth: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  bankAccountNumber: "",
  bankName: "",
  status: "active",
  notes: "",
  // Emergency contact
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  emergencyContactAltPhone: "",
  emergencyContactAddress: "",
};

const statusVariant = (s) =>
  s === "active" ? "success" : s === "on-leave" ? "warning" : "secondary";

// ── Zod validation schema ────────────────────────────────────────────────────
// Mirrors backend/src/validation/employee.validation.js exactly. That schema
// uses bare `.optional()` for email/dateOfBirth, which — since the form always
// sends "" rather than omitting an untouched field — actually rejects blank
// values today (a live bug: creating an employee with the Email or Date of
// Birth field left blank currently 400s). The preprocess below fixes that by
// treating "" as "not provided", matching what "optional" was always meant to
// mean, without changing what the field validates when a value IS given.
const blankToUndefined = (v) => (v === "" || v == null ? undefined : v);

const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email("Enter a valid email address").optional(),
);
const optionalDate = z.preprocess(blankToUndefined, z.string().optional());

const employeeSchema = z.object({
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: optionalEmail,
  phone: z.string().trim().optional(),
  designation: z.string().trim().min(1, "Designation is required"),
  department: z.string().trim().optional(),
  dateOfJoining: z.string().min(1, "Joining date is required"),
  dateOfBirth: optionalDate,
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  status: z.string().optional(),
  notes: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactRelationship: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactAltPhone: z.string().trim().optional(),
  emergencyContactAddress: z.string().trim().optional(),
});

export default function Employees() {
  const { data: items = [], isLoading: loading } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(employeeSchema), defaultValues: EMPTY_FORM });

  const openCreate = () => {
    reset(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = useCallback(
    (emp) => {
      const f = { ...EMPTY_FORM, ...emp };
      if (f.dateOfJoining) f.dateOfJoining = f.dateOfJoining.split("T")[0];
      if (f.dateOfBirth) f.dateOfBirth = f.dateOfBirth.split("T")[0];
      reset(f);
      setEditingId(emp._id);
      setShowModal(true);
    },
    [reset],
  );

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      // useEmployees.js's mutationFn normalizes thrown errors to
      // { message, errors? } — same shape as every Redux slice's
      // rejectWithValue — so this reads err.errors directly now.
      const fieldErrors = err?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
      }
    }
  };

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync(pendingDelete);
    setPendingDelete(null);
  };

  const columns = useMemo(
    () => [
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
              <p className="font-semibold text-slate-900">{value}</p>
              <p className="font-mono text-xs text-slate-500">
                #{row.employeeCode}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "designation",
        label: "Designation",
        render: (value) => (
          <span className="text-sm capitalize text-slate-600">
            {value?.replace("_", " ")}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (value) => (
          <Badge variant={statusVariant(value)}>{value}</Badge>
        ),
      },
      {
        key: "department",
        label: "Department",
        render: (value) => (
          <span className="text-sm text-slate-600">{value || "N/A"}</span>
        ),
      },
      {
        key: "_id",
        label: "Actions",
        render: (value, row) => (
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`View ${row.name}`}
              title="View details"
              onClick={() => setViewEmployee(row)}>
              <Eye size={15} className="text-indigo-500" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Edit ${row.name}`}
              onClick={() => openEdit(row)}>
              <Edit2 size={15} className="text-blue-600" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete ${row.name}`}
              onClick={() => setPendingDelete(value)}>
              <Trash2 size={15} className="text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    [openEdit],
  );

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

      {/* ── Employee Details Modal ── */}
      <EmployeeDetailsModal
        employee={viewEmployee}
        isOpen={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        onEdit={openEdit}
      />

      {/* ── Employee Form Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingId ? "Edit Employee Profile" : "New Employee Registration"
        }
        description="Provide all details to maintain an accurate staff record."
        size="3xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
          {/* Professional Info */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Briefcase size={14} aria-hidden="true" /> Professional Info
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Employee Code"
                required
                error={errors.employeeCode?.message}
                touched={!!errors.employeeCode}
                {...register("employeeCode")}
              />
              <Input
                label="Full Name"
                required
                error={errors.name?.message}
                touched={!!errors.name}
                {...register("name")}
              />
              <Select
                label="Status"
                options={STATUS_OPTIONS.map((o) => ({ value: o, label: o }))}
                {...register("status")}
              />
              <Input
                label="Designation"
                error={errors.designation?.message}
                touched={!!errors.designation}
                {...register("designation")}
              />
              <Input label="Department" {...register("department")} />
              <Controller
                name="dateOfJoining"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Joining Date"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.dateOfJoining?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Contact & Personal */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Mail size={14} aria-hidden="true" /> Contact &amp; Personal
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                touched={!!errors.email}
                {...register("email")}
              />
              <Input label="Phone" type="tel" {...register("phone")} />
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date of Birth"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.dateOfBirth?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Address Details */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <MapPin size={14} aria-hidden="true" /> Address Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Input label="Street Address" {...register("address")} />
              </div>
              <Input label="City" {...register("city")} />
              <Input label="State/Province" {...register("state")} />
              <Input label="Zip Code" {...register("zipCode")} />
              <Input label="Country" {...register("country")} />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-500">
              <ShieldAlert size={14} aria-hidden="true" /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="Contact Name" {...register("emergencyContactName")} />
              <Input label="Relationship" {...register("emergencyContactRelationship")} />
              <Input label="Phone Number" type="tel" {...register("emergencyContactPhone")} />
              <Input label="Alternative Phone" type="tel" {...register("emergencyContactAltPhone")} />
              <div className="md:col-span-2">
                <Input label="Address" {...register("emergencyContactAddress")} />
              </div>
            </div>
          </div>

          {/* Financial & Notes */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <CreditCard size={14} aria-hidden="true" /> Financial &amp; Notes
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Bank Name" {...register("bankName")} />
              <Input label="Account Number" {...register("bankAccountNumber")} />
              <div className="md:col-span-2">
                <Textarea label="Administrative Notes" rows={3} {...register("notes")} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-6">
            <Button type="submit" size="sm" loading={isSaving}>
              <Edit2 size={12} className="text-white" />
              {editingId ? "Update Employee Record" : "Register Employee"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(false)}>
              <Trash2 size={12} className="text-slate-600" />
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Employee"
        size="lg">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this employee? This action cannot be
          undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deleteMutation.isPending}
            onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
