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
  icon: Icon = null,
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

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
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
            w-full rounded-xl border bg-white px-4
            py-3 sm:py-2.5
            text-sm text-slate-900 placeholder:text-slate-400 transition
            focus:outline-none focus:ring-4
            disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
            ${Icon ? "pl-10" : ""}
            ${hasError
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-slate-800 focus:ring-slate-100"}
            ${className}
          `}
          {...props}
        />
      </div>

      {hasError && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
      {helperText && !hasError && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{helperText}</p>
      )}
    </div>
  );
}
