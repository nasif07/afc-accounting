# ERP Authentication Module - Audit & Fixes

## 🔴 Critical Issues Found

### Backend Issues
1. **User Model:** Missing `status` field (pending/approved/rejected)
2. **Registration:** New users not forced to `accountant/pending` status
3. **Login:** No validation of `status !== 'approved'`
4. **JWT Middleware:** Only attaches decoded token, not full user object
5. **Director Endpoints:** Missing GET /pending, PATCH /approve/:id, PATCH /reject/:id

### Frontend Issues
1. **Token Persistence:** No localStorage token storage → crash on refresh
2. **API Headers:** No automatic Authorization header injection
3. **Protected Routes:** No loading state during /me bootstrap
4. **Role Protection:** No role-based route guards
5. **Registration Flow:** Redirects to dashboard instead of showing pending message
6. **Error Messages:** Generic errors instead of "Account not approved yet"

---

## ✅ BACKEND FIXES

### 1️⃣ User Model - Add Status Field

**File:** `backend/src/modules/users/user.model.js`

```javascript
// ADD THIS FIELD after the isActive field (line 44):

status: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'pending'  // New users start as pending
},
approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},
approvedAt: {
  type: Date,
  default: null
},
```

**Why:** Tracks account approval status. New users are pending until director approves.

---

### 2️⃣ Auth Service - Fix Registration & Login

**File:** `backend/src/modules/auth/auth.service.js`

```javascript
// REPLACE the register method (lines 5-38) with:

static async register(userData) {
  const { name, email, password, role, userId } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Force new users to accountant/pending
  const user = new User({
    userId,
    name,
    email,
    password,
    role: 'accountant',  // FORCE accountant role
    status: 'pending',   // FORCE pending status
  });

  await user.save();

  // Generate token (but user is not yet approved)
  const token = this.generateToken(user._id, user.email, user.role);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,  // INCLUDE status in response
      userId
    },
    token,
  };
}

// REPLACE the login method (lines 40-81) with:

static async login(email, password) {
  // Find user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new Error("User not found");  // More specific error
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new Error("Account is locked. Try again later.");
  }

  // CHECK STATUS BEFORE PASSWORD (line 52 addition)
  if (user.status === 'pending') {
    throw new Error("Account pending Director approval");  // Specific error
  }

  if (user.status === 'rejected') {
    throw new Error("Account has been rejected");  // Specific error
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    await user.save();
    throw new Error("Invalid email or password");
  }

  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = this.generateToken(user._id, user.email, user.role);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,  // INCLUDE status in response
    },
    token,
  };
}

// ADD THIS NEW METHOD at end of class (before closing brace):

static async getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    department: user.department,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
  };
}
```

**Why:** 
- Registration forces `accountant/pending` for all new users
- Login blocks unapproved accounts with specific error messages
- Status is included in all responses for frontend handling

---

### 3️⃣ JWT Middleware - Fix User Attachment

**File:** `backend/src/middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const User = require("../modules/users/user.model");  // ADD THIS IMPORT

const auth = async (req, res, next) => {  // ADD async
  try {
    // Try to get token from cookies first, then fall back to Authorization header
    let token = req.cookies?.token;
    
    if (!token) {
      // Fallback to Authorization header for backward compatibility
      token = req.header("Authorization")?.replace("Bearer ", "");
    }

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // FETCH FULL USER OBJECT (ADD THESE LINES):
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User not found",
      });
    }

    // CHECK STATUS (ADD THESE LINES):
    if (user.status !== 'approved') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: user.status === 'pending' 
          ? "Account pending Director approval" 
          : "Account has been rejected",
      });
    }

    // ATTACH FULL USER OBJECT (REPLACE req.user = decoded):
    req.user = {
      id: user._id,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: user.name,
      status: user.status,
      phone: user.phone,
      department: user.department,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    // HANDLE EXPIRED TOKEN GRACEFULLY (ADD THIS):
    if (error.name === 'TokenExpiredError') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

module.exports = auth;
```

**Why:**
- Attaches full user object (not just decoded token)
- Validates user status before allowing access
- Handles expired tokens gracefully
- Prevents unapproved users from accessing protected routes

---

### 4️⃣ Auth Controller - Update Response Format

**File:** `backend/src/modules/auth/auth.controller.js`

```javascript
// REPLACE the login error handling (lines 67-74) with:

} catch (error) {
  // Handle specific auth errors
  if (
    error.message === "User not found" ||
    error.message === "Invalid email or password" ||
    error.message === "Account is locked. Try again later." ||
    error.message === "Account pending Director approval" ||
    error.message === "Account has been rejected"
  ) {
    return ApiResponse.unauthorized(res, error.message);
  }
  next(error);
}

// REPLACE getCurrentUser method (lines 86-93) with:

static async getCurrentUser(req, res, next) {
  try {
    // req.user is already attached by auth middleware
    const user = req.user;
    if (!user) {
      return ApiResponse.unauthorized(res, "User not found");
    }
    return ApiResponse.success(res, { user }, "User retrieved successfully");
  } catch (error) {
    next(error);
  }
}
```

