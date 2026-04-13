import React from "react";

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon: ButtonIcon,
  buttonColor = "bg-red-600 hover:bg-red-700",
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
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition md:w-auto ${buttonColor} ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}>
            {isLoading ? (
              "Loading..."
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
