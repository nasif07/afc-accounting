# Frontend Audit — Alliance Accounting App

**Date:** 2026-07-04
**Scope:** `frontend/` (97 source files). Report-only audit — no code was modified. Cross-referenced against `backend/` where behavior claims (role checks, pagination) required verification.

---

## 1. State Management Architecture

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `src/store/slices/bankSlice.js` (whole file) | Registered in `store.js:18` but never dispatched or selected anywhere; `BankCash.jsx`/`BankBook.jsx` call `bankAPI` directly | Critical | Dead reducer shipped and initialized on every render; misleads contributors into thinking it's the source of truth | Delete the slice and its store registration |
| `src/store/slices/accountingSlice.js` | Same pattern — `Reports.jsx:84` calls raw axios directly instead | Critical | Same as above | Delete |
| `src/store/slices/receiptSlice.js` | Same pattern (confirms prior finding) — `Receipts.jsx` uses `useReceiptsAdvanced` exclusively | Critical | Same as above | Delete |
| `src/store/slices/studentSlice.js` | Same pattern, newly found — `Students.jsx` uses `useStudents` exclusively | Critical | Same as above — 4 of 11 registered slices (36%) are pure dead weight | Delete |
| Store-wide | No coherent rule for Redux vs. hooks vs. ad-hoc axios: `accounts/payroll/journals/pettyCash/coa/settings/auth` are live Redux; `receipts/students/employees/expenses/vendors` are React Query; `bank/reports/director-approvals/journal-approvals` bypass both | High | Organic drift, not a design decision — every new feature is a coin flip on which system to use | Pick one pattern going forward (see Architecture Decisions) |
| `src/pages/PettyCash.jsx:63-152` | Server-computed aggregates (`summary.totalDebit/totalCredit/balance`) stored verbatim in `useState`, refetched wholesale on every filter change | Medium | Forces a full network round trip per filter keystroke; no client-side derivation possible | Acceptable as server-truth cache, but pair with debouncing + cancellation (see §2) |
| `src/pages/Accounts.jsx:105-146` | `normalizedAccounts`/`visibleAccounts`/`parentOptions` correctly derived via `useMemo` from slice state | Verified-good | Reference pattern other pages should follow | — |

## 2. Data Fetching & API Layer

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `src/pages/DirectorApprovals.jsx:29,40,52`, `JournalEntryApprovals.jsx:84,96,110`, `JournalEntryDetails.jsx:112`, `Reports.jsx:84`, `BankCash.jsx:108` | Raw `api.get/patch` calls with hand-typed endpoint strings, bypassing `services/apiMethods.js` | High | No single source of truth for routes; a backend rename breaks these silently with no compile error | Route all calls through `apiMethods.js` |
| `src/pages/PettyCash.jsx:193` (and `Payroll.jsx`, `Reports.jsx`, `BankCash.jsx`, `BankBook.jsx`, `DirectorApprovals.jsx`, `JournalEntryApprovals.jsx`) | No `AbortController`/cleanup on fetch effects — only `Dashboard.jsx` has one | High | Concrete race condition: rapid typing in PettyCash's search/date filters can let a stale response overwrite a fresher one | Add abort-on-cleanup to every filter-driven `useEffect` fetch, or migrate to React Query (auto-cancels by query key) |
| `src/pages/DirectorApprovals.jsx:30,62` | `setPendingUsers(response.data)` stores the whole response body in a variable named `pendingUsers`, later unwrapped via `pendingUsers.data` | Low | Misleading naming invites a future "fix" that breaks it | Rename variable / unwrap at the call site |
| `src/pages/PettyCash.jsx:319-349` | KPI cards render `0`/`formatCurrency(0)` defaults before first fetch resolves (flash-of-zero) | Low | Cosmetic, not breakage | Show a skeleton until first fetch resolves |
| `src/pages/Accounts.jsx`, `DirectorApprovals.jsx`, `useReceiptsAdvanced.js`, `PettyCash.jsx` | Refetch-after-mutation is solid (`refreshAccountsUI()`, `fetchPendingUsers()`, `invalidateQueries`, `fetchPettyCashHistory()`) | Verified-good | — | — |
| `JournalEntryApprovals.jsx` approve/reject handlers | Refetch coverage not fully confirmed in this pass (ad-hoc axios pattern) | Low (flag for follow-up) | Possible stale pending-list after action | Spot-check manually |

