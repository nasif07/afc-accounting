// ─── Default (simple) exports ─────────────────────────────────────────────
export { default as Button }      from './Button';
export { default as Input }       from './Input';
export { default as Select }      from './Select';
export { default as Textarea }    from './Textarea';
export { default as Modal }       from './Modal';
export { default as Badge }       from './Badge';
export { default as SimpleCard }  from './Card';   // simple title/subtitle card
export { default as Table }       from './Table';
export { default as Pagination }  from './Pagination';
export { default as FormField }   from './FormField';
export { default as DatePicker }  from './DatePicker';
export { default as AccountCombobox } from './AccountCombobox';
export { default as MaskedAmount }    from './MaskedAmount';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as SectionHeader }  from './SectionHeader';
export { default as TopBarLoader }   from './TopBarLoader';

// ─── Compound Card components ─────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

// ─── Deliberately NOT exported here ───────────────────────────────────────
// RichTextEditor / RichTextView are imported from their own paths instead.
// This barrel is pulled in by the eagerly-loaded app shell, so anything it
// re-exports lands in the initial bundle whether the user opens that screen or
// not — and TipTap plus ProseMirror is ~200 kB that only two lazy pages need.
// Measured: re-exporting them moved ProseMirror into index.js; importing them
// directly keeps it in the ApprovalRequests/ApprovalReview chunks.

// ─── Loader utilities ─────────────────────────────────────────────────────
export {
  ButtonLoader,
  PageLoader,
  TableSkeleton,
  SectionSkeleton,
  EmptyState,
  ErrorState,
} from './Loaders';