**Why:** Ensures consistent error messages and proper response format for /me endpoint

---

### 5️⃣ Add Director Approval Endpoints

**File:** `backend/src/modules/auth/auth.controller.js`

```javascript
// ADD THESE NEW METHODS to AuthController class:

static async getPendingUsers(req, res, next) {
  try {
    // Only directors can view pending users
    if (req.user.role !== 'director') {
      return ApiResponse.forbidden(res, "Only directors can view pending users");
    }

    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, pendingUsers, "Pending users retrieved");
  } catch (error) {
    next(error);
  }
}

static async approveUser(req, res, next) {
  try {
    // Only directors can approve
    if (req.user.role !== 'director') {
      return ApiResponse.forbidden(res, "Only directors can approve users");
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    if (user.status !== 'pending') {
      return ApiResponse.badRequest(res, "User is not pending approval");
    }

    user.status = 'approved';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    await user.save();

    return ApiResponse.success(res, user, "User approved successfully");
  } catch (error) {
    next(error);
  }
}

static async rejectUser(req, res, next) {
  try {
    // Only directors can reject
    if (req.user.role !== 'director') {
      return ApiResponse.forbidden(res, "Only directors can reject users");
    }

    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    if (user.status !== 'pending') {
      return ApiResponse.badRequest(res, "User is not pending approval");
    }

    user.status = 'rejected';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    // Optionally store rejection reason in a new field
    await user.save();

    return ApiResponse.success(res, user, "User rejected successfully");
  } catch (error) {
    next(error);
  }
}
```

**Why:** Allows directors to manage pending user approvals

---

### 6️⃣ Add Director Routes

**File:** `backend/src/modules/auth/auth.routes.js`

```javascript
const express = require("express");
const AuthController = require("./auth.controller");
const auth = require("../../middleware/auth");
const roleCheck = require("../../middleware/roleCheck");  // ADD THIS IMPORT

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Protected routes
router.post("/logout", auth, AuthController.logout);
router.get("/me", auth, AuthController.getCurrentUser);

// ADD THESE DIRECTOR-ONLY ROUTES:
router.get("/pending", auth, roleCheck.directorOnly, AuthController.getPendingUsers);
router.patch("/approve/:id", auth, roleCheck.directorOnly, AuthController.approveUser);
router.patch("/reject/:id", auth, roleCheck.directorOnly, AuthController.rejectUser);

module.exports = router;
```

**Why:** Exposes director approval endpoints with proper role protection

---

## ✅ FRONTEND FIXES

### 7️⃣ API Client - Add Token Persistence & Auth Header

**File:** `frontend/src/services/api.js`

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// REQUEST INTERCEPTOR - ADD TOKEN TO HEADERS (NEW)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR - HANDLE 401 & TOKEN STORAGE
api.interceptors.response.use(
  (response) => {
    // EXTRACT AND STORE TOKEN FROM RESPONSE (NEW)
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on 401
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Why:**
- Automatically injects token in all requests
- Persists token in localStorage
- Handles 401 errors gracefully

---

### 8️⃣ Auth Slice - Add Token Persistence & Status Handling

**File:** `frontend/src/store/slices/authSlice.js`

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    // STORE TOKEN (NEW)
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    // STORE TOKEN (NEW)
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    // TRY TO GET TOKEN FROM STORAGE FIRST (NEW)
    const token = localStorage.getItem('authToken');
    if (!token) {
      return rejectWithValue(null);
    }
    
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  } catch (error) {
    // CLEAR TOKEN ON ERROR (NEW)
    localStorage.removeItem('authToken');
    return rejectWithValue(null);
  }
});

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    // CLEAR TOKEN ON LOGOUT (NEW)
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return null;
  } catch (error) {
    // Clear anyway
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return null;
  }
});

const initialState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isPending: false,  // NEW: Track pending approval status
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isPending = false;
      localStorage.removeItem('authToken');
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isPending = action.payload?.status === 'pending';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        // NEW: Check if pending approval
        state.isPending = action.payload.user?.status === 'pending';
        state.isAuthenticated = action.payload.user?.status === 'approved';
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || action.payload;
        state.isAuthenticated = !!state.user;
        state.isPending = state.user?.status === 'pending';
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isPending = false;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isPending = false;
        state.loading = false;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsPending = (state) => state.auth.isPending;  // NEW
