import { Calendar } from "lucide-react";
import { formatDisplayDate, toISODate } from "../../utils/date";

export default function DatePicker({
  label,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  error = "",
  helperText = "",
  className = "",
  ...props
}) {
  const isoValue = toISODate(value);

  const handleChange = (event) => {
    const nextValue = toISODate(event.target.value);
    onChange?.(nextValue, event);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="mb-2 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <Calendar className="pointer-events-none hidden md:block md:absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={name}
          name={name}
          type="date"
          value={isoValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white py-2.5 pl-2 md:pl-10 pr-4 text-slate-900 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-neutral-900 focus:ring-neutral-100"
          }`}
          {...props}
        />
      </div>

      {isoValue && (
        <p className="mt-1 text-xs text-slate-500">
          {formatDisplayDate(isoValue)}
        </p>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {helperText && !error && (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
