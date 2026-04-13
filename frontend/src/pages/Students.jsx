import { useState, useEffect } from "react";
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
import { useSearchParams } from "react-router-dom";

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
import StudentDetailsModal from "../components/students/StudentDetailsModal";
import SectionHeader from "../components/common/SectionHeader";

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const page = Number(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";

  // Local UI state
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Sync local input if URL changes manually / browser back-forward
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Fetch students
  const { data, isLoading } = useStudents({
    page,
    search: searchTerm,
    limit: 10,
  });

  const students = Array.isArray(data?.students) ? data.students : [];
  const pagination = data?.pagination || { totalPages: 1, total: 0 };

  // Mutations
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const bulkMutation = useBulkCreateStudents();

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentParams = Object.fromEntries(searchParams.entries());

      setSearchParams({
        ...currentParams,
        search: localSearch.trim(),
        page: "1",
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [localSearch, searchParams, setSearchParams]);

  const handlePageChange = (newPage) => {
    const currentParams = Object.fromEntries(searchParams.entries());

    setSearchParams({
      ...currentParams,
      page: String(newPage),
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

  const handleViewStudent = (student) => {
    setViewingStudent(student);
    setShowViewModal(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingStudent(null);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student record?"
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete student:", error);
    }
  };

  const columns = [
    {
      key: "rollNumber",
      label: "Roll #",
      render: (val) => (
        <span className="font-mono font-medium text-neutral-600">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "name",
      label: "Student Info",
      render: (_, row) => (
        <div>
          <p className="font-semibold text-neutral-900">{row?.name || "—"}</p>
          <p className="text-xs text-neutral-500">{row?.email || "No email"}</p>
        </div>
      ),
    },
    {
      key: "class",
      label: "Class",
      render: (val) => <Badge variant="outline">{val || "N/A"}</Badge>,
    },
    {
      key: "financials",
      label: "Pending Fees",
      render: (val) => {
        const pending = val?.pending || 0;
        return (
          <span
            className={
              pending > 0 ? "font-medium text-red-600" : "text-emerald-600"
            }
          >
            {formatCurrency(pending)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={val === "active" ? "success" : "warning"}>
          {val || "unknown"}
        </Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleViewStudent(row)}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100"
            title="View"
          >
            <Eye size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleEditStudent(row)}
            className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleDelete(id)}
            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkMutation.isPending;

  return (
    <div className="space-y-6 p-4">
      <SectionHeader
        icon={Users}
        title="Student Directory"
        description="Overview of all registered students and their status."
        buttonText="Add Student"
        onButtonClick={handleAddStudent}
        buttonIcon={Plus}
      />

      <Card className="border-neutral-200/60">
        <CardContent className="p-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 outline-none transition focus:ring-2 focus:ring-neutral-200"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-neutral-200/60">
        {isLoading ? (
          <div className="py-20 text-center text-neutral-500 animate-pulse">
            Loading records...
          </div>
        ) : students.length > 0 ? (
          <>
            <Table columns={columns} data={students} />

            <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-6 py-4">
              <p className="text-sm text-neutral-600">
                Showing page{" "}
                <span className="font-semibold text-neutral-900">{page}</span> of{" "}
                {pagination.totalPages || 1}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="rounded-lg border border-neutral-200 bg-white p-2 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => handlePageChange(page + 1)}
                  className="rounded-lg border border-neutral-200 bg-white p-2 transition hover:bg-neutral-50 disabled:opacity-50"
                >
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

      <StudentFormModal
        open={showForm}
        onClose={handleCloseForm}
        student={editingStudent}
        isSubmitting={isSubmitting}
        onSubmit={async (payload) => {
          try {
            if (editingStudent?._id) {
              await updateMutation.mutateAsync({
                id: editingStudent._id,
                data: payload,
              });
            } else {
              await createMutation.mutateAsync(payload);
            }

            handleCloseForm();
          } catch (error) {
            console.error("Failed to submit student form:", error);
          }
        }}
        onBulkImport={async (studentsArray) => {
          try {
            await bulkMutation.mutateAsync({ students: studentsArray });
            handleCloseForm();
          } catch (error) {
            console.error("Failed to bulk import students:", error);
          }
        }}
      />

      <StudentDetailsModal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        student={viewingStudent}
      />
    </div>
  );
}