export default authSlice.reducer;
```

**Why:**
- Persists token in localStorage
- Checks token before calling /me
- Tracks pending approval status
- Handles all error cases

---

### 9️⃣ Protected Route - Add Loading State & Role Check

**File:** `frontend/src/components/ProtectedRoute.jsx`

```javascript
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, isPending } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);

  // SHOW LOADING STATE (UNCOMMENTED & IMPROVED)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // REDIRECT IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // NEW: BLOCK IF PENDING APPROVAL
  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account is awaiting Director approval. You will receive an email once approved.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('authToken');
              window.location.href = '/login';
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // NEW: CHECK ROLE-BASED ACCESS
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
```

**Why:**
- Shows loading state during /me bootstrap
- Blocks pending users from accessing app
- Supports role-based route protection

---

### 🔟 Login Page - Better Error Handling

**File:** `frontend/src/pages/Login.jsx`

```javascript
// REPLACE the handleSubmit method (lines 18-27) with:

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const result = await dispatch(login(formData)).unwrap();
    
    // CHECK IF ACCOUNT IS APPROVED (NEW)
    if (result.user?.status === 'pending') {
      toast.error('Account pending Director approval. Please wait for approval email.');
      return;
    }
    
    toast.success('Login successful!');
    navigate('/dashboard');
  } catch (err) {
    // SHOW SPECIFIC ERROR MESSAGES (IMPROVED)
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
```

**Why:** Provides specific feedback for different error scenarios

---

### 1️⃣1️⃣ Register Page - Show Pending Message

**File:** `frontend/src/pages/Register.jsx`

```javascript
// REPLACE the handleSubmit method (lines 18-31) with:

const handleSubmit = async (e) => {
  e.preventDefault();
  if (formData.password !== formData.confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }
  try {
    const result = await dispatch(register(formData)).unwrap();
    
    // NEW: SHOW PENDING MESSAGE INSTEAD OF REDIRECTING
    if (result.user?.status === 'pending') {
      toast.success('Registration successful! Awaiting Director approval.');
      // Redirect to pending page or login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    
    toast.success('Registration successful!');
    navigate('/dashboard');
  } catch (err) {
    if (err === 'Email already registered') {
      toast.error('This email is already registered. Please login instead.');
    } else {
      toast.error(err || 'Registration failed');
    }
  }
};
```

**Why:** Informs users that they need director approval before accessing the app

---

### 1️⃣2️⃣ Add Director Approval Page (New Component)

**File:** `frontend/src/pages/DirectorApprovals.jsx`

```javascript
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pending User Approvals</h1>
      
      {pendingUsers.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          No pending users to approve.
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((pendingUser) => (
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
```

**Why:** Allows directors to manage pending user approvals

---

### 1️⃣3️⃣ Add Approvals Route to App

**File:** `frontend/src/App.jsx`

```javascript
// ADD THIS IMPORT at the top:
import DirectorApprovals from "./pages/DirectorApprovals";

// ADD THIS ROUTE before the root route (before line 119):
<Route
  path="/approvals"
  element={
    <ProtectedRoute requiredRole="director">
      <Layout>
        <DirectorApprovals />
      </Layout>
    </ProtectedRoute>
  }
/>
```

**Why:** Provides director-only approval management interface

---

## 📋 Summary of Changes

### Backend
| File | Changes |
|------|---------|
| `user.model.js` | Added `status`, `approvedBy`, `approvedAt` fields |
| `auth.service.js` | Force accountant/pending on register, check status on login, add getUserById |
| `auth.js` (middleware) | Fetch full user, validate status, handle expired tokens |
| `auth.controller.js` | Add getPendingUsers, approveUser, rejectUser methods |
| `auth.routes.js` | Add /pending, /approve/:id, /reject/:id routes |

### Frontend
| File | Changes |
|------|---------|
| `api.js` | Add request interceptor for token, store token in localStorage |
| `authSlice.js` | Add token persistence, isPending state, check token before /me |
| `ProtectedRoute.jsx` | Show loading state, block pending users, add role check |
| `Login.jsx` | Better error messages for specific scenarios |
| `Register.jsx` | Show pending message instead of redirect |
| `DirectorApprovals.jsx` | NEW: Director approval management page |
| `App.jsx` | Add approvals route |

---

## 🔒 Security Improvements

1. ✅ Token stored in localStorage (not just cookies)
2. ✅ Automatic token injection in all API requests
3. ✅ Status validation on every protected request
4. ✅ Expired token handling
5. ✅ Role-based route protection
6. ✅ Specific error messages (no generic "unauthorized")

---

## 🧪 Testing Checklist

- [ ] Register new user → shows "pending approval" message
- [ ] Try login with pending user → shows "account pending" error
- [ ] Director approves user → user can login
- [ ] Login → refresh page → user stays logged in (token persisted)
- [ ] Expired token → redirects to login with message
- [ ] Non-director tries to access /approvals → redirected
- [ ] All API calls include Authorization header
- [ ] Logout clears token from localStorage

---

## 🚀 Deployment Notes

1. Run migrations to add `status`, `approvedBy`, `approvedAt` fields to User collection
2. Set existing users to `status: 'approved'` to maintain backward compatibility
3. Deploy backend changes first, then frontend
4. Test full auth flow in staging before production
