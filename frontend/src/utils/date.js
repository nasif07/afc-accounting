export const toISODate = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const todayISO = () => toISODate(new Date());

export const formatDisplayDate = (value, options = {}) => {
  const iso = toISODate(value);
  if (!iso) return "";

  const { locale = "en-BD", ...dateOptions } = options;
  const [year, month, day] = iso.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);

  return localDate.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...dateOptions,
  });
};

export const isValidISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
