import React, { useEffect, useState, useRef } from "react";
import {
  X,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Save,
  ChevronDown,
  Download,
  Upload,
  Info,
} from "lucide-react";
import { Button, Modal } from "../common";

// ── Template config ────────────────────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  "rollNumber", "name", "class", "section",
  "email", "phone", "nationality", "profession",
  "parentName", "parentEmail", "parentPhone",
  "address", "status", "totalPayable", "totalPaid", "notes",
];

const REQUIRED_COLUMNS = ["rollNumber", "name", "class"];


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

// ──────────────────────────────────────────────────────────────────────────────

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
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (student) {
      setFormData({
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
      setFormData(initialFormData);
    }
    setErrors({});
    setSelectedFile(null);
  }, [student, open]);

  // --- CSV Logic ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
      setErrors({});
    } else {
      setErrors({ bulk: "Please upload a valid CSV file." });
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === "bulk") return handleBulkSubmit();

    // Map Flat State to Schema Structure
    const payload = {
      rollNumber: formData.rollNumber,
      name: formData.name,
      class: formData.class,
      section: formData.section,
      email: formData.email,
      phone: formData.phone,
      nationality: formData.nationality,
      profession: formData.profession,
      address: formData.address,
      status: formData.status,
      notes: formData.notes,
      parent: {
        name: formData.parentName,
        email: formData.parentEmail,
        phone: formData.parentPhone,
      },
      financials: {
        totalPayable: Number(formData.totalPayable) || 0,
        totalPaid: Number(formData.totalPaid) || 0,
      },
    };

    await onSubmit(payload);
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

      <form onSubmit={handleSubmit}>
          {activeTab === "single" ? (
            <div className="space-y-6">
              {/* Personal Info */}
              <SectionTitle title="Basic Information" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Roll Number *"
                  value={formData.rollNumber}
                  onChange={(v) => setFormData({ ...formData, rollNumber: v })}
                  placeholder="e.g. S101"
                />
                <Input
                  label="Full Name *"
                  className="md:col-span-2"
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                />
                <Input
                  label="Class *"
                  value={formData.class}
                  onChange={(v) => setFormData({ ...formData, class: v })}
                />
                <Input
                  label="Section"
                  value={formData.section}
                  onChange={(v) => setFormData({ ...formData, section: v })}
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(v) => setFormData({ ...formData, status: v })}
                  options={["active", "inactive", "suspended"]}
                />
              </div>

              {/* Contact & Parent */}
              <SectionTitle title="Contact & Parent Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(v) => setFormData({ ...formData, email: v })}
                />
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
                <Input
                  label="Parent/Guardian Name"
                  value={formData.parentName}
                  onChange={(v) => setFormData({ ...formData, parentName: v })}
                />
                <Input
                  label="Parent Phone"
                  value={formData.parentPhone}
                  onChange={(v) => setFormData({ ...formData, parentPhone: v })}
                />
              </div>

              {/* Financials */}
              <SectionTitle title="Financial Records" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <Input
                  label="Total Payable Fee ($)"
                  type="number"
                  value={formData.totalPayable}
                  onChange={(v) =>
                    setFormData({ ...formData, totalPayable: v })
                  }
                />
                <Input
                  label="Amount Already Paid ($)"
                  type="number"
                  value={formData.totalPaid}
                  onChange={(v) => setFormData({ ...formData, totalPaid: v })}
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

              {errors.bulk && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle size={14} className="shrink-0" />
                  {errors.bulk}
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
    onClick={onClick}
    className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}>
    {label}
  </button>
);

const Input = ({ label, className = "", onChange, ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-bold text-neutral-600 ml-1">{label}</label>
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 transition"
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-neutral-600 ml-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900 transition">
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
      />
    </div>
  </div>
);

export default StudentFormModal;