## 3. Component Architecture & Code Quality

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `src/pages/PettyCashReportPage.jsx:53-361` | Hand-rolled ZIP/XLSX binary writer — custom CRC32 table/impl, little-endian writers, full OOXML XML templates — inside a page component (838 lines total) | Critical | A single off-by-one in the CRC/uint32 writers silently corrupts a financial export file, with zero test coverage | Use a library (`exceljs`/`xlsx`) or extract to `utils/xlsx.js` with dedicated tests |
| `src/components/common/Table.jsx:92-94` | `key={idx}` on rows in the shared, generic, searchable+paginated table (consumed by Vendors, likely Employees) despite a stable `_id` being available | High | Filtering/typing reshuffles which row occupies an index every keystroke, causing React to misassociate row-level state across different records — systemic since it's the one shared table | Use `key={row._id}` |
| `src/components/journal/DynamicJournalForm.jsx:287-297` | `key={idx}` on mutable, add/remove double-entry journal rows (`BookEntryRow`) | High | Removing a middle row shifts every subsequent key, risking React reusing the wrong row instance during live debit/credit entry | Key by a stable per-row id, not array index |
| `src/pages/Reports.jsx:156-402` (`handleDownloadPDF`) | 246-line DOM-hacking routine: clones DOM, regex-rewrites every `oklch()` color across all stylesheets, runs `getComputedStyle` per node × 14 properties across 3-4 full-tree `querySelectorAll("*")` passes | High | O(n) synchronous, layout-forcing work on large reports (e.g. Trial Balance); exists only to work around Tailwind v4 `oklch()` breaking `html2canvas`, untested, will silently break again on next upgrade | Isolate into a tested utility; consider a server-side/print-CSS export path instead |
| `src/pages/BankCash.jsx` (808 lines) vs `src/pages/BankBook.jsx` (396 lines, decomposed into 6 sub-components + helpers) | Same domain, inconsistent decomposition — BankCash has two full inline modal forms and zero extraction | Medium | Team already knows how to decompose well (BankBook) but didn't apply it consistently | Extract BankCash's modals/handlers the way BankBook was |
| `src/pages/JournalEntries.jsx:317-417` vs `419-504` | Desktop `<table>` and mobile card list are two independently maintained JSX trees rendering the same data (incl. duplicated `isApproved` disable logic at two line ranges) | Medium | Any field/action change must be made twice or they drift | One row-renderer shared between breakpoints, or a responsive semantic table |
| `BankCash.jsx:29-39` / `PettyCash.jsx:238-248` (`getErrorMessage`), `Payroll.jsx:60-104` (local `StatCard`/`FieldLabel`/`FormInput`/`FormSelect`) | Duplicated helpers/components reinvented inline instead of using `components/common/{Card,Input,Select,FormField}` (correctly used by `Vendors.jsx`) | Medium | Concrete instance of "some modules use the shared library, others don't" | Consolidate on `components/common` |
| `src/pages/Payroll.jsx:314-317` | Totals (`totalNet`, `totalAllow`, etc.) recomputed every render without `useMemo`, next to a 470-line render body | Low | Negligible today (≤50 rows/page) — flagged only for proximity to a large component, not measured impact | Optional `useMemo` |
| Codebase-wide | No `React.createContext` usage anywhere; deepest prop chain found is 1 level (Layout→Sidebar) | Verified-good / informational | No 3+-level prop drilling exists; Context isn't obviously warranted today | — |
| All of `src/pages`, `src/components/**`, `src/hooks` | No orphaned files found — every file is reachable from `Routes.jsx` or a reachable page | Verified-good | — | — |

