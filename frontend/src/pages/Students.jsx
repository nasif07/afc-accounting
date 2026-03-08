import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([
    { id: 1, name: 'John Doe', rollNo: '001', email: 'john@example.com', phone: '9876543210', status: 'Active' },
    { id: 2, name: 'Jane Smith', rollNo: '002', email: 'jane@example.com', phone: '9876543211', status: 'Active' },
    { id: 3, name: 'Bob Johnson', rollNo: '003', email: 'bob@example.com', phone: '9876543212', status: 'Inactive' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-1">Manage student profiles and information</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} /> Add Student
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition">
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Roll No</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.rollNo}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.phone}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-700 transition">
                        <Edit2 size={18} />
                      </button>
                      <button className="text-red-600 hover:text-red-700 transition">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No students found. Create a new student to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
