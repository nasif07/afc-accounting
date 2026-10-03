// Union of every getErrorMessage variant previously duplicated across
// bankBookHelpers.js, BankCash.jsx, PettyCash.jsx, pettyCashSlice.js and
// coaSlice.js. Handles both shapes callers pass in: a raw axios error
// (`.response.data.message`) and an already-unwrapped payload such as a
// fixed slice's `action.payload`/`state.error` (`.message` directly, no
// `.response` wrapper). `.response.data.message` is checked first so a raw
// axios error's specific backend message wins over axios's own generic
// "Request failed with status code NNN" `.message`.
export const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (typeof error === "string") return error;

  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    error?.error ||
    fallback
  );
};
