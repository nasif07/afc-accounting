import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { toISODate, formatDisplayDate } from "../../utils/date";
import { cn } from "../../utils/cn";

// shadcn Calendar + Popover, replacing the old native input[type=date] —
// same prop surface (label, name, value, onChange, required, disabled,
// error, helperText, className, ...props) as before, so every existing
// call site (direct or RHF Controller-wrapped) keeps working unchanged.
//
// Date handling deliberately reuses utils/date.js exclusively — no new
// timezone logic here. `value` is normalized for display via toISODate(),
// the same function every other date-touching part of the app already
// relies on (including its UTC-getter fix for backend-sourced timestamps).
// The Calendar's `selected` Date is built from the ISO string's Y/M/D
// components at local midnight (matching formatDisplayDate()'s own
// approach) rather than `new Date(isoString)`, which would misinterpret
// UTC midnight in a positive-offset timezone like Bangladesh's UTC+6.
// react-day-picker's onSelect callback likewise hands back a Date object
// representing the clicked LOCAL calendar day — toISODate()'s "Date
// object" branch (local getters) is exactly the correct, already-tested
// path for turning that back into the right ISO string.
const isoToLocalDate = (iso) => {
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

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
  const [open, setOpen] = useState(false);
  const isoValue = toISODate(value);
  const selectedDate = isoToLocalDate(isoValue);

  const handleSelect = (date) => {
    setOpen(false);
    onChange?.(toISODate(date));
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={name}
            disabled={disabled}
            className={cn(
              "flex w-full min-h-11 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-4",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              isoValue ? "text-slate-900" : "text-slate-400",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-slate-800 focus:ring-slate-100",
            )}
            {...props}>
            <CalendarIcon size={16} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {isoValue ? formatDisplayDate(isoValue) : "Pick a date"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {error && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{helperText}</p>
      )}
    </div>
  );
}
