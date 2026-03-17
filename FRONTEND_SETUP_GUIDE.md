# Frontend Setup & Development Guide

## Quick Start

### Prerequisites

- Node.js 16+ (Download from [nodejs.org](https://nodejs.org))
- npm or yarn package manager
- Backend API running on `http://localhost:5000`
- Git for version control

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/nasif07/alliance-accounting-app.git
cd alliance-accounting-app

# 2. Navigate to frontend
cd frontend

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

---

## Development Workflow

### Starting the Development Server

```bash
cd frontend
npm run dev
```

Features:
- Hot Module Replacement (HMR) - changes reflect instantly
- Development server runs on `http://localhost:5173`
- Vite provides fast refresh

### Building for Production

```bash
npm run build
```

Output:
- Optimized bundle in `dist/` folder
- Minified CSS and JavaScript
- Source maps for debugging
- Bundle size: ~428KB (gzipped: ~119KB)

### Preview Production Build

```bash
npm run preview
```

Test the production build locally before deployment.

---

## Project Configuration

### Environment Variables

Create `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=Alliance Accounting System
VITE_APP_VERSION=1.0.0

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
```

### Vite Configuration

`vite.config.js` - Already configured with:
- React plugin for JSX support
- Development server settings
- Build optimization

### Tailwind CSS Configuration

`tailwind.config.js` - Already configured with:
- Custom color palette
- Extended spacing
- Responsive breakpoints

---

## Folder Structure Explanation

### `/src/components`

**Common Components** (`/common`):
- `Button.jsx` - Reusable button with variants
- `Input.jsx` - Form input with validation
- `Select.jsx` - Dropdown select
- `Modal.jsx` - Modal dialogs
- `Card.jsx` - Content card container
- `Badge.jsx` - Status badges
- `ErrorBoundary.jsx` - Error handling
- `Skeleton.jsx` - Loading placeholder

**Tables** (`/tables`):
- `DataTable.jsx` - Reusable data table with sorting

**Forms** (`/forms`):
- Form components for different modules

**Modals** (`/modals`):
- Modal dialogs for CRUD operations

### `/src/pages`

Individual page components for each module:
- `Dashboard.jsx` - Main dashboard
- `Students.jsx` - Student management
- `Receipts.jsx` - Fee collection
- `Expenses.jsx` - Expense tracking
- `Vendors.jsx` - Vendor management
- `Employees.jsx` - Employee records
- `Payroll.jsx` - Salary processing
- `Accounting.jsx` - Journal entries
- `Reports.jsx` - Financial reports
- `Settings.jsx` - System settings
- `Login.jsx` - Authentication
- `Register.jsx` - User registration

### `/src/store`

**Redux Slices** (`/slices`):
- `authSlice.js` - Authentication state
- `studentSlice.js` - Student management
- `receiptSlice.js` - Receipt management
- `expenseSlice.js` - Expense management
- `vendorSlice.js` - Vendor management
- `employeeSlice.js` - Employee management
- `payrollSlice.js` - Payroll management
- `accountingSlice.js` - Accounting transactions
- `coaSlice.js` - Chart of Accounts
- `bankSlice.js` - Bank management
- `reportSlice.js` - Financial reports
- `settingsSlice.js` - Settings
- `store.js` - Redux store configuration

### `/src/services`

- `api.js` - Axios instance configuration
- `apiMethods.js` - All API endpoint methods

### `/src/hooks`

- `useForm.js` - Form state management hook

### `/src/utils`

- `formatters.js` - Data formatting utilities
- `validators.js` - Validation functions

### `/src/constants`

- `enums.js` - All enum values and labels

---

## Common Development Tasks

### Adding a New Page

1. Create component in `/src/pages/NewPage.jsx`:

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button } from '../components/common';

export default function NewPage() {
  return (
    <div className="space-y-6">
      <Card title="New Page">
        <p>Content goes here</p>
      </Card>
    </div>
  );
}
```

2. Add route in `App.jsx`:

```javascript
import NewPage from './pages/NewPage';

<Route path="/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
```

3. Add navigation link in `Layout.jsx`

### Adding a New Redux Slice

1. Create `/src/store/slices/newSlice.js`:

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { newAPI } from '../../services/apiMethods';

export const fetchNew = createAsyncThunk(
  'new/fetchNew',
  async (params, { rejectWithValue }) => {
    try {
      const response = await newAPI.getAll(params);
      return response.data.data || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const newSlice = createSlice({
  name: 'new',
  initialState: { items: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNew.pending, (state) => { state.loading = true; })
      .addCase(fetchNew.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNew.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default newSlice.reducer;
```

2. Register in `store.js`:

```javascript
import newReducer from './slices/newSlice';

const store = configureStore({
  reducer: {
    // ... other reducers
    new: newReducer
  }
});
```

### Adding a New API Method

1. Add to `apiMethods.js`:

```javascript
export const newAPI = {
  getAll: (params) => api.get('/new', { params }),
  getById: (id) => api.get(`/new/${id}`),
  create: (data) => api.post('/new', data),
  update: (id, data) => api.put(`/new/${id}`, data),
  delete: (id) => api.delete(`/new/${id}`)
};
```

### Using Components

```javascript
import { Button, Input, Select, Modal, Card, Badge } from '../components/common';
import { DataTable } from '../components/tables';

export default function Example() {
  return (
    <Card title="Example">
      <Button variant="primary">Click Me</Button>
      <Input label="Name" name="name" />
      <Badge variant="success">Active</Badge>
    </Card>
  );
}
```

---

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. **Console** - Check for errors
3. **Network** - Monitor API calls
4. **Redux DevTools** - Install Redux DevTools extension for state inspection
5. **Application** - Check cookies and localStorage

### Redux DevTools

Install the [Redux DevTools Browser Extension](https://github.com/reduxjs/redux-devtools-extension)

Features:
- Time-travel debugging
- Action replay
- State diff viewing
- Action history

### Common Issues

**Issue**: Component not re-rendering
- Check if using selectors correctly
- Verify Redux action is dispatched
- Check browser console for errors

**Issue**: API calls failing
- Check Network tab in DevTools
- Verify backend is running
- Check CORS configuration
- Verify authentication cookies

**Issue**: Styling not applied
- Clear browser cache
- Rebuild Tailwind CSS: `npm run build`
- Check class names are correct

---

## Performance Optimization

### Code Splitting

Already configured in Vite. Large components are automatically split into separate chunks.

### Memoization

```javascript
import { memo } from 'react';

const StudentCard = memo(({ student }) => {
  return <div>{student.name}</div>;
});

export default StudentCard;
```

### Lazy Loading

```javascript
import { lazy, Suspense } from 'react';

const Reports = lazy(() => import('./pages/Reports'));

<Suspense fallback={<div>Loading...</div>}>
  <Reports />
</Suspense>
```

### Bundle Analysis

```bash
npm install -D rollup-plugin-visualizer
```

Then add to `vite.config.js` and run build to see bundle analysis.

---

## Testing

### Setting Up Tests (Optional)

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### Example Test

```javascript
import { render, screen } from '@testing-library/react';
import Button from '../components/common/Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
});
```

---

## Git Workflow

### Committing Changes

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin main
```

### Commit Message Format

```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

---

## Deployment Checklist

- [ ] Build succeeds without errors: `npm run build`
- [ ] All pages accessible and functional
- [ ] Authentication working correctly
- [ ] API calls returning expected data
- [ ] No console errors
- [ ] Responsive design tested on mobile
- [ ] Environment variables configured
- [ ] Backend API URL correct
- [ ] CORS configured on backend
- [ ] Cookies being set properly

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run linter (if configured)
npm run format           # Format code (if configured)

# Dependencies
npm install              # Install dependencies
npm update               # Update dependencies
npm audit                # Check for vulnerabilities
```

---

## Resources

- [React Documentation](https://react.dev)
- [Redux Toolkit Docs](https://redux-toolkit.js.org)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Axios Documentation](https://axios-http.com)
- [MDN Web Docs](https://developer.mozilla.org)

---

## Support

For issues or questions:
1. Check the [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)
2. Review backend API documentation
3. Check browser console for errors
4. Inspect Network tab for API issues

---

**Last Updated**: March 2026
