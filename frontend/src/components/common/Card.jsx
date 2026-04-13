export default function Card({
  children,
  title,
  subtitle,
  className = "",
  headerAction = null,
  footer = null,
}) {
  return (
    <div
      className={`bg-white rounded-lg border-slate-200 border overflow-hidden ${className}`}>
      {/* Header */}
      {(title || headerAction) && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}

      {/* Content */}
      <div className="p-6">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}
