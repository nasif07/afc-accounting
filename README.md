# Alliance Accounting System

A comprehensive MERN stack school accounting and financial management system built with Express.js, MongoDB, React 19, and Redux Toolkit.

## Features

- **Secure Authentication**: Role-based access control (Director, Accountant, Sub-Accountant) with JWT tokens
- **Double-Entry Accounting**: Complete Chart of Accounts with automatic debit-credit balancing
- **Student Revenue Management**: Fee collection with multiple payment modes and receipt generation
- **Expense Tracking**: Petty cash and operational expense management with approval workflow
- **Payroll System**: Flexible salary structures (Fixed, Hourly, Per-Class) with deductions and bonuses
- **Financial Reports**: Income Statement, Balance Sheet, and Cash Flow reports
- **Dashboard**: Real-time overview of cash management, pending approvals, and key metrics

## Tech Stack

### Backend
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Navigation
- **Lucide React** - Icons

## Project Structure

```
alliance-accounting-mern/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Account.js
│   │   ├── JournalEntry.js
│   │   ├── Student.js
│   │   ├── FeeCollection.js
│   │   ├── Expense.js
│   │   ├── Employee.js
│   │   └── Payroll.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── accounts.js
│   │   ├── journalEntries.js
│   │   ├── students.js
│   │   ├── feeCollections.js
│   │   ├── expenses.js
│   │   ├── employees.js
│   │   └── payroll.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── JournalEntries.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Payroll.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── NotFound.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── store/
│   │   │   ├── store.js
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── accountSlice.js
│   │   │       ├── journalSlice.js
│   │   │       ├── studentSlice.js
│   │   │       ├── expenseSlice.js
│   │   │       └── payrollSlice.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/alliance-accounting
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Accounts
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get single account
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Journal Entries
- `GET /api/journal-entries` - Get all entries
- `GET /api/journal-entries/:id` - Get single entry
- `POST /api/journal-entries` - Create entry
- `PUT /api/journal-entries/:id/approve` - Approve entry
- `PUT /api/journal-entries/:id/reject` - Reject entry

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get single student
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Fee Collections
- `GET /api/fee-collections` - Get all collections
- `GET /api/fee-collections/:id` - Get single collection
- `POST /api/fee-collections` - Create collection
- `PUT /api/fee-collections/:id/approve` - Approve collection

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id/approve` - Approve expense
- `PUT /api/expenses/:id/reject` - Reject expense
- `DELETE /api/expenses/:id` - Delete expense

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Payroll
- `GET /api/payroll` - Get all payroll records
- `GET /api/payroll/:id` - Get single payroll
- `POST /api/payroll` - Create payroll
- `PUT /api/payroll/:id/process` - Process payroll
- `PUT /api/payroll/:id/mark-paid` - Mark as paid

## Default Login Credentials

Create a user account through the registration page or use:
- Email: `admin@alliance.com`
- Password: `password123`
- Role: Director

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect GitHub repository to Vercel
3. Add environment variables in Vercel settings
4. Deploy

### Environment Variables for Production

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
JWT_EXPIRE=7d
NODE_ENV=production
CORS_ORIGIN=your_frontend_url
```

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
