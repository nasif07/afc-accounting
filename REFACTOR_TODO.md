# Alliance Accounting App - Refactoring TODO

## Phase 1: Design System & Setup
- [x] Create design tokens (mahogany #1A0D08, Inter/Geist fonts, generous spacing)
- [x] Update Tailwind config with custom colors and typography
- [x] Update index.css with new color palette and design tokens
- [x] Install Sonner (replace react-hot-toast)
- [ ] Set up React Query provider in main.jsx
- [ ] Create constants file for colors, spacing, and design tokens

## Phase 2: Core Infrastructure & Reusable Components
- [ ] Create reusable form components (Input, Select, FormField, Textarea)
- [ ] Create reusable table component with pagination, search, loading skeletons
- [ ] Create reusable modal component with premium styling
- [ ] Create reusable card component with design tokens
- [ ] Create reusable badge component with status variants
- [ ] Create reusable button component with variants
- [ ] Create loading skeleton component for tables and cards
- [ ] Create empty state component
- [ ] Create error boundary component
- [ ] Create toast notification system (Sonner integration)

## Phase 3: API & State Management
- [ ] Fix authentication (uncomment getCurrentUser in App.jsx)
- [ ] Unify API response handling (normalize response shapes)
- [ ] Fix journal/accounting auth (use cookie-based instead of Bearer token)
- [ ] Fix reportSlice to match actual reportAPI endpoints
- [ ] Create React Query hooks for each domain (useReceipts, useExpenses, etc.)
- [ ] Replace Redux data fetching with React Query
- [ ] Create API service layer with proper error handling
- [ ] Add currency conversion utility (cents to decimal)

## Phase 4: Dashboard & Overview
- [ ] Implement StatCards with real data from API (Cash on Hand, AR, AP)
- [ ] Implement RevenueChart with Recharts (minimalist line chart)
- [ ] Add recent transactions with real data
- [ ] Add system status indicators
- [ ] Add quick action buttons
- [ ] Ensure mobile responsiveness

## Phase 5: Ledger & Transactions
- [ ] Refactor JournalTable with pagination, search, sorting
- [ ] Implement TransactionForm with double-entry validation
- [ ] Implement visual balance indicator (Debits = Credits)
- [ ] Disable Post button until balanced
- [ ] Add multi-row line item editor
- [ ] Add loading skeletons for tables
- [ ] Ensure mobile responsiveness

## Phase 6: Invoicing & Bills
- [ ] Implement InvoiceBuilder with live preview
- [ ] Implement StatusPipeline visual tracker (Draft → Sent → Paid)
- [ ] Add invoice template selection
- [ ] Add print functionality
- [ ] Add email/send functionality
- [ ] Ensure mobile responsiveness

## Phase 7: Financial Statements
- [ ] Implement ReportRenderer with print-friendly layout
- [ ] Add P&L (Income Statement) template
- [ ] Add Balance Sheet template
- [ ] Add Cash Flow template
- [ ] Add Trial Balance template
- [ ] Add export to PDF functionality
- [ ] Add date range filtering
- [ ] Ensure mobile responsiveness

## Phase 8: Students Module
- [ ] Refactor Students page with new components
- [ ] Add search and filtering
- [ ] Add pagination
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Ensure mobile responsiveness

## Phase 9: Receipts Module
- [ ] Refactor Receipts page with new components
- [ ] Fix currency formatting (cents to decimal)
- [ ] Fix student field mismatch (ID vs object)
- [ ] Add search and filtering
- [ ] Add pagination
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add approval workflow UI
- [ ] Ensure mobile responsiveness

## Phase 10: Expenses Module
- [ ] Refactor Expenses page with new components
- [ ] Fix currency formatting (cents to decimal)
- [ ] Add search and filtering
- [ ] Add pagination
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add approval workflow UI
- [ ] Ensure mobile responsiveness

## Phase 11: Payroll Module
- [ ] Refactor Payroll page with new components
- [ ] Add salary calculation display
- [ ] Add payment status tracking
- [ ] Add search and filtering
- [ ] Add pagination
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Ensure mobile responsiveness

## Phase 12: Vendors & Employees
- [ ] Refactor Vendors page with new components
- [ ] Refactor Employees page with new components
- [ ] Add search and filtering
- [ ] Add pagination
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Ensure mobile responsiveness

## Phase 13: Settings & Configuration
- [ ] Refactor Settings page with new components
- [ ] Add organization settings
- [ ] Add user profile settings
- [ ] Add notification preferences
- [ ] Add backup/export functionality
- [ ] Ensure mobile responsiveness

## Phase 14: Bug Fixes & Improvements
- [ ] Fix authentication persistence on page refresh
- [ ] Fix API response shape inconsistencies
- [ ] Fix currency formatting throughout app
- [ ] Fix form validation and error handling
- [ ] Fix modal form state management
- [ ] Fix optimistic updates (wait for response before showing toast)
- [ ] Fix double-entry validation UI
- [ ] Fix mobile responsiveness on all tables
- [ ] Add horizontal scroll for tables on mobile
- [ ] Add card view for tables on mobile

## Phase 15: Testing & QA
- [ ] Test all API integrations
- [ ] Test authentication flow
- [ ] Test form submissions
- [ ] Test double-entry validation
- [ ] Test mobile responsiveness
- [ ] Test print functionality
- [ ] Test export functionality
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test empty states

## Phase 16: Documentation & Deployment
- [ ] Update README with new features
- [ ] Document API integration points
- [ ] Document component library
- [ ] Create deployment guide
- [ ] Push to GitHub
- [ ] Create release notes

## Known Issues to Fix
- [ ] Authentication lost on page refresh (getCurrentUser commented out)
- [ ] Journal module uses Bearer token auth (conflicts with cookie-based)
- [ ] reportSlice calls wrong endpoints
- [ ] Currency formatting assumes decimal, not cents
- [ ] Student field is sometimes ID, sometimes object
- [ ] Optimistic toasts show before API response
- [ ] No pagination on any table
- [ ] No loading skeletons
- [ ] No mobile responsiveness
- [ ] No form validation
- [ ] No React Query setup

## New Features to Implement
- [ ] Premium editorial-style UI with mahogany accent
- [ ] StatCards with real data
- [ ] RevenueChart with Recharts
- [ ] InvoiceBuilder with live preview
- [ ] StatusPipeline visual tracker
- [ ] ReportRenderer with print-friendly layout
- [ ] Double-entry validation UI
- [ ] Mobile-responsive tables
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error boundaries
- [ ] Sonner toast notifications

## Refactoring Goals
- Remove duplicate CRUD page patterns
- Create reusable component library
- Implement proper form validation
- Fix all API integrations
- Improve UI/UX with premium design
- Ensure mobile responsiveness
- Add proper error handling
- Add loading states
- Add empty states
- Improve code quality and maintainability
