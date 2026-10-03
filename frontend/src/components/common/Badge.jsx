export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) {
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    secondary: 'bg-slate-100 text-slate-600',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    // Distinct from `danger` (red): this is the app's dedicated
    // rose "outflow/rejected" accent (paired with `success`'s emerald
    // for inflow), kept separate from red per the earlier token
    // consolidation pass's decision to preserve that pairing.
    rose: 'bg-rose-100 text-rose-800',
    info: 'bg-cyan-100 text-cyan-800',
    outline: 'border border-slate-300 text-slate-700 bg-transparent',
    // Shell-brand navy — for callers that want the app's primary navy accent
    // instead of the semantic `success` (emerald) or `primary` (blue) tones.
    navy: 'bg-brand-navy-light text-brand-navy',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-block rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
