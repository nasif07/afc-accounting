export const paymentPurposes = [
  "Admission Fee",
  "Exam Fee",
  "Book Purchase",
  "Other Fee",
];

export const paymentMethods = [
  ["cheque", "Cheque"],
  ["bank_transfer", "Bank Transfer"],
  ["bank_deposit", "Bank Deposit"],
  ["card_pos", "Card/POS"],
];

export const initialFormData = {
  transactionDate: "",
  paymentPurpose: "Admission Fee",
  paymentMethod: "bank_transfer",
  incomeHeadId: "",
  bankHeadId: "",
  amount: "",
  chequeNumber: "",
  chequeDate: "",
  referenceNo: "",
  note: "",
};

export const asOptions = (items) =>
  items.map((item) =>
    Array.isArray(item)
      ? { value: item[0], label: item[1] }
      : { value: item, label: item },
  );

export const accountLabel = (account) => {
  if (!account) return "---";
  return `${account.accountCode || ""} - ${account.accountName || ""}`.replace(
    /^ - /,
    "",
  );
};

export const normalizeMethod = (value) =>
  String(value || "").replace(/_/g, " ");
