import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Search } from 'lucide-react';
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { Card, CardContent } from '../components/ui/Card';
import { formatCurrency } from '../utils/currency';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Fetch data
  const { data: students, isLoading } = useStudents();

  // Mutations
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();

  // Filter students
  const filteredStudents = students?.filter((student) =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle edit
  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  // Table columns
  const columns = [
    { key: 'rollNumber', label: 'Roll #' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'totalFeesPaid',
      label: 'Fees Paid',
      render: (value) => formatCurrency(value || 0),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'warning'}>
          {value || 'Active'}
        </Badge>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.href = `/students/${value}`}
            className="text-blue-600 hover:text-blue-700 transition"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-700 transition"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(value)}
            className="text-red-600 hover:text-red-700 transition"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Students</h1>
          <p className="text-neutral-600 mt-2">Manage student information and records</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingStudent(null);
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Add Student
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Students</p>
            <p className="text-3xl font-bold text-neutral-900">{students?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Active</p>
            <p className="text-3xl font-bold text-neutral-900">
              {students?.filter((s) => s.status === 'active')?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-600 mb-2">Total Fees Collected</p>
            <p className="text-3xl font-bold text-neutral-900">
              {formatCurrency(
                students?.reduce((sum, s) => sum + (s.totalFeesPaid || 0), 0) || 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-neutral-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, email, or roll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mahogany-700"
        />
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-neutral-600">Loading students...</p>
        </div>
      ) : filteredStudents && filteredStudents.length > 0 ? (
        <Table
          columns={columns}
          data={filteredStudents}
          paginated
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={Plus}
          title="No Students"
          description="Start by adding your first student."
          action={() => {
            setEditingStudent(null);
            setShowForm(true);
          }}
          actionLabel="Add Student"
        />
      )}
    </div>
  );
}
