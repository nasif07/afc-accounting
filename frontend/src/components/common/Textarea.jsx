export default function Textarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  rows = 3,
  error,
  touched,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  helperText,
  ...props
}) {
  const hasError = touched && error;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full resize-none rounded-xl border bg-white px-4 py-3 sm:py-2.5
          text-sm text-slate-900 placeholder:text-slate-400 transition
          focus:outline-none focus:ring-4
          disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
          ${hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-slate-800 focus:ring-slate-100"}
          ${className}
        `}
        {...props}
      />

      {hasError && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
      {helperText && !hasError && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{helperText}</p>
      )}
    </div>
  );
}
