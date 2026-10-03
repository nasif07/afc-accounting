const fs = require("fs");
const path = require("path");
const {
  resolveEarnings,
  formatServicePeriod,
  resolveLeave,
} = require("./payslipFields");
const { resolveReportLogoPath } = require("./reportLogo");

// Single source of truth for everything printed on a payslip. Both renderers
// — pdfGenerator (PDFKit) and docxGenerator (Word) — build from this model, so
// the downloadable PDF and the editable Word file can never say different
// things about the same payroll run.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DASH = "–";

// Salary figures print as whole taka ("19,803"); fund balances keep two
// decimals ("5,500.00"). Both dash out when unset.
const formatMoney = (value) => {
  const n = Number(value || 0);
  return n
    ? n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : DASH;
};

const formatDecimal = (value) => {
  const n = Number(value || 0);
  return n
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : DASH;
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka",
  });
};

const monthName = (month) => MONTHS[Number(month) - 1] || month || "";

// British/Indian convention, matching the printed slip:
// "Taka Thirty Nine Thousand One Hundred and Ninety Only".
const numberToWords = (value) => {
  const amount = Math.round(Number(value || 0));
  if (!amount) return "Taka Zero Only";

  const belowTwenty = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const wordsBelowThousand = (n) => {
    const hundreds = [];
    if (n >= 100) { hundreds.push(`${belowTwenty[Math.floor(n / 100)]} Hundred`); n %= 100; }
    const tail = [];
    if (n >= 20) { tail.push(tens[Math.floor(n / 10)]); n %= 10; }
    if (n > 0)   tail.push(belowTwenty[n]);
    // The "and" only appears after a hundreds part: "One Hundred and Ninety".
    if (hundreds.length && tail.length) return `${hundreds[0]} and ${tail.join(" ")}`;
    return [...hundreds, ...tail].join(" ");
  };

  const parts = [];
  let remaining = amount;
  [["Crore", 10000000], ["Lakh", 100000], ["Thousand", 1000], ["", 1]].forEach(([label, divisor]) => {
    const unit = Math.floor(remaining / divisor);
    if (unit) { parts.push(`${wordsBelowThousand(unit)} ${label}`.trim()); remaining %= divisor; }
  });

  return `Taka ${parts.join(" ")} Only`;
};

const resolveLogoPath = resolveReportLogoPath;

