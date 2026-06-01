import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useBulkCreateStudents,
} from "../hooks/useStudents";

import { Table, Badge, Card, Button, Modal } from "../components/common";
import { SectionSkeleton } from "../components/common/Loaders";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/currency";
import StudentFormModal from "../components/students/StudentFormModal";
import StudentDetailsModal from "../components/students/StudentDetailsModal";
import SectionHeader from "../components/common/SectionHeader";

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const { data, isLoading } = useStudents({ page, search: searchTerm, limit: 10 });

  const students = Array.isArray(data?.students) ? data.students : [];
  const pagination = data?.pagination || { totalPages: 1, total: 0 };

  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const bulkMutation = useBulkCreateStudents();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      const trimmedSearch = localSearch.trim();
      if (currentSearch === trimmedSearch) return;
      const currentParams = Object.fromEntries(searchParams.entries());
      if (trimmedSearch) {
        setSearchParams({ ...currentParams, search: trimmedSearch, page: "1" });
      } else {
        const newParams = { ...currentParams };
        delete newParams.search;
        newParams.page = "1";
        setSearchParams(newParams);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [localSearch, setSearchParams]);

  const handlePageChange = (newPage) => {
    const currentParams = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...currentParams, page: String(newPage) });
  };

  const handleCloseForm = () => { setShowForm(false); setEditingStudent(null); };
  const handleAddStudent = () => { setEditingStudent(null); setShowForm(true); };
  const handleViewStudent = (student) => { setViewingStudent(student); setShowViewModal(true); };
  const handleEditStudent = (student) => { setEditingStudent(student); setShowForm(true); };
  const handleCloseViewModal = () => { setShowViewModal(false); setViewingStudent(null); };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(pendingDelete);
    } catch (error) {
      console.error("Failed to delete student:", error);
    } finally {
      setPendingDelete(null);
    }
  };

  const columns = [
    {
      key: "rollNumber",
      label: "Roll #",
      render: (val) => (
        <span className="font-mono font-medium text-neutral-600">{val || "—"}</span>
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
      render: (val) => <Badge variant="default">{val || "N/A"}</Badge>,
    },
    {
      key: "financials",
      label: "Pending Fees",
      render: (val) => {
        const pending = val?.pending || 0;
        return (
          <span className={pending > 0 ? "font-medium text-red-600" : "text-emerald-600"}>
            {formatCurrency(pending)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={val === "active" ? "success" : "warning"}>{val || "unknown"}</Badge>
      ),
    },
    {
      key: "_id",
      label: "Actions",
      render: (id, row) => (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost"
            aria-label={`View ${row.name}'s details`}
            onClick={() => handleViewStudent(row)}>
            <Eye size={15} className="text-neutral-500" />
          </Button>
          <Button size="icon-sm" variant="ghost"
            aria-label={`Edit ${row.name}`}
            onClick={() => handleEditStudent(row)}>
            <Edit2 size={15} className="text-amber-600" />
          </Button>
          <Button size="icon-sm" variant="ghost"
            aria-label={`Delete ${row.name}`}
            onClick={() => setPendingDelete(id)}>
            <Trash2 size={15} className="text-red-600" />
          </Button>
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
    <div className="space-y-4">
      <SectionHeader
        icon={Users}
        title="Student Directory"
        description="Overview of all registered students and their status."
        buttonText="Add Student"
        onButtonClick={handleAddStudent}
        buttonIcon={Plus}
      />

      <Card className="overflow-hidden border-neutral-200/60">
        {isLoading ? (
          <SectionSkeleton rows={6} />
        ) : students.length > 0 ? (
          <>
            <Table columns={columns} data={students} searchable={false} paginated={false} />

            <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-6 py-4">
              <p className="text-sm text-neutral-600">
                Showing page{" "}
                <span className="font-semibold text-neutral-900">{page}</span>{" "}
                of {pagination.totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}>
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => handlePageChange(page + 1)}>
                  <ChevronRight size={16} />
                </Button>
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

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Student"
        size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this student record? This action cannot be undone.
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

      <StudentFormModal
        open={showForm}
        onClose={handleCloseForm}
        student={editingStudent}
        isSubmitting={isSubmitting}
        onSubmit={async (payload) => {
          try {
            if (editingStudent?._id) {
              await updateMutation.mutateAsync({ id: editingStudent._id, data: payload });
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
