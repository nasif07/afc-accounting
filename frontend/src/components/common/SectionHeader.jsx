import Button from "./Button";

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon: ButtonIcon,
  buttonVariant = "outline",
  iconBg = "bg-red-50",
  iconColor = "text-red-600",
  isLoading = false,
  children,
}) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${iconBg} ${iconColor}`}>
            {Icon && <Icon size={18} className="sm:hidden" />}
            {Icon && <Icon size={20} className="hidden sm:block" />}
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:mt-1 sm:text-sm">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {children}
          {buttonText && (
            <Button
              type="button"
              variant={buttonVariant}
              size="sm"
              onClick={onButtonClick}
              loading={isLoading}
              icon={ButtonIcon}
              className="w-full md:w-auto">
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SectionHeader;
