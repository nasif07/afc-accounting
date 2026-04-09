import React from "react";
import {
  X,
  Mail,
  Hash,
  BookOpen,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import Badge from "../ui/Badge";
import { formatCurrency } from "../../utils/currency";

export default function StudentDetailsModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <Card className="relative w-full max-w-lg bg-white shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {/* Header Banner */}
          <div className="bg-neutral-900 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                  <Hash size={14} />
                  <span className="font-mono">
                    Roll Number: {student.rollNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition text-neutral-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-tight">
                  <Mail size={12} /> Email
                </label>
                <p className="text-neutral-700 font-medium truncate">
                  {student.email}
                </p>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-tight">
                  <BookOpen size={12} /> Class
                </label>
                <div>
                  <Badge variant="outline">{student.class}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-tight">
                  <Activity size={12} /> Status
                </label>
                <div>
                  <Badge
                    variant={
                      student.status === "active" ? "success" : "warning"
                    }>
                    {student.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-tight">
                  <DollarSign size={12} /> Outstanding
                </label>
                <p
                  className={`font-bold ${student.financials?.pending > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(student.financials?.pending || 0)}
                </p>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Total Fees:</span>
                <span className="font-medium text-neutral-900">
                  {formatCurrency(student.financials?.total || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Paid Amount:</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(student.financials?.paid || 0)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-semibold transition">
                Close Profile
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
