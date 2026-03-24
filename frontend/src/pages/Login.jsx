import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import { Mail, Lock, Loader } from 'lucide-react';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(login(formData)).unwrap();
      
      // CHECK IF ACCOUNT IS APPROVED
      if (result.user?.status === 'pending') {
        toast.error('Account pending Director approval. Please wait for approval email.');
        return;
      }
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      // SHOW SPECIFIC ERROR MESSAGES
      if (err === 'Account pending Director approval') {
        toast.error('Your account is pending Director approval. Please check your email.');
      } else if (err === 'Account has been rejected') {
        toast.error('Your account has been rejected. Please contact support.');
      } else if (err === 'User not found') {
        toast.error('Email not found. Please register first.');
      } else if (err === 'Invalid email or password') {
        toast.error('Invalid email or password.');
      } else if (err === 'Account is locked. Try again later.') {
        toast.error('Account locked due to too many login attempts. Try again later.');
      } else {
        toast.error(err || 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Alliance Accounting</h1>
          <p className="text-gray-600 mt-2">Financial Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : null}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600"><strong>Demo Credentials:</strong></p>
          <p className="text-sm text-gray-600">Email: admin@alliance.com</p>
          <p className="text-sm text-gray-600">Password: password123</p>
        </div>
      </div>
    </div>
  );
}