## 4. Forms & Validation

**Form inventory:**

| Form | Validation approach | Backend error handling | File |
|---|---|---|---|
| Expenses | react-hook-form + zod | Generic toast only, no `setError` mapping | `Expenses.jsx` |
| Journal Entry | Manual (`validateForm()`) | Generic toast | `DynamicJournalForm.jsx`, `JournalEntries.jsx` |
| Payroll | None (HTML `required`/`number` only) | Generic toast | `Payroll.jsx` |
| Petty Cash | Manual, shown in an inline banner | Inline banner + toast, still not field-level | `PettyCash.jsx` |
| Employees | None | Generic toast | `Employees.jsx`, `useEmployees.js` |
| Vendors | None | Generic toast | `Vendors.jsx`, `useVendors.js` |
| Students | `errors` state exists but unused for main form | Generic toast | `StudentFormModal.jsx` |
| Accounts/COA | Manual, partial | Generic toast | `Accounts.jsx` |
| Settings | None found | — | `Settings.jsx` |
| Login | HTML `required` only | Generic toast | `Login.jsx` |
| Register | Manual, decent (touched-based inline errors) | Generic toast | `Register.jsx` |
| Receipts | **No creation form exists in the repo** | N/A | `Receipts.jsx:199` |

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| Every mutation hook: `useExpenses.js`, `useEmployees.js`, `useVendors.js`, `useStudents.js`, `useReceiptsAdvanced.js` + Redux thunks | `onError` handlers only ever show `e.response?.data?.message` as one generic toast; none read a field-level errors array | High | If the backend returns per-field Zod errors, they're silently dropped everywhere — no form in the app can show "which field is wrong" | Standardize on reading `error.response.data.errors[]` and calling `setError`/inline field messages |
| `src/pages/Expenses.jsx:71-79` | The one RHF+zod form never calls `setError`, despite having the infrastructure to | High | Defeats the reason RHF was adopted at all | Wire `setError` from backend field errors |
| `src/pages/Payroll.jsx:244-256` | `parseFloat(formData.baseSalary) \|\| 0` — blank/invalid salary silently becomes a valid `0` submission | High | Can produce a ৳0 payroll record that gets approved/paid by mistake | Reject non-positive/blank amounts before submit |
| Codebase-wide (`grep beforeunload\|useBlocker\|usePrompt` → 0 hits) | No unsaved-changes protection anywhere, including `DynamicJournalForm.jsx` and `Payroll.jsx`'s modal | High | Multi-line journal entries and payroll edits can be silently lost on accidental nav/close, while delete actions elsewhere do get confirmation modals | Add `useBlocker`/`beforeunload` on the two highest-value forms at minimum |
| `src/pages/Receipts.jsx:199` | "New Receipt" button does `window.location.href = "/receipts/new"` — no such route or component exists | High | Dead entry point; forces a full page reload even if it worked | Build the missing form or remove the button until it exists |
| `DynamicJournalForm.jsx`, `BookEntryRow.jsx:87-94` | Debit/credit inputs are `type="text"`, raw strings passed through unrounded; balance check uses a `<0.01` epsilon but per-line values are never rounded | Medium | Real precision risk per line, partially mitigated by the sum-level epsilon | Round to 2 decimals on input/blur |
| `StudentFormModal.jsx:262-269` | `errors`/`setErrors` state exists but only wired to the CSV path, never the single-entry path despite required-field asterisks in labels | Medium | Looks like partially implemented validation that was never finished | Wire required-field checks to `setErrors` before submit |
| `Employees.jsx:90-104`, `Vendors.jsx:46-60` | Zero client validation beyond native HTML attributes | Medium | Relies entirely on backend 400s, which per the finding above surface as one generic toast | Add minimal required/format checks |
| `PettyCash.jsx:228-236` | Inline validation exists but is one whole-form message, not per-field | Low-Medium | Better than most forms, still not field-scoped | Scope messages to fields |
| `Expenses.jsx:124`, `Payroll.jsx` (multiple), `JournalEntries.jsx` | Raw `.toLocaleString()` vs. shared `formatCurrency()` used elsewhere — inconsistent decimal places for the same kind of value | Low | Cosmetic/consistency (full detail in §6) | Use `formatCurrency` everywhere |