function buildPayslipModel(payroll, employee, orgInfo = {}) {
  const emp = employee || payroll.employee || {};

  const org = {
    orgName:               orgInfo.orgName               || "Alliance Francaise de Chittagong",
    orgPhone:              orgInfo.orgPhone              || "+88 01318896444",
    orgEmail:              orgInfo.orgEmail              || "",
    orgAddress:            orgInfo.orgAddress            || "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
    directorName:          orgInfo.directorName          || "Bruno LACRAMPE",
    directorTitle:         orgInfo.directorTitle         || "Director",
    leaveYearLabel:        orgInfo.leaveYearLabel        || "July'2025 - June'2026",
    benefitPeriodLabel:    orgInfo.benefitPeriodLabel    || "01-07-2023 to 30-06-2025",
    healthFundLabel:       orgInfo.healthFundLabel       || "Health Fund",
    bankNameForPayment:    orgInfo.bankNameForPayment    || "Brac Bank PLC",
    bankAccountForPayment: orgInfo.bankAccountForPayment || "XXXXXXXXXXXXXXX",
    // Bytes, not a path. An uploaded logo lives in R2, so there is no file
    // for the generators to open — and `fs.existsSync(<r2 key>)` is false,
    // which meant the old contract failed silently by printing the bundled
    // logo instead of the configured one. getOrgInfo({ withLogo: true })
    // resolves this; logoPath stays for callers that still pass a path.
    logoImage:             orgInfo.logoImage || null,
    logoImageType:         orgInfo.logoImageType || null,
    logoPath:              resolveLogoPath(orgInfo.orgLogo),
  };

  const isHourly = payroll.salaryType === "hourly";
  const period   = `${monthName(payroll.month)} ${payroll.year}`;

  const { houseRent, conveyanceAllowance } = resolveEarnings(payroll);

  const totalEarnings =
    Number(payroll.totalEarnings) ||
    Number(payroll.baseSalary || 0) + houseRent + conveyanceAllowance;
  const totalDeductions =
    Number(payroll.totalDeductions) ||
    Number(payroll.deductions || 0) + Number(payroll.leaveDeduction || 0);
  const netSalary = Number(payroll.netSalary) || Math.max(0, totalEarnings - totalDeductions);

  // Reference figures live on the employee record (a payroll run may override
  // them); anything unset prints as a dash rather than a zero.
  const scaleOfPay      = payroll.payScale            ?? emp.payScale;
  const scalePointValue = payroll.scalePointValue     ?? emp.scalePointValue;
  const monthlyHours    = payroll.monthlyWorkingHours ?? emp.monthlyWorkingHours;

  // Leave is managed on the employee record; Settings is only the default for
  // anyone not configured individually.
  const { annualTotal, annualTaken, sickTotal, sickTaken } = resolveLeave(
    emp,
    payroll,
    orgInfo,
  );

  // Both fund balances accrue over service, so their headings run from the
  // employee's joining date to today rather than sharing one fixed
  // organisation-wide label. Falls back to the Settings label when the
  // employee has no joining date on record.
  const servicePeriod = formatServicePeriod(emp.dateOfJoining);
  const benefitPeriodLabel = servicePeriod || org.benefitPeriodLabel;

  const healthTotal  = emp.healthFundTotal;
  const healthTaken  = emp.healthFundTaken;
  const healthRemain =
    healthTotal != null ? Number(healthTotal || 0) - Number(healthTaken || 0) : null;

  const lifeFund   = emp.lifeFundBalance;
  const retirement = emp.retirementBenefitBalance;
  const fundTotal =
    lifeFund != null || retirement != null
      ? Number(lifeFund || 0) + Number(retirement || 0)
      : null;

  // ── Earnings / deductions rows ─────────────────────────────────────────────
  const rows = [{ type: "section", label: isHourly ? "Earnings - Salary" : "Earnings:" }];

  if (isHourly) {
    rows.push(
      { type: "item", label: "AFC", hours: String(payroll.workingDays || 0), rate: formatDecimal(payroll.hourlyRate), amount: formatMoney(payroll.baseSalary) },
      { type: "item", label: "AUW",                hours: "0",  rate: DASH, amount: DASH },
      { type: "item", label: "Private Class",      hours: "0",  rate: DASH, amount: DASH },
      { type: "item", label: "DELF Exam Duty",     hours: "0",  rate: DASH, amount: DASH },
      { type: "item", label: "DELF Answer Script", hours: DASH, rate: DASH, amount: DASH },
      { type: "item", label: "Formation Initiale", hours: "0",  rate: DASH, amount: DASH },
      {
        type: "item",
        label: "Extra Duties - Coordination Training/Animation",
        hours: "", rate: "",
        amount: formatMoney(houseRent + conveyanceAllowance),
      },
    );
  } else {
    rows.push(
      { type: "item", label: "Basic Salary",         hours: "", rate: "", amount: formatMoney(payroll.baseSalary) },
      { type: "item", label: "House Rent",           hours: "", rate: "", amount: formatMoney(houseRent) },
      { type: "item", label: "Conveyance Allowance", hours: "", rate: "", amount: formatMoney(conveyanceAllowance) },
      {
        type: "item",
        label: "Extra Working Hour",
        hours: payroll.extraWorkingHours ? String(payroll.extraWorkingHours) : DASH,
        rate: formatDecimal(payroll.hourlyRate),
        amount: formatMoney(payroll.extraWorkingHourPay),
      },
    );
  }

  rows.push({ type: "total", label: "Total Earnings", amount: formatMoney(totalEarnings) });
  rows.push({ type: "section", label: "Deductions:" });
  rows.push({ type: "item", label: "Tax Deducted at Source", hours: "", rate: "", amount: formatMoney(payroll.deductions) });

  if (Number(payroll.leaveDeduction)) {
    rows.push({
      type: "item",
      label: "Leave Deduction",
      hours: String(payroll.leavesTaken || 0),
      rate: "",
      amount: formatMoney(payroll.leaveDeduction),
    });
  }

  rows.push({ type: "total", label: "Total Deductions", amount: formatMoney(totalDeductions) });
  rows.push({ type: "total", label: "Net Pay",          amount: formatMoney(netSalary) });

  return {
    org,
    isHourly,
    title: `Pay Slip for ${period}`,

    particulars: {
      left: [
        ["Name of the Employee", emp.name || ""],
        ["Employee ID",          emp.employeeCode || ""],
        ["Designation",          emp.designation || ""],
        ["Date of Joining",      formatDate(emp.dateOfJoining)],
      ],
      right: [
        ["Employment Type",      isHourly ? "Paid by the Hour" : emp.employmentType || "Permanent", true],
        ["Scale of Pay",         formatDecimal(scaleOfPay)],
        ["Value of Scale Point", formatDecimal(scalePointValue)],
        ["Monthly Working Hours", monthlyHours ? String(monthlyHours) : DASH],
      ],
    },

    salary: {
      headers: isHourly
        ? ["Particulars", "Hours", "Payment/Hour\n(Tk.)", "Amount (Taka)", "Amount (Taka)"]
        : ["Particulars", "Extra Working\nHours", "Hourly Payment", "Amount (Taka)", "Amount (Taka)"],
      rows,
    },

    inWords: numberToWords(netSalary),
    paymentMode:
      payroll.paymentMode ||
      `Bank Transfer/Salary Account#${emp.bankAccountNumber || org.bankAccountForPayment}/${emp.bankName || org.bankNameForPayment}`,

    leave: {
      heading: `Leave Status (${org.leaveYearLabel})`,
      headers: ["Leave Type", "Total", "Leave Taken", "Remaining Leave"],
      rows: [
        ["Annual", String(annualTotal), String(annualTaken), String(Math.max(0, annualTotal - annualTaken))],
        ["Sick",   String(sickTotal),   String(sickTaken),   String(Math.max(0, sickTotal - sickTaken))],
      ],
    },

    health: {
      heading: servicePeriod ? `Health Fund Status: (${servicePeriod})` : "Health Fund Status",
      headers: ["", "Total Amount", "Amount Taken", "Remaining Amount", "Note"],
      rows: [[
        org.healthFundLabel,
        formatDecimal(healthTotal),
        formatDecimal(healthTaken),
        healthRemain != null ? formatDecimal(healthRemain) : DASH,
        emp.healthFundNote || "",
      ]],
    },

    funds: {
      heading: `Life Fund & Retirement Benefit Status: (${benefitPeriodLabel})`,
      headers: ["Particulars", "Amount (Taka)"],
      rows: [
        ["Life Fund",          formatDecimal(lifeFund)],
        ["Retirement Benefit", formatDecimal(retirement)],
      ],
      total: ["Total Amount (Taka)", fundTotal != null ? formatDecimal(fundTotal) : DASH],
    },

    footer: {
      contact: `${org.orgPhone}${org.orgEmail ? ` – ${org.orgEmail}` : ""}`,
      address: org.orgAddress,
      reference: [
        `Payslip No: ${payroll.payrollNumber || "—"}`,
        payroll.referenceNumber ? `Reference: ${payroll.referenceNumber}` : null,
        `Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`,
      ]
        .filter(Boolean)
        .join("  |  "),
    },
  };
}

module.exports = {
  MONTHS,
  DASH,
  buildPayslipModel,
  formatMoney,
  formatDecimal,
  formatDate,
  monthName,
  numberToWords,
};
