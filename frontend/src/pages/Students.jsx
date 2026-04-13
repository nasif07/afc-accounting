import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom"; // navigate removed as we use Modal now
import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useBulkCreateStudents,
} from "../hooks/useStudents";

import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/EmptyState";
import { Card, CardContent } from "../components/ui/Card";
import { formatCurrency } from "../utils/currency";
import StudentFormModal from "../components/students/StudentFormModal";
import StudentDetailsModal from "../components/students/StudentDetailsModal"; // Import the new modal
import SectionHeader from "../components/common/SectionHeader";

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State from URL ---
  const page = parseInt(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // --- UI States ---
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // --- Viewing Modal States ---
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  // --- Backend Data Fetching ---
  const { data, isLoading } = useStudents({
    page,
    search: searchTerm,
    limit: 10,
  });

  const students = data?.students || [];
  const pagination = data?.pagination || { totalPages: 1, total: 0 };

  // --- Mutations ---
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const bulkMutation = useBulkCreateStudents();

  // --- Debounced Search Logic ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchParams({
        ...Object.fromEntries(searchParams),
        search: localSearch,
        page: "1",
      });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [localSearch]);

  // --- Handlers ---
  const handlePageChange = (newPage) => {
    setSearchParams({
      ...Object.fromEntries(searchParams),
      page: newPage.toString(),
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this student record?")
    ) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // --- Table Configuration ---
  const columns = [
    {
      key: "rollNumber",
      label: "Roll #",
      render: (val) => (
        <span className="font-mono font-medium text-neutral-600">{val}</span>
      ),
    },
    {
      key: "name",
      label: "Student Info",
      render: (_, row) => (
        <div>
          <p className="font-semibold text-neutral-900">{row.name}</p>
          <p className="text-xs text-neutral-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "class",
      label: "Class",
      render: (val) => <Badge variant="outline">{val}</Badge>,
    },
    {
      key: "financials",
      label: "Pending Fees",
      render: (val) => (
        <span
          className={
            val?.pending > 0 ? "text-red-600 font-medium" : "text-emerald-600"
          }>
          {formatCurrency(val?.pending || 0)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={val === "active" ? "success" : "warning"}>{val}</Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (id, row) => (
        <div className="flex gap-2">
          {/* View Button - Updated to open Modal */}
          <button
            onClick={() => {
              setViewingStudent(row);
              setShowViewModal(true);
            }}
            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500">
            <Eye size={16} />
          </button>

          <button
            onClick={() => {
              setEditingStudent(row);
              setShowForm(true);
            }}
            className="p-2 hover:bg-amber-50 rounded-lg text-amber-600">
            <Edit2 size={16} />
          </button>

          <button
            onClick={() => handleDelete(id)}
            className="p-2 hover:bg-red-50 rounded-lg text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Section */}
      <SectionHeader
        icon={Users}
        title="Student Directory"
        description="Overview of all registered students and their status."
        buttonText="Add Student"
        onButtonClick={handleAddStudent}
        buttonIcon={Plus}
      />

      {/* 2. Search Card */}
      <Card className="border-neutral-200/60 shadow-sm">
        <CardContent className="p-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-200 outline-none transition"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Table Section */}
      <Card className="border-neutral-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-neutral-500 animate-pulse">
            Loading records...
          </div>
        ) : students.length > 0 ? (
          <>
            <Table columns={columns} data={students} />

            <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 border-t border-neutral-100">
              <p className="text-sm text-neutral-600">
                Showing page{" "}
                <span className="font-semibold text-neutral-900">{page}</span>{" "}
                of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 transition">
                  <ChevronLeft size={18} />
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 transition">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={searchTerm ? "No results found" : "No students yet"}
            description="Try adjusting your search or add a new student."
          />
        )}
      </Card>

      {/* 4. Student Form Modal (Add/Edit/Bulk) */}
      <StudentFormModal
        open={showForm}
        onClose={handleCloseForm}
        student={editingStudent}
        isSubmitting={
          createMutation.isPending ||
          updateMutation.isPending ||
          bulkMutation.isPending
        }
        onSubmit={async (payload) => {
          if (editingStudent?._id) {
            await updateMutation.mutateAsync({
              id: editingStudent._id,
              data: payload,
            });
          } else {
            await createMutation.mutateAsync(payload);
          }
          handleCloseForm();
        }}
        onBulkImport={async (studentsArray) => {
          await bulkMutation.mutateAsync({ students: studentsArray });
          handleCloseForm();
        }}
      />

      {/* 5. Student View Details Modal */}
      <StudentDetailsModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        student={viewingStudent}
      />
    </div>
  );
}