## 5. Auth & Role-Based UI

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `src/store/store.js:14-35`, `authSlice.js:88-95,144-158` | `logout`/`logoutAsync.fulfilled` only reset the `auth` slice; none of the other 9 slices (payroll, students, receipts, etc. — where live) have any logout-keyed reducer case, and the store has no root-reducer reset pattern | High | A fast re-login as a different user on the same tab can briefly or persistently show the previous user's cached financial/student data, since the SPA never remounts and `AppInitializer` only runs once on initial mount | Add a root reducer that resets all state to `undefined` on a logout action type |
| `src/components/ProtectedRoute.jsx:19-21` | `isPending` branch is unreachable dead code given the slice's `isAuthenticated`/`isPending` mutual-exclusivity invariant | Low | Code-quality only, no security impact | Remove or add a comment explaining the invariant |
| `ProtectedRoute.jsx:9-36` | Correctly checks `loading` → `isAuthenticated` → `requiredRole` in order, no flash of protected content | Verified-good | — | — |
| `Routes.jsx:86-129` | Every route except `/`, `/login`, `/register`, `*` is wrapped in `ProtectedRoute` (director routes additionally get `requiredRole="director"`) | Verified-good | — | — |
| Codebase-wide (`grep localStorage.\|sessionStorage.`) | Exactly one hit, and it's a comment (`authSlice.js:11`) confirming cookie-only design; no actual storage calls anywhere | Verified-good | Cookie-only auth design is intact, nothing has crept in | — |
| `JournalEntryApprovals.jsx:73-79` vs backend `accounting.routes.js:97-108` (`directorOnly`); `DirectorApprovals.jsx:18-24` vs `auth.routes.js:22-24` (`roleCheck.directorOnly`); `Sidebar.jsx`/`menuSection.js` nav filtering | Frontend role gates match backend role requirements exactly — no button offers an action that will 403 | Verified-good | — | — |

## 6. UX Correctness for an Accounting App

**Pagination gap — full blast radius:**

| Page | Backend paginated? | Frontend requests page 2+? | Pagination UI | Verdict |
|---|---|---|---|---|
| Receipts.jsx | Yes | No | Fake (client-side re-slice) | **Bug — caps at 20** |
| Expenses.jsx | Yes | No | Fake (client-side re-slice) | **Bug — caps at 20** |
| Reports.jsx → General Ledger tab | Yes (limit 50) | No | None — only a total-count KPI tile | **Bug (new instance) — shows "Transactions: 500" while table shows only 50** |
| Students.jsx | Yes | Yes | Real server-driven pager | Correct |
| JournalEntries.jsx | Yes | Yes | Real pager | Correct |
| Payroll.jsx | Yes | Yes | Real pager | Correct |
| PettyCash.jsx | Yes | Yes | Real pager | Correct |
| Ledger.jsx | Yes | Yes | Real pager | Correct |
| Employees.jsx / Vendors.jsx | No (unpaginated by design) | N/A | Client pager over full dataset | Correct, not a bug |
| BankBook.jsx | No | N/A | None | No bug, but dead `page`/`limit` fields in `defaultFilters()` — vestigial/misleading |
| DirectorApprovals.jsx / JournalEntryApprovals.jsx | No (naturally small lists) | N/A | N/A | Correct |

