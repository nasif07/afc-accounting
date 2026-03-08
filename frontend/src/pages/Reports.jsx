import { Plus, Edit2, Trash2, Download } from 'lucide-react';

export default function PAGE() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PAGE Module</h1>
          <p className="text-gray-600 mt-1">Manage PAGE operations and records</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} /> Add New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Amount</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">₹0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">PAGE List</h2>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No data available yet.</p>
          <p className="text-sm mt-2">Click the "Add New" button to create your first entry.</p>
        </div>
      </div>
    </div>
  );
}
