import { Loader } from "lucide-react";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon: Icon = null,
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition focus:outline-none focus:ring-4";

  const variants = {
    primary:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100 disabled:bg-red-400",

    secondary:
      "bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-100 disabled:bg-slate-100",

    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100 disabled:bg-red-400",

    success:
      "bg-green-600 text-white hover:bg-green-700 focus:ring-green-100 disabled:bg-green-400",

    outline:
      "border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-100 disabled:border-red-300 disabled:text-red-300",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}

      {children}
    </button>
  );
}