Root cause: `components/common/Table.jsx:37-41` paginates by slicing whatever array it's given — it never refetches. Any page backed by a real paginated endpoint that doesn't pass a `page` param inherits this silently.

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `Receipts.jsx:147-155` | Delete fires immediately via `onClick`, no modal/confirm — same page has modals for Approve/Reject | Critical | Irreversible deletion of a financial receipt, one accidental click away | Add the same `Modal` pattern used for reject on this page |
| `Reports.jsx:69-78` + `GeneralLedgerReport.jsx` | General ledger report tab silently truncates to 50 rows, no pager (see table above) | High | A formal financial report displaying an incomplete transaction set with no indication is a correctness issue, not just UX | Thread `page`/`limit` + add pager |
| `Receipts.jsx:34`, `Expenses.jsx:41` | Lists cap at 20 records via fake client pagination (see table above) | High | Users cannot see/act on records beyond the first page — core list functionality is broken for any account with >20 records | Pass `page`/`limit` to the hooks and add real pager (pattern already exists in Payroll/PettyCash/Ledger) |
| `Receipts.jsx:75-79`, `JournalEntries.jsx:354-356,464-466`, `Ledger.jsx:210`, `PayslipPreview.jsx:19`, `Expenses.jsx:104`, `JournalEntryApprovals.jsx:31-32`, `JournalEntryDetails.jsx:33-54`, `EmployeeDetailsModal.jsx:32`, `BankCash.jsx:449,732` | Raw `new Date(value).toLocaleDateString()` on full ISO timestamps, bypassing the safer `utils/date.js` helpers | High (receipts/journal/ledger/payslip) / Medium (others) | Timezone-dependent: a receipt/journal entry saved near UTC midnight can display on the wrong calendar day, corrupting the visible accounting period on source-of-truth screens and legal payslips | Route all display dates through `formatDisplayDate()` |
| `JournalEntryApprovals.jsx:281-290` | Approve fires immediately with no confirmation; Reject on the same row requires a typed reason in a modal | High | Approve posts to the general ledger (app itself calls this effectively permanent) — the harder-to-undo action is the unguarded one | Add a confirm modal to Approve, matching Reject |
| `DirectorApprovals.jsx:91-96` | User-approval fires immediately, no confirmation (Reject at least uses `window.prompt`) | Medium | Grants system access with a single click | Add confirmation |
| `JournalEntries.jsx:172`, `Payroll.jsx:270` | Delete uses native `window.confirm()` instead of the styled `Modal` used everywhere else | Low | Confirmation exists (not a data-loss risk), just visually inconsistent | Swap for the shared `Modal` |
| `Expenses.jsx:124,179,181`, `Payroll.jsx:341,348,355,507,511,515,522,749`, `JournalEntries.jsx:368,372,447,456`, `DynamicJournalForm.jsx:405,426,440,446` | Raw `.toLocaleString()` instead of shared `formatCurrency()` — inconsistent decimal places for the same value type, including inside the live debit/credit balance in the journal entry form itself | Medium | Undermines trust in figures in an accounting app; the journal form case is the one users check to confirm debits=credits | Use `formatCurrency` everywhere |
| `JournalEntryApprovals.jsx:26-29` | A third, independently-defined currency formatter (`numFmt`/`fmtCurrency`) with a stray space (`"৳ 1,234.00"` vs `"৳1,234.00"` elsewhere) | Low | Cosmetic inconsistency + duplicated logic that can drift further | Use the shared `formatCurrency` |
| `Expenses.jsx`, `Employees.jsx` date inputs; `PettyCash.jsx`/`BankBook.jsx` via `toISODate`/`todayISO` | Date **inputs** correctly avoid the shift bug (string-sliced or using the safe utility) | Verified-good | Confirms the shift bug is confined to display code | — |
| `Expenses.jsx:267-275`, `Employees.jsx:442-466`, `Vendors.jsx:225-233`, `Students.jsx:352-377`, `Receipts.jsx:302-333`, `JournalEntryApprovals.jsx:394-426`, `BankBook.jsx:386-392` | Delete/reject/cancel correctly behind a styled `Modal` | Verified-good | — | — |

