import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Check, X, Loader } from 'lucide-react';

export default function DirectorApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  // Check if user is director
  useEffect(() => {
    if (user?.role !== 'director') {
      navigate('/dashboard');
      return;
    }
    fetchPendingUsers();
  }, [user, navigate]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/pending');
      setPendingUsers(response.data || []);
    } catch (error) {
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.patch(`/auth/approve/${userId}`);
      toast.success('User approved successfully');
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.patch(`/auth/reject/${userId}`);
      toast.success('User rejected successfully');
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }
  console.log(pendingUsers);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pending User Approvals</h1>
      
      {pendingUsers.data?.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          No pending users to approve.
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.data?.map((pendingUser) => (
            <div key={pendingUser._id} className="bg-white border border-gray-200 rounded-lg p-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">{pendingUser.name}</h3>
                <p className="text-gray-600">{pendingUser.email}</p>
                <p className="text-sm text-gray-500">Role: {pendingUser.role}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(pendingUser._id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Check size={18} /> Approve
                </button>
                <button
                  onClick={() => handleReject(pendingUser._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <X size={18} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
