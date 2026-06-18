import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  clearError,
} from "../store/slices/journalSlice";
import { fetchAccounts } from "../store/slices/accountSlice";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  BookOpen,
  Calendar,
  Hash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import DynamicJournalForm from "../components/journal/DynamicJournalForm";
import SectionHeader from "../components/common/SectionHeader";
import { TableSkeleton } from "../components/common/Loaders";

export default function JournalEntries() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { entries, pagination, isLoading, error } = useSelector(
    (state) => state.journals,
  );

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 20;

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    dispatch(
      fetchJournalEntries({
        page: currentPage,
        limit,
        search: searchTerm,
      }),
    );
  }, [dispatch, currentPage, limit, searchTerm]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleFormSubmit = async (payload) => {
    let result;

    try {
      // ==============================
      // UPDATE ENTRY
      // ==============================
      if (editingEntry) {
        result = await dispatch(
          updateJournalEntry({
            id: editingEntry._id,
            data: payload,
          }),
        );

        if (result?.error) {
          toast.error(result.payload || "Failed to update journal entry");
          return;
        }

        // Auto approval success message
        if (payload.requiresApproval === false) {
          toast.success("Journal entry updated and auto approved successfully");
        } else {
          toast.success("Journal entry updated successfully");
        }
      }

      // ==============================
      // CREATE ENTRY
      // ==============================
      else {
        result = await dispatch(createJournalEntry(payload));

        if (result?.error) {
          toast.error(result.payload || "Failed to create journal entry");
          return;
        }

        // Auto approval success message
        if (payload.requiresApproval === false) {
          toast.success("Journal entry created and auto approved successfully");
        } else {
          toast.success("Journal entry created and sent for approval");
        }
      }

      // ==============================
      // CLOSE FORM
      // ==============================
      handleCloseForm();

      // ==============================
      // REFRESH LIST
      // ==============================
      dispatch(
        fetchJournalEntries({
          page: currentPage,
          limit,
          search: searchTerm,
        }),
      );
    } catch (error) {
      toast.error(error?.message || "Something went wrong");
    }
  };

  const handleEdit = (entry) => {
    const isApproved =
      entry.status === "posted" || entry.approvalStatus === "approved";

    if (isApproved) {
      toast.error("Approved entries cannot be edited");
      return;
    }

    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleDelete = async (entry) => {
    const isApproved =
      entry.status === "posted" || entry.approvalStatus === "approved";

    if (isApproved) {
      toast.error("Approved entries cannot be deleted");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    const result = await dispatch(deleteJournalEntry(entry._id));

    if (result?.error) {
      toast.error(result.payload || "Failed to delete entry");
      return;
    }

    toast.success("Entry deleted");

    const isLastItemOnPage = entries.length === 1;
    const shouldGoPrevPage = isLastItemOnPage && currentPage > 1;

    const nextPage = shouldGoPrevPage ? currentPage - 1 : currentPage;
    if (shouldGoPrevPage) {
      setCurrentPage(nextPage);
    } else {
      dispatch(
        fetchJournalEntries({
          page: nextPage,
          limit,
          search: searchTerm,
        }),
      );
    }
  };

  const getStatusDisplay = (entry) => {
    const isApproved =
      entry.status === "posted" || entry.approvalStatus === "approved";
    const isRejected = entry.approvalStatus === "rejected";

    if (isApproved) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          <CheckCircle size={12} /> Approved
        </span>
      );
    }

    if (isRejected) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
          <XCircle size={12} /> Rejected
        </span>
      );
    }

    return (
      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={BookOpen}
        title="Journal Entries"
        description="Financial transaction ledger"
        buttonText="New Entry"
        onButtonClick={() => setShowForm(true)}
        buttonIcon={Plus}
      />

      {showForm ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-tight text-slate-800">
              {editingEntry ? "Edit Entry" : "New Entry"}
            </h2>

            <button
              onClick={handleCloseForm}
              className="rounded-lg p-2 transition-colors hover:bg-slate-200">
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="p-4 md:p-8">
            <DynamicJournalForm
              initialData={editingEntry}
              onSubmit={handleFormSubmit}
              onCancel={handleCloseForm}
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search description or voucher..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-slate-400 focus:ring-4 focus:ring-slate-50"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50">
              <Filter size={16} /> Filters
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {isLoading ? (
              <>
                <div className="hidden lg:block">
                  <TableSkeleton rows={8} columns={7} />
                </div>
                <div className="divide-y divide-slate-100 lg:hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                        </div>
                        <div className="h-5 w-16 animate-pulse rounded bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-y border-slate-50 py-2">
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                        <div className="flex gap-2">
                          <div className="h-7 w-12 animate-pulse rounded bg-slate-100" />
                          <div className="h-7 w-12 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
            <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    {[
                      "Date",
                      "Voucher #",
                      "Description",
                      "Debit",
                      "Credit",
                      "Status",
                      "Actions",
                    ].map((head) => (
                      <th
                        key={head}
                        className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${
                          head.includes("Debit") || head.includes("Credit")
                            ? "text-right"
                            : ""
                        }`}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => {
                    const isApproved =
                      entry.status === "posted" ||
                      entry.approvalStatus === "approved";

                    return (
                      <tr
                        key={entry._id}
                        className="transition-colors hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                          {new Date(
                            entry.voucherDate || entry.date,
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 font-mono text-sm font-bold tracking-tighter text-blue-600">
                          {entry.voucherNumber || "---"}
                        </td>

                        <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-700">
                          {entry.description || "---"}
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">
                          ৳{Number(entry.totalDebit || 0).toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-900">
                          ৳{Number(entry.totalCredit || 0).toLocaleString()}
                        </td>

                        <td className="px-6 py-4">{getStatusDisplay(entry)}</td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                navigate(
                                  `/dashboard/journal-entries/${entry._id}`,
                                )
                              }
                              className="rounded-lg border border-slate-100 p-2 text-slate-400 transition-all hover:border-slate-200 hover:text-slate-700">
                              <Eye size={14} />
                            </button>

                            <button
                              onClick={() => handleEdit(entry)}
                              disabled={isApproved}
                              className={`rounded-lg border p-2 transition-all ${
                                isApproved
                                  ? "cursor-not-allowed border-slate-100 text-slate-300 opacity-50"
                                  : "border-slate-100 text-slate-400 hover:border-blue-100 hover:text-blue-600"
                              }`}>
                              <Edit2 size={14} />
                            </button>

                            <button
                              onClick={() => handleDelete(entry)}
                              disabled={isApproved}
                              className={`rounded-lg border p-2 transition-all ${
                                isApproved
                                  ? "cursor-not-allowed border-slate-100 text-slate-300 opacity-50"
                                  : "border-slate-100 text-slate-400 hover:border-rose-100 hover:text-rose-600"
                              }`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {entries.map((entry) => {
                const isApproved =
                  entry.status === "posted" ||
                  entry.approvalStatus === "approved";

                return (
                  <div key={entry._id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-blue-600">
                          <Hash size={12} /> {entry.voucherNumber}
                        </div>

                        <div className="break-words text-sm font-bold leading-tight text-slate-900">
                          {entry.description || "---"}
                        </div>
                      </div>

                      {getStatusDisplay(entry)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y border-slate-50 py-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Debit
                        </div>
                        <div className="font-mono text-sm font-bold tracking-tight text-slate-800">
                          ৳{Number(entry.totalDebit || 0).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Credit
                        </div>
                        <div className="font-mono text-sm font-bold tracking-tight text-slate-800">
                          ৳{Number(entry.totalCredit || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={12} />
                        {new Date(
                          entry.voucherDate || entry.date,
                        ).toLocaleDateString()}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate(`/dashboard/journal-entries/${entry._id}`)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold uppercase text-slate-600">
                          View
                        </button>

                        <button
                          onClick={() => handleEdit(entry)}
                          disabled={isApproved}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase ${
                            isApproved
                              ? "cursor-not-allowed border-slate-200 text-slate-300 opacity-50"
                              : "border-slate-200 text-slate-600"
                          }`}>
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={isApproved}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase ${
                            isApproved
                              ? "cursor-not-allowed border-slate-200 text-slate-300 opacity-50"
                              : "border-rose-100 text-rose-600"
                          }`}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {entries.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row">
                <p className="text-sm text-slate-500">
                  Showing page{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.page || 1}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.pages || 1}
                  </span>
                  {" • "}Total{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.total || 0}
                  </span>{" "}
                  entries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={!pagination.hasPrevPage}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  <div className="px-3 py-2 text-sm font-semibold text-slate-700">
                    Page {pagination.page || 1} of {pagination.pages || 1}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, pagination.pages || 1),
                      )
                    }
                    disabled={!pagination.hasNextPage}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <div className="py-20 text-center text-sm italic text-slate-400">
                No ledger entries found.
              </div>
            )}
            </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
