import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "../ui/Card";

const initialState = {
  name: "",
  email: "",
  rollNumber: "",
  class: "",
  status: "active",
};

export default function StudentFormModal({
  open,
  onClose,
  student,
  onSubmit,
  isSubmitting,
}) {
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || "",
        email: student.email || "",
        rollNumber: student.rollNumber || "",
        class: student.class || "",
        status: student.status || "active",
      });
    } else {
      setFormData(initialState);
    }
  }, [student, open]);

  if (!open) return null; // 🔥 CRITICAL

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <Card className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {student ? "Edit Student" : "Add Student"}
            </h2>
            <button onClick={onClose}>
              <X />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              className="w-full border p-3 rounded-lg"
              required
            />

            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full border p-3 rounded-lg"
            />

            <input
              name="rollNumber"
              value={formData.rollNumber}
              onChange={handleChange}
              placeholder="Roll Number"
              className="w-full border p-3 rounded-lg"
              required
            />

            <input
              name="class"
              value={formData.class}
              onChange={handleChange}
              placeholder="Class"
              className="w-full border p-3 rounded-lg"
              required
            />

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              {isSubmitting ? "Saving..." : "Save Student"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}