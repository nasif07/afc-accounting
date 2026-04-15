export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
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
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full rounded-xl border bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition
          ${
            hasError
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-neutral-900 focus:ring-neutral-100 focus:ring-2"
          }
          focus:outline-none focus:ring-4
          disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
          ${className}
        `}
        {...props}
      />

      {hasError && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {helperText && !hasError && (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
}