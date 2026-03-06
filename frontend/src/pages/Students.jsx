import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudents, createStudent } from "../store/slices/studentSlice";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";

export default function Students() {
  const dispatch = useDispatch();
  const { students, isLoading } = useSelector((state) => state.students);
  const [showForm, setShowForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    rollNumber: "",
    name: "",
    email: "",
    phone: "",
    class: "",
    parentName: "",
    parentPhone: "",
    address: "",
    status: "Active",
  });
  const [feeData, setFeeData] = useState({
    feeType: "Tuition",
    amount: 0,
    paymentMode: "Bank",
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    dispatch(fetchStudents());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createStudent(formData));
    setFormData({
      rollNumber: "",
      name: "",
      email: "",
      phone: "",
      class: "",
      parentName: "",
      parentPhone: "",
      address: "",
      status: "Active",
    });
    setShowForm(false);
  };

  const handleFeeSubmit = (e) => {
    e.preventDefault();
    // Fee collection would be handled by a separate API call
    console.log("Fee collected:", feeData);
    setFeeData({
      feeType: "Tuition",
      amount: 0,
      paymentMode: "Bank",
      referenceNumber: "",
      notes: "",
    });
    setShowFeeForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Students</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          New Student
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Add New Student
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Roll Number"
                value={formData.rollNumber}
                onChange={(e) =>
                  setFormData({ ...formData, rollNumber: e.target.value })
                }
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="form-input"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="form-input"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="form-input"
              />
              <input
                type="text"
                placeholder="Class"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
                className="form-input"
              />
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="form-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Parent Name"
              value={formData.parentName}
              onChange={(e) =>
                setFormData({ ...formData, parentName: e.target.value })
              }
              className="form-input"
            />
            <input
              type="tel"
              placeholder="Parent Phone"
              value={formData.parentPhone}
              onChange={(e) =>
                setFormData({ ...formData, parentPhone: e.target.value })
              }
              className="form-input"
            />
            <textarea
              placeholder="Address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="form-input"
              rows="2"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Add Student
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showFeeForm && selectedStudent && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Collect Fee - {selectedStudent.name}
          </h2>
          <form onSubmit={handleFeeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={feeData.feeType}
                onChange={(e) =>
                  setFeeData({ ...feeData, feeType: e.target.value })
                }
                className="form-select">
                <option value="Tuition">Tuition Fee</option>
                <option value="Exam">Exam Fee</option>
                <option value="Registration">Registration Fee</option>
                <option value="Activity">Activity Fee</option>
                <option value="Transport">Transport Fee</option>
              </select>
              <input
                type="number"
                placeholder="Amount"
                step="0.01"
                value={feeData.amount}
                onChange={(e) =>
                  setFeeData({ ...feeData, amount: parseFloat(e.target.value) })
                }
                className="form-input"
                required
              />
              <select
                value={feeData.paymentMode}
                onChange={(e) =>
                  setFeeData({ ...feeData, paymentMode: e.target.value })
                }
                className="form-select">
                <option value="Bank">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
              </select>
              <input
                type="text"
                placeholder="Reference Number"
                value={feeData.referenceNumber}
                onChange={(e) =>
                  setFeeData({ ...feeData, referenceNumber: e.target.value })
                }
                className="form-input"
              />
            </div>
            <textarea
              placeholder="Notes"
              value={feeData.notes}
              onChange={(e) =>
                setFeeData({ ...feeData, notes: e.target.value })
              }
              className="form-input"
              rows="2"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Collect Fee
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFeeForm(false);
                  setSelectedStudent(null);
                }}
                className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Roll #</th>
              <th>Name</th>
              <th>Email</th>
              <th>Class</th>
              <th>Parent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : students.length > 0 ? (
              students.map((student) => (
                <tr key={student._id}>
                  <td className="font-mono text-sm">{student.rollNumber}</td>
                  <td className="font-medium">{student.name}</td>
                  <td className="text-sm">{student.email}</td>
                  <td className="text-sm">{student.class}</td>
                  <td className="text-sm">{student.parentName}</td>
                  <td>
                    <span
                      className={`badge ${student.status === "Active" ? "badge-success" : "badge-warning"} text-xs`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowFeeForm(true);
                      }}>
                      <Plus size={16} /> Fee
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-sm btn-danger">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-600">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
