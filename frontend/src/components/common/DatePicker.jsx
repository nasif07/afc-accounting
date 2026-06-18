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
    onChange?.(toISODate(event.target.value), event);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="w-full">
        <input
          id={name}
          name={name}
          type="date"
          value={isoValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={`
            w-full rounded-xl border bg-white
            min-h-11 py-2.5
            px-3
            text-sm text-slate-900 transition
            focus:outline-none focus:ring-4
            disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
            [&::-webkit-calendar-picker-indicator]:h-5
            [&::-webkit-calendar-picker-indicator]:w-5
            [&::-webkit-calendar-picker-indicator]:opacity-40
            [&::-webkit-calendar-picker-indicator]:cursor-pointer
            [&::-webkit-clear-button]:hidden
            [&::-webkit-inner-spin-button]:hidden
            ${error
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-slate-800 focus:ring-slate-100"}
          `}
          {...props}
        />
      </div>

      {isoValue && (
        <p className="mt-1 text-xs text-slate-500">{formatDisplayDate(isoValue)}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{helperText}</p>
      )}
    </div>
  );
}
