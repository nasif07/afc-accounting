export const toISODate = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Any other string is a full ISO timestamp (Mongoose Date -> JSON is
    // always UTC, e.g. "2026-07-04T00:00:00.000Z"). Read it back with UTC
    // getters to recover the exact calendar day that was stored — local
    // getters would reinterpret a UTC-midnight instant as the previous or
    // next day depending on the viewer's timezone offset, which is the
    // classic "date shifts by one" bug for backend-sourced date fields.
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return "";
    const utcYear = parsed.getUTCFullYear();
    const utcMonth = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const utcDay = String(parsed.getUTCDate()).padStart(2, "0");
    return `${utcYear}-${utcMonth}-${utcDay}`;
  }

  // A Date object was constructed by the caller in local time (e.g.
  // `new Date(year, month, 1)`) — it has no serialization round-trip to
  // correct for, so its local representation is exactly what was intended.
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