## 7. Build, Deps & Hygiene

**npm audit** — `--omit=dev`: 7 vulnerabilities (4 High, 3 Moderate) — **axios** (SSRF/prototype-pollution/ReDoS, ~24 advisories), **react-router** (RCE via deserialization, open redirect, stored XSS, CSRF), **vite** (dev-server path traversal/arbitrary file read — dev-only), **form-data** (CRLF injection), plus Moderate: dompurify, follow-redirects, postcss. Including devDependencies: 11 total (adds babel/core Low, brace-expansion/js-yaml Moderate, flatted High).

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `package.json` deps (axios, react-router, form-data) | High-severity known CVEs in packages actually exercised at runtime | High | axios is the sole HTTP client; react-router drives all routing — these aren't hypothetical | Run `npm audit fix`, verify no breaking major-version bumps |
| `vite` devDependency | High-severity dev-server vulnerabilities | Medium | Dev-only, not shipped to prod, but real risk while developing on this machine | Update via audit fix |
| `tailwind.config.js:98-100` | Syntax error (`node --check` confirms: missing comma before `plugins: []`) — file is invalid JS today | Medium-High | Currently inert only because Tailwind v4's CSS-first config (`@theme` in `index.css`) doesn't read this file — but it's a landmine for anyone/any tool that assumes it's live | Delete the stale v3-style config (dead) or fix the syntax if still needed |
| `src/services/apiMethods.js:93,123` | `reportAPI`, `searchAPI` exported but never imported (knip-confirmed) | Low | Dead code / incomplete feature signal | Remove or wire up |
| `src/components/coa/COATreeView.jsx:105,108` | Leftover `console.log("CLICKED ACCOUNT:"...)` / `"MODAL SHOULD OPEN"` debug statements | Low-Medium | Console noise in production, code-quality signal | Remove |
| `src/pages/Reports.jsx:137` | Hardcoded external CDN URL to Tailwind v2 (outdated, disconnected from the app's actual v4 styles) loaded for print preview | Low-Medium | Visual drift risk in printed output + runtime dependency on a third-party CDN for the print feature | Bundle the actual app styles instead of a CDN v2 stylesheet |
| `src/services/api.js:3` | `import.meta.env.VITE_API_URL \|\| 'http://localhost:5000/api'` | Low | Sensible dev fallback; only risk is silent-to-localhost if env var is unset in a real deploy (fails loudly, not silently) | Acceptable as-is |
| lucide-react (40 sites), recharts, jspdf/html2canvas | All named/dynamic imports, properly lazy-loaded per page | Verified-good | No bundle bloat from heavy libs | — |
| `.env.local` | Correctly gitignored; `.env.example` matches | Verified-good | — | — |
| `knip` run | No unused files or dependencies beyond the two exports above | Verified-good | — | — |

## 8. Testing

| File/Location | Issue | Severity | Why it matters | Suggested fix |
|---|---|---|---|---|
| `vite.config.js` (no `test` block) | Missing `environment: 'jsdom'` / `setupFiles` causes `smoke.test.jsx` to fail with "document is not defined"; `src/test/setup.js` exists but is orphaned (never referenced) | Medium | Breaks 1 of 3 test files today; blocks any future component test until fixed | Add `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'] }` |
| `src/services/api.js` (refresh-token interceptor, lines ~39-91) | Zero test coverage on the single-flight refresh/401-retry/redirect logic | High | Most session-integrity-sensitive code in the app; a regression could cause infinite refresh loops or silent auth failures with nothing to catch it | Add interceptor unit tests (mock 401 → refresh → retry, concurrent-request dedup) |
| `DirectorApprovals.jsx`, `JournalEntryApprovals.jsx`, `Expenses.jsx` | No tests for approval/rejection state transitions | High | Silent regressions on financial-record approval flows are costly | Add component/integration tests for approve/reject paths |
| `DynamicJournalForm.jsx`, `BookEntryRow.jsx`, `PettyCash.jsx`, `Payroll.jsx`, `BankBook.jsx`/`BankCash.jsx`, `Receipts.jsx` | No tests on any money-entry form/component — only pure `currency.test.js`/`validation.test.js` helper units are tested (38 passing) | High | Core money-entry surfaces of an accounting app have no regression safety net | Add form-level tests for the highest-value flows first (journal entry, payroll) |

---

## Top 5 Critical Issues

1. **Unconfirmed one-click receipt deletion** (`Receipts.jsx:147-155`) — irreversible loss of a financial record with no modal, inconsistent with the same page's Approve/Reject modals.
2. **Silent data truncation on core financial lists/reports** — Receipts and Expenses cap at 20 records via fake client-side pagination (`Receipts.jsx:34`, `Expenses.jsx:41`, root cause `Table.jsx:37-41`), and the Reports → General Ledger tab shows a correct total count while rendering only the first 50 rows with no pager (`Reports.jsx:69-78`). Users cannot see or act on the majority of their own data.
3. **Hand-rolled ZIP/XLSX/PDF binary-format writer embedded in a page component** (`PettyCashReportPage.jsx:53-361,452-713`) — ~550 lines of untested CRC32/binary-layout code generating financial export files; any subtle bug silently corrupts exports finance teams rely on.
4. **Four dead Redux slices + no governing data-fetching convention** (`bankSlice`, `accountingSlice`, `receiptSlice`, `studentSlice` — 36% of the store) — architecture debt that actively misleads contributors and risks a future dev "reviving" one into a real duplicate-state bug.
5. **No Redux state reset on logout** (`store.js`, `authSlice.js:88-158`) — on a shared/office device, a fast re-login as a different user can show the previous user's cached financial/student data, since only the `auth` slice clears.

*(Honorable mentions just below the cut line: zero field-level backend error surfacing anywhere in the app; Payroll silently coercing invalid salary input to ৳0; zero unsaved-changes protection on journal entry/payroll forms; zero test coverage on the auth interceptor and every money-handling flow.)*

## Architecture Decisions Needed

- **Redux vs. React Query vs. ad-hoc axios**: no documented convention exists. Recommend picking one direction (React Query for server state is the natural fit given it's already used for 5 features) and scheduling the retirement of the 4 dead slices plus the 5 ad-hoc axios call sites.
- **Form validation standardization**: react-hook-form + zod resolvers are installed and proven on one form (Expenses) but unused everywhere else. Decide whether to roll this out to all ~10 forms (recommended, infra already paid for) or keep manual validation for simple ones intentionally.
- **Pagination pattern**: good real implementations already exist (Payroll, PettyCash, JournalEntries, Ledger, Students). Decide whether `Table.jsx`'s built-in client-side pagination should be deprecated in favor of always server-driving paginated lists, then retrofit Receipts/Expenses/Reports.
- **Currency/date formatting enforcement**: `utils/currency.js` and `utils/date.js` already exist and work — the gap is adoption, not capability. Consider an ESLint rule banning raw `toLocaleString()`/`new Date(...).toLocaleDateString()` in favor of the shared utilities.
- **`tailwind.config.js` fate**: currently a syntactically broken, functionally dead leftover from a pre-v4 setup. Decide to delete it outright or repair it — leaving it broken-but-inert is a landmine for tooling that assumes it's authoritative.
- **Report/export architecture**: the hand-rolled XLSX writer and the `oklch()`-patching `html2canvas` PDF hack in `Reports.jsx` are both fragile, untested workarounds. Decide whether to adopt a proper export library (`exceljs`) and/or a different PDF pipeline before the Tailwind-color hack breaks on the next upgrade.
