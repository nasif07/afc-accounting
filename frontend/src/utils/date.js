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

// Day 1 of the calendar month currently in progress. Built from local
// year/month parts (never by subtracting days), so it lands on the 1st in
// every month length and needs no clamping. Paired with todayISO() this is
// the app's standard "this month so far" filter window.
export const firstDayOfCurrentMonth = () => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};

// "2026-09" -> first and last calendar day of that month, built from local
// year/month parts so every month length lands on its real last day.
export const monthRange = (monthValue) => {
  const [year, month] = monthValue.split("-").map(Number);
  return {
    startDate: toISODate(new Date(year, month - 1, 1)),
    endDate: toISODate(new Date(year, month, 0)),
  };
};

// The month a date range covers, or "" for any other range — so a month
// dropdown reads "Custom range" as soon as either date is edited by hand.
// The current month also matches "1st → today", the app's default window.
export const monthFromRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "";
  const monthValue = startDate.slice(0, 7);
  const range = monthRange(monthValue);
  if (range.startDate !== startDate) return "";
  if (range.endDate === endDate) return monthValue;
  const today = todayISO();
  return endDate === today && today.slice(0, 7) === monthValue
    ? monthValue
    : "";
};

const monthLabel = (monthValue) => {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
};

// The last `count` months, newest first, as Select options. A selected month
// older than that (e.g. restored from a link) still gets its own option.
export const buildMonthOptions = (selectedMonth, count = 24) => {
  const now = new Date();
  const options = Array.from({ length: count }, (_, index) => {
    const value = toISODate(
      new Date(now.getFullYear(), now.getMonth() - index, 1),
    ).slice(0, 7);
    return { value, label: monthLabel(value) };
  });
  if (selectedMonth && !options.some((o) => o.value === selectedMonth)) {
    options.push({ value: selectedMonth, label: monthLabel(selectedMonth) });
  }
  return options;
};

// "2026-08" when today is any day in September 2026 — the default period for
// month-end reporting.
export const previousMonthValue = () => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(
    0,
    7,
  );
};

// Financial years follow the org setting (settings.financialYearType):
// "july-june" (Bangladesh default) or "jan-dec". A year is identified by the
// calendar year it starts in, e.g. "2025" is Jul 2025 – Jun 2026.
export const financialYearRange = (startYear, type = "july-june") => {
  const year = Number(startYear);
  return type === "jan-dec"
    ? { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
    : { startDate: `${year}-07-01`, endDate: `${year + 1}-06-30` };
};

export const financialYearLabel = (startYear, type = "july-june") => {
  const year = Number(startYear);
  return type === "jan-dec"
    ? `${year} (Jan – Dec)`
    : `FY ${year}–${String(year + 1).slice(-2)} (Jul – Jun)`;
};

// The financial year in progress plus the `count - 1` before it, newest first.
export const financialYearOptions = (type = "july-june", count = 6) => {
  const now = new Date();
  const currentStart =
    type === "jan-dec" || now.getMonth() >= 6
      ? now.getFullYear()
      : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, index) => {
    const year = currentStart - index;
    return { value: String(year), label: financialYearLabel(year, type) };
  });
};

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

// Human-readable label for a { from, to } range — the period line printed at
// the top of the cash-book reports. Either bound may be missing.
export const formatPeriodLabel = (
  dateRange = {},
  fallback = "All approved transactions",
) => {
  if (dateRange.from && dateRange.to) {
    return `${formatDisplayDate(dateRange.from)} to ${formatDisplayDate(dateRange.to)}`;
  }

  if (dateRange.from) return `From ${formatDisplayDate(dateRange.from)}`;
  if (dateRange.to) return `Up to ${formatDisplayDate(dateRange.to)}`;
  return fallback;
};
