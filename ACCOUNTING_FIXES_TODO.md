# Accounting Module Fixes - TODO

## Phase 1: Critical Backend Fixes

### COA Service Fixes
- [ ] Fix circular reference prevention in updateAccount()
- [ ] Optimize leaf node filtering (replace N+1 queries with aggregation)
- [ ] Review and fix archiveAccount() logic
- [ ] Add validation for parent account changes

### Accounting Service Fixes
- [ ] Fix income statement period calculation
- [ ] Fix retained earnings calculation (use actual account)
- [ ] Optimize balance calculation (add caching/aggregation)
- [ ] Fix cash flow statement logic
- [ ] Add missing ledger endpoints

### Journal Entry Validation
- [ ] Verify double-entry enforcement
- [ ] Verify leaf account enforcement
- [ ] Check approval workflow logic
- [ ] Verify post logic and locking

### API Response Standardization
- [ ] Standardize error responses
- [ ] Standardize success responses
- [ ] Add proper HTTP status codes
- [ ] Document API contracts

## Phase 2: Critical Frontend Fixes

### Accounting Components
- [ ] Verify Chart of Accounts tree view
- [ ] Fix Journal Entry form validation
- [ ] Verify Ledger display
- [ ] Fix Reports UI
- [ ] Add error handling

### Integration Issues
- [ ] Verify API calls match backend
- [ ] Fix data flow issues
- [ ] Add loading states
- [ ] Add error messages

## Phase 3: Testing & Verification

- [ ] Test COA CRUD operations
- [ ] Test journal entry creation and approval
- [ ] Test balance calculations
- [ ] Test reports generation
- [ ] Test end-to-end flows

## Phase 4: Deployment

- [ ] Code review
- [ ] Final testing
- [ ] Push to main branch
- [ ] Deploy to production
