import React from "react";

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon: ButtonIcon,
  // Updated default: border-red-600, text-red-600, and a subtle hover bg
  buttonColor = "border border-red-600 text-red-600 hover:bg-red-50",
  iconBg = "bg-red-50",
  iconColor = "text-red-600",
  isLoading = false,
}) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
            {Icon && <Icon size={20} />}
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {buttonText && (
          <button
            onClick={onButtonClick}
            type="button"
            disabled={isLoading}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition md:w-auto ${buttonColor} ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <>
                {ButtonIcon && <ButtonIcon size={16} />}
                {buttonText}
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};

export default SectionHeader;
