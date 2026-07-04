import { useEffect, useState, useRef } from "react";
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Save,
  Download,
  Upload,
  Info,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Modal, Input, Select } from "../common";

// ── Template config ────────────────────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  "rollNumber", "name", "class", "section",
  "email", "phone", "nationality", "profession",
  "parentName", "parentEmail", "parentPhone",
  "address", "status", "totalPayable", "totalPaid", "notes",
];

const REQUIRED_COLUMNS = ["rollNumber", "name", "class"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

const downloadTemplate = () => {
  const rows   = [TEMPLATE_COLUMNS];
  const csv    = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href     = url;
  anchor.download = "student-import-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

// ── Zod validation schema ────────────────────────────────────────────────────
// Mirrors backend/src/validation/student.validation.js. That schema uses bare
// `.optional()` for email (both the student's own and parent.email), which —
// since this form always sends "" rather than omitting an untouched field —
// actually rejects blank values today (a live bug: admitting a student with
// the Email or Parent Email field left blank currently 400s). The preprocess
// below fixes that by treating "" as "not provided", matching what "optional"
// was always meant to mean.
//
// Known separate issue, NOT fixed here (would require a backend schema
// change, out of scope for this validation-layer conversion): the backend's
// createStudentBody/updateStudentBody schemas don't declare a `financials`
// field at all, so the parsed body silently drops it — the Total Payable Fee
// and Amount Already Paid inputs on this form do not currently persist
// anything server-side, on create or edit. Confirmed directly against the
// schema. Flagging for a follow-up decision rather than fixing inline.
const blankToUndefined = (v) => (v === "" || v == null ? undefined : v);
const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email("Enter a valid email address").optional(),
);

const studentSchema = z.object({
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  name: z.string().trim().min(1, "Name is required"),
  class: z.string().trim().min(1, "Class is required"),
  section: z.string().trim().optional(),
  email: optionalEmail,
  phone: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  profession: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentEmail: optionalEmail,
  parentPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(STATUS_OPTIONS).optional(),
  totalPayable: z.coerce.number().min(0, "Must be 0 or greater").optional(),
  totalPaid: z.coerce.number().min(0, "Must be 0 or greater").optional(),
  notes: z.string().trim().optional(),
});

const initialFormData = {
  rollNumber: "",
  name: "",
  class: "",
  section: "",
  email: "",
  phone: "",
  nationality: "Unknown",
  profession: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
  status: "active",
  totalPayable: 0,
  totalPaid: 0,
  notes: "",
};

const StudentFormModal = ({
  open,
  onClose,
  student = null,
  onSubmit,
  onBulkImport,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState("single");
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkError, setBulkError] = useState("");
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(studentSchema), defaultValues: initialFormData });

  useEffect(() => {
    if (student) {
      reset({
        rollNumber: student.rollNumber || "",
        name: student.name || "",
        class: student.class || "",
        section: student.section || "",
        email: student.email || "",
        phone: student.phone || "",
        nationality: student.nationality || "Unknown",
        profession: student.profession || "",
        parentName: student.parent?.name || "",
        parentEmail: student.parent?.email || "",
        parentPhone: student.parent?.phone || "",
        address: student.address || "",
        status: student.status || "active",
        totalPayable: student.financials?.totalPayable || 0,
        totalPaid: student.financials?.totalPaid || 0,
        notes: student.notes || "",
      });
    } else {
      reset(initialFormData);
    }
    setBulkError("");
    setSelectedFile(null);
  }, [student, open, reset]);

  // --- CSV Logic (unrelated to the RHF single-entry form above) ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
      setBulkError("");
    } else {
      setBulkError("Please upload a valid CSV file.");
    }
  };

  const handleBulkSubmit = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((h, i) => {
          // Logic to handle nested parent/financials in CSV if needed
          if (["totalPayable", "totalPaid"].includes(h)) {
            if (!row.financials) row.financials = {};
            row.financials[h] = Number(values[i]) || 0;
          } else if (h.startsWith("parent")) {
            if (!row.parent) row.parent = {};
            const key = h.replace("parent", "").toLowerCase();
            row.parent[key] = values[i];
          } else {
            row[h] = values[i];
          }
        });
        return row;
      });
      await onBulkImport(data);
    };
    reader.readAsText(selectedFile);
  };

  // --- Single Entry Logic ---
  const onSubmitSingle = async (data) => {
    const payload = {
      rollNumber: data.rollNumber,
      name: data.name,
      class: data.class,
      section: data.section,
      email: data.email,
      phone: data.phone,
      nationality: data.nationality,
      profession: data.profession,
      address: data.address,
      status: data.status,
      notes: data.notes,
      parent: {
        name: data.parentName,
        email: data.parentEmail,
        phone: data.parentPhone,
      },
      financials: {
        totalPayable: Number(data.totalPayable) || 0,
        totalPaid: Number(data.totalPaid) || 0,
      },
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      // Backend validation failures (errorMiddleware.js) come back as
      // errors: [{ field, message }] — map each to its form field. Field
      // names here are flat (e.g. "email"), matching the backend's top-level
      // fields; a nested "parent.email" failure would need path-based mapping
      // if the backend ever starts emitting one (it currently strips
      // unrecognized nested issues the same as any other unknown field).
      const fieldErrors = err?.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (activeTab === "bulk") return handleBulkSubmit();
    return handleSubmit(onSubmitSingle)(e);
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={student ? "Edit Student Profile" : "New Student Admission"}
      description="Ensure all mandatory fields are filled."
      size="3xl"
    >
      {/* Tabs */}
      {!student && (
        <div className="flex px-6 border-b border-neutral-100 bg-neutral-50/50 mb-3">
          <TabBtn
            active={activeTab === "single"}
            onClick={() => setActiveTab("single")}
            label="Single Entry"
          />
          <TabBtn
            active={activeTab === "bulk"}
            onClick={() => setActiveTab("bulk")}
            label="Bulk CSV Upload"
          />
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate>
          {activeTab === "single" ? (
            <div className="space-y-6">
              {/* Personal Info */}
              <SectionTitle title="Basic Information" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Roll Number"
                  required
                  placeholder="e.g. S101"
                  error={errors.rollNumber?.message}
                  touched={!!errors.rollNumber}
                  {...register("rollNumber")}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Full Name"
                    required
                    error={errors.name?.message}
                    touched={!!errors.name}
                    {...register("name")}
                  />
                </div>
                <Input
                  label="Class"
                  required
                  error={errors.class?.message}
                  touched={!!errors.class}
                  {...register("class")}
                />
                <Input label="Section" {...register("section")} />
                <Select
                  label="Status"
                  options={STATUS_OPTIONS.map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                  {...register("status")}
                />
              </div>

              {/* Contact & Parent */}
              <SectionTitle title="Contact & Parent Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  error={errors.email?.message}
                  touched={!!errors.email}
                  {...register("email")}
                />
                <Input label="Phone Number" {...register("phone")} />
                <Input label="Parent/Guardian Name" {...register("parentName")} />
                <Input
                  label="Parent Email"
                  type="email"
                  error={errors.parentEmail?.message}
                  touched={!!errors.parentEmail}
                  {...register("parentEmail")}
                />
                <Input label="Parent Phone" {...register("parentPhone")} />
              </div>

              {/* Financials */}
              <SectionTitle title="Financial Records" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <Input
                  label="Total Payable Fee"
                  type="number"
                  step="0.01"
                  error={errors.totalPayable?.message}
                  touched={!!errors.totalPayable}
                  {...register("totalPayable")}
                />
                <Input
                  label="Amount Already Paid"
                  type="number"
                  step="0.01"
                  error={errors.totalPaid?.message}
                  touched={!!errors.totalPaid}
                  {...register("totalPaid")}
                />
                <div className="md:col-span-2 text-xs text-amber-700 font-medium">
                  Note: Pending balance is calculated automatically.
                </div>
              </div>
            </div>
          ) : (
            /* ── Bulk CSV UI ── */
            <div className="space-y-4">

              {/* Instructions panel */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-blue-900">
                      CSV Format Instructions
                    </p>
                  </div>
                </div>

                <p className="text-xs text-blue-700 leading-relaxed">
                  Upload a <span className="font-semibold">.csv</span> file where
                  the <span className="font-semibold">first row is the header</span>.
                  Columns marked <span className="font-semibold text-blue-900">bold</span> are
                  required — all others are optional.
                  Use the template above to get the exact column order and sample data.
                </p>

                {/* Column tags */}
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_COLUMNS.map((col) => {
                    const required = REQUIRED_COLUMNS.includes(col);
                    return (
                      <span
                        key={col}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                          required
                            ? "border-blue-300 bg-blue-100 font-bold text-blue-800"
                            : "border-neutral-200 bg-white text-neutral-500"
                        }`}>
                        {col}
                        {required && <span className="ml-0.5 text-blue-500">*</span>}
                      </span>
                    );
                  })}
                </div>

                <p className="text-[11px] text-blue-500">
                  <span className="font-semibold">status</span> must be one of:{" "}
                  <code className="rounded bg-blue-100 px-1">active</code>,{" "}
                  <code className="rounded bg-blue-100 px-1">inactive</code>,{" "}
                  <code className="rounded bg-blue-100 px-1">suspended</code>.{" "}
                  <span className="font-semibold">totalPayable</span> and{" "}
                  <span className="font-semibold">totalPaid</span> must be numbers.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-10 transition ${
                  selectedFile
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white"
                }`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div
                  className={`mb-3 rounded-full p-3 ${
                    selectedFile
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-neutral-400 shadow-sm"
                  }`}>
                  {selectedFile ? <CheckCircle2 size={28} /> : <Upload size={28} />}
                </div>
                <p className="font-bold text-neutral-900">
                  {selectedFile ? selectedFile.name : "Click to select a CSV file"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {selectedFile
                    ? "File ready — click Import CSV below to upload"
                    : "Only .csv files are accepted"}
                </p>
              </div>

              {bulkError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle size={14} className="shrink-0" />
                  {bulkError}
                </div>
              )}

            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 pt-6">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>

            {/* Download Template — shown in footer only on bulk tab */}
            {activeTab === "bulk" && (
              <Button
                type="button"
                onClick={downloadTemplate}
                variant="outline"
                size="sm"
              >
                <Download size={12} />
                Download Template
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (activeTab === "bulk" && !selectedFile)}
              variant="default"
              size="sm"
            >
              {isSubmitting ? (
                "Processing…"
              ) : student ? (
                <><Save size={18} /> Update Record</>
              ) : activeTab === "bulk" ? (
                <><Upload size={18} /> Import CSV</>
              ) : (
                <><UserPlus size={18} /> Admission Done</>
              )}
            </Button>
          </div>
        </form>
    </Modal>
  );
};

// --- Sub-components ---
const SectionTitle = ({ title }) => (
  <h4 className="text-[10px] uppercase tracking-[2px] font-black text-neutral-400 mb-2">
    {title}
  </h4>
);

const TabBtn = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}>
    {label}
  </button>
);

export default StudentFormModal;
