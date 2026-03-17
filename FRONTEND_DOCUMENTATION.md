# Alliance Accounting System - Frontend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Setup & Installation](#setup--installation)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Components](#components)
9. [Hooks](#hooks)
10. [Utilities](#utilities)
11. [Authentication Flow](#authentication-flow)
12. [Best Practices](#best-practices)
13. [Deployment](#deployment)

---

## Overview

The Alliance Accounting System frontend is a modern, production-ready React application built with Vite, Redux Toolkit, and Tailwind CSS. It provides a comprehensive interface for managing accounting operations, student fees, expenses, payroll, and financial reporting.

### Key Features

- **Secure Authentication**: JWT-based authentication using httpOnly cookies
- **Role-Based Access Control**: Different features for Directors, Accountants, and Sub-Accountants
- **Complete Accounting Module**: Journal entries, Chart of Accounts, and financial transactions
- **Financial Reporting**: Income statements, balance sheets, cash flow, and trial balance
- **Operational Management**: Students, receipts, expenses, vendors, employees, and payroll
- **Real-Time Updates**: Redux-based state management with async operations
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Error Handling**: Comprehensive error boundaries and validation

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Pages & Components                         │  │
│  │  (Dashboard, Students, Receipts, Expenses, etc.)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Redux Store & Slices                         │  │
│  │  (State Management for all modules)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         API Layer (Axios)                            │  │
│  │  (HTTP requests with authentication)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backend API                                  │  │
│  │  (Node.js + Express + MongoDB)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → Redux Action → API Call → Backend
                                              ↓
                                         Response
                                              ↓
                                        Redux Update
                                              ↓
                                       Component Re-render
```

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── index.js
│   │   ├── tables/              # Table components
│   │   │   └── DataTable.jsx
│   │   ├── forms/               # Form components
│   │   ├── modals/              # Modal dialogs
│   │   ├── Layout.jsx           # Main layout
│   │   └── ProtectedRoute.jsx   # Route protection
│   ├── pages/                   # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Students.jsx
│   │   ├── Receipts.jsx
│   │   ├── Expenses.jsx
│   │   ├── Vendors.jsx
│   │   ├── Employees.jsx
│   │   ├── Payroll.jsx
│   │   ├── Accounting.jsx
│   │   ├── Reports.jsx
│   │   ├── Settings.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── NotFound.jsx
│   ├── store/
│   │   ├── slices/              # Redux slices
│   │   │   ├── authSlice.js
│   │   │   ├── studentSlice.js
│   │   │   ├── receiptSlice.js
│   │   │   ├── expenseSlice.js
│   │   │   ├── vendorSlice.js
│   │   │   ├── employeeSlice.js
│   │   │   ├── payrollSlice.js
│   │   │   ├── accountingSlice.js
│   │   │   ├── coaSlice.js
│   │   │   ├── bankSlice.js
│   │   │   ├── reportSlice.js
│   │   │   ├── settingsSlice.js
│   │   │   └── store.js
│   ├── services/
│   │   ├── api.js               # Axios instance
│   │   └── apiMethods.js        # API endpoints
│   ├── hooks/                   # Custom hooks
│   │   ├── useForm.js
│   │   └── index.js
│   ├── utils/                   # Utility functions
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── constants/               # Constants
│   │   └── enums.js
│   ├── types/                   # TypeScript types (optional)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── .env.example
```

---

## Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI Framework | 18.x |
| **Vite** | Build Tool | 6.x |
| **Redux Toolkit** | State Management | 1.9.x |
| **Axios** | HTTP Client | 1.x |
| **Tailwind CSS** | Styling | 3.x |
| **Lucide React** | Icons | 0.x |
| **React Router** | Routing | 6.x |
| **React Hot Toast** | Notifications | 2.x |

---

## Setup & Installation

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend API running on `http://localhost:5000`

### Installation Steps

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Configure environment variables
# Edit .env and set:
# VITE_API_URL=http://localhost:5000/api

# 5. Start development server
npm run dev

# 6. Build for production
npm run build

# 7. Preview production build
npm run preview
```

### Environment Variables

```env
# .env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Alliance Accounting System
VITE_APP_VERSION=1.0.0
```

---

## State Management

### Redux Store Structure

```javascript
{
  auth: {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false
  },
  students: {
    items: [],
    item: null,
    loading: false,
    error: null,
    success: false
  },
  receipts: { /* ... */ },
  expenses: { /* ... */ },
  vendors: { /* ... */ },
  employees: { /* ... */ },
  payroll: { /* ... */ },
  accounting: { /* ... */ },
  coa: { /* ... */ },
  bank: { /* ... */ },
  reports: { /* ... */ },
  settings: { /* ... */ }
}
```

### Creating a Redux Slice

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentAPI } from '../../services/apiMethods';

// Async thunk for API call
export const fetchStudents = createAsyncThunk(
  'students/fetchStudents',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getAll(params);
      return response.data.data || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch');
    }
  }
);

// Slice definition
const studentSlice = createSlice({
  name: 'students',
  initialState: {
    items: [],
    item: null,
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSuccess: (state) => { state.success = false; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Selectors
export const selectStudents = (state) => state.students.items;
export const selectStudentsLoading = (state) => state.students.loading;

export default studentSlice.reducer;
```

### Using Redux in Components

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, selectStudents, selectStudentsLoading } from '../store/slices/studentSlice';

export default function StudentsList() {
  const dispatch = useDispatch();
  const students = useSelector(selectStudents);
  const loading = useSelector(selectStudentsLoading);

  useEffect(() => {
    dispatch(fetchStudents());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {students.map(student => (
        <div key={student._id}>{student.name}</div>
      ))}
    </div>
  );
}
```

---

## API Integration

### Axios Configuration

The API layer is configured in `src/services/api.js`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (httpOnly cookies)
  withCredentials: true,
});

export default api;
```

### API Methods

All API endpoints are defined in `src/services/apiMethods.js`:

```javascript
// Authentication
authAPI.login(credentials)
authAPI.register(userData)
authAPI.logout()
authAPI.getCurrentUser()

// Students
studentAPI.getAll(params)
studentAPI.getById(id)
studentAPI.create(data)
studentAPI.update(id, data)
studentAPI.delete(id)
studentAPI.search(query)

// Receipts
receiptAPI.getAll(params)
receiptAPI.create(data)
receiptAPI.approve(id)
receiptAPI.reject(id, data)
receiptAPI.generatePDF(id)

// Expenses
expenseAPI.getAll(params)
expenseAPI.create(data)
expenseAPI.approve(id)
expenseAPI.reject(id, data)

// ... and more
```

### Making API Calls

```javascript
import { studentAPI } from '../services/apiMethods';

// Get all students
const response = await studentAPI.getAll({ page: 1, limit: 10 });

// Create student
const newStudent = await studentAPI.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Update student
const updated = await studentAPI.update(studentId, { name: 'Jane Doe' });

// Delete student
await studentAPI.delete(studentId);
```

---

## Components

### Common Components

#### Button Component

```jsx
import { Button } from '../components/common';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

// Props: variant, size, disabled, loading, icon, onClick, type
```

#### Input Component

```jsx
import { Input } from '../components/common';

<Input
  label="Email"
  name="email"
  type="email"
  value={values.email}
  onChange={handleChange}
  error={errors.email}
  touched={touched.email}
  required
/>
```

#### Select Component

```jsx
import { Select } from '../components/common';

<Select
  label="Role"
  name="role"
  value={values.role}
  onChange={handleChange}
  options={[
    { value: 'director', label: 'Director' },
    { value: 'accountant', label: 'Accountant' }
  ]}
/>
```

#### Modal Component

```jsx
import { Modal } from '../components/common';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Create Student"
  size="lg"
>
  {/* Modal content */}
</Modal>
```

#### DataTable Component

```jsx
import { DataTable } from '../components/tables';

<DataTable
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }
  ]}
  data={students}
  loading={loading}
  onRowClick={handleRowClick}
/>
```

---

## Hooks

### useForm Hook

Custom hook for form management with validation:

```javascript
import { useForm } from '../hooks';

const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm(
  { name: '', email: '' },
  async (values) => {
    await studentAPI.create(values);
  }
);

return (
  <form onSubmit={handleSubmit}>
    <Input
      name="name"
      value={values.name}
      onChange={handleChange}
      onBlur={handleBlur}
      error={errors.name}
      touched={touched.name}
    />
  </form>
);
```

---

## Utilities

### Formatters

```javascript
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  formatPhone,
  formatPercentage,
  truncateText,
  toTitleCase
} from '../utils/formatters';

formatCurrency(1000);        // ₹1000.00
formatDate(new Date());      // Mar 17, 2026
formatDateTime(new Date());  // Mar 17, 2026 10:30 AM
formatPhone('9876543210');   // 98765 43210
formatPercentage(15.5);      // 15.50%
truncateText('Long text...', 20);  // Long text...
toTitleCase('hello world');  // Hello World
```

### Validators

```javascript
import { isValidEmail, isValidPhone } from '../utils/formatters';

isValidEmail('user@example.com');  // true
isValidPhone('9876543210');        // true
```

---

## Authentication Flow

### Login Flow

```
1. User enters credentials on /login page
2. Clicks "Login" button
3. Frontend dispatches login() thunk
4. API sends POST /auth/login
5. Backend validates credentials
6. Backend sets JWT in httpOnly cookie
7. Frontend stores user in Redux
8. Frontend redirects to /dashboard
```

### Protected Routes

```javascript
import { ProtectedRoute } from '../components';

<Route
  path="/students"
  element={
    <ProtectedRoute>
      <Students />
    </ProtectedRoute>
  }
/>
```

The ProtectedRoute component checks if the user is authenticated. If not, it redirects to /login.

### Cookie-Based Authentication

- JWT is stored in `httpOnly` cookie (secure, not accessible via JavaScript)
- Axios automatically sends cookies with requests (`withCredentials: true`)
- Backend validates cookie and extracts user information
- No need to manually manage tokens in localStorage

---

## Best Practices

### 1. Component Organization

```javascript
// ✅ Good: Separate concerns
export default function StudentsList() {
  const students = useSelector(selectStudents);
  // ...
}

// ❌ Bad: Mixed concerns
export default function StudentsList() {
  const [students, setStudents] = useState([]);
  // ...
}
```

### 2. Redux Usage

```javascript
// ✅ Good: Use selectors
const students = useSelector(selectStudents);

// ❌ Bad: Direct state access
const students = useSelector(state => state.students.items);
```

### 3. Error Handling

```javascript
// ✅ Good: Handle errors in components
useEffect(() => {
  if (error) {
    toast.error(error);
    dispatch(clearError());
  }
}, [error, dispatch]);

// ❌ Bad: Ignore errors
```

### 4. Loading States

```javascript
// ✅ Good: Show loading indicator
{loading ? <Skeleton /> : <DataTable data={data} />}

// ❌ Bad: No loading feedback
<DataTable data={data} />
```

### 5. Form Validation

```javascript
// ✅ Good: Validate before submit
const handleSubmit = (e) => {
  e.preventDefault();
  if (!validateForm(values)) return;
  dispatch(createStudent(values));
};

// ❌ Bad: No validation
const handleSubmit = (e) => {
  e.preventDefault();
  dispatch(createStudent(values));
};
```

---

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Deployment Options

#### 1. Vercel

```bash
npm install -g vercel
vercel
```

#### 2. Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### 3. Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

#### 4. Traditional Server

```bash
# Build
npm run build

# Copy dist folder to server
scp -r dist/ user@server:/var/www/app/

# Configure web server (nginx)
server {
  listen 80;
  server_name example.com;
  root /var/www/app/dist;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Environment Configuration

Create `.env.production` for production:

```env
VITE_API_URL=https://api.example.com/api
VITE_APP_NAME=Alliance Accounting System
```

---

## Troubleshooting

### Issue: 401 Unauthorized

**Solution**: Ensure cookies are being sent with requests. Check:
- `withCredentials: true` in Axios config
- Backend CORS allows credentials
- Cookie is set in browser (DevTools → Application → Cookies)

### Issue: CORS Error

**Solution**: Verify backend CORS configuration:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
```

### Issue: State Not Updating

**Solution**: Ensure you're using Redux selectors and dispatching actions correctly:
```javascript
const dispatch = useDispatch();
const data = useSelector(selectData);

useEffect(() => {
  dispatch(fetchData());
}, [dispatch]);
```

---

## Support & Resources

- [React Documentation](https://react.dev)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Axios Documentation](https://axios-http.com)

---

## License

This project is proprietary and confidential.

---

**Last Updated**: March 2026
**Version**: 1.0.0
