import React from "react";
import { cn } from "../../utils/cn";

// Supports two usage patterns:
//   1. Array-of-options API (common/Select):
//      <Select label="Field" name="field" options={[{value,label}]} value={v} onChange={fn} />
//   2. Children API (ui/Select pattern):
//      <Select value={v} onChange={fn}><option value="x">X</option></Select>

const Select = React.forwardRef(
  (
    {
      label,
      name,
      value,
      onChange,
      onBlur,
      options,            // array API: [{value, label}]
      children,           // children API: <option> elements
      error,
      touched,
      required = false,
      disabled = false,
      placeholder = "Select an option",
      className = "",
      ...props
    },
    ref,
  ) => {
    const hasError = touched && error;
    const useOptions = Array.isArray(options) && options.length > 0;

    const selectEl = (
      <select
        ref={ref}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-3 sm:py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-slate-800 focus:ring-slate-100",
          className,
        )}
        {...props}
      >
        {useOptions ? (
          <>
            <option value="" className="text-slate-400">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </>
        ) : (
          children
        )}
      </select>
    );

    // When used without label (bare select, children API), return the element directly
    if (!label) {
      return (
        <div className="w-full">
          {selectEl}
          {hasError && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
        </div>
      );
    }

    return (
      <div className="w-full">
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {selectEl}
        {hasError && <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
