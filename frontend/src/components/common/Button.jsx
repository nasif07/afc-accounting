import React from "react";
import { cn } from "../../utils/cn";
import { ButtonLoader } from "./Loaders";

// Supports both common/Button API (loading, variant, size) and
// ui/Button API (isLoading, fullWidth, ghost/link/warning/info variants, xs/xl/icon sizes).

const variantClasses = {
  primary:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100 disabled:bg-red-400",
  secondary:
    "bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-100 disabled:bg-slate-100",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100 disabled:bg-red-400",
  success:
    "bg-green-600 text-white hover:bg-green-700 focus:ring-green-100 disabled:bg-green-400",
  warning:
    "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-100 disabled:bg-amber-400",
  info: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100 disabled:bg-blue-400",
  outline:
    "border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-100 disabled:border-red-300 disabled:text-red-300",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus:ring-slate-100 disabled:text-slate-400",
  link: "text-red-600 underline hover:text-red-700 focus:ring-red-100 disabled:text-red-300 p-0",
};

const sizeClasses = {
  xs: "min-h-[36px] px-2.5 py-1.5 text-xs sm:min-h-0",
  sm: "min-h-[40px] px-3 py-2 text-xs sm:min-h-0 sm:py-1.5",
  md: "min-h-[44px] px-4 py-2.5 text-sm sm:min-h-0 sm:py-2",
  lg: "min-h-[44px] px-6 py-3 text-base",
  xl: "min-h-[44px] px-8 py-4 text-lg",
  icon: "h-10 w-10 p-0",
  "icon-sm": "h-8 w-8 p-0",
};

const Button = React.forwardRef(
  (
    {
      children,
      onClick,
      type = "button",
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      isLoading = false, // ui/Button API alias
      fullWidth = false,
      icon: Icon = null,
      className = "",
      ...props
    },
    ref,
  ) => {
    const isSubmitting = loading || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || isSubmitting}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition focus:outline-none focus:ring-4 active:scale-[0.98] select-none",
          variantClasses[variant] ?? variantClasses.primary,
          sizeClasses[size] ?? sizeClasses.md,
          fullWidth ? "w-full" : "",
          disabled || isSubmitting ? "cursor-not-allowed opacity-70" : "",
          className,
        )}
        {...props}>
        {isSubmitting ? <ButtonLoader /> : Icon ? <Icon size={13} /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
