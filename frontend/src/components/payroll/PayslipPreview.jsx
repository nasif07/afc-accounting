import { useRef } from "react";
import { Download, FileType, Printer, X } from "lucide-react";
import { formatDisplayDate } from "../../utils/date";
import { openPrintWindow } from "../../utils/printWindow";
import {
  resolveEarnings,
  formatServicePeriod,
  resolveLeave,
} from "../../utils/payslipFields";
import { REPORT_LOGO } from "../../constants/branding";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// The printed slip uses a hairline rule for every ruled edge — one constant so
// the main table's grid and the ruled-only sub-tables can never drift apart.
const RULE = "1px solid #333";
const DASH = "–";

function fmt(value, { blankWhenZero = true } = {}) {
  const n = Number(value || 0);
  if (!n) return blankWhenZero ? DASH : "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDecimal(value) {
  const n = Number(value || 0);
  if (!n) return DASH;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value) {
  if (!value) return "";
  return formatDisplayDate(value, { locale: "en-GB" });
}

// British/Indian convention, matching the printed slip:
// "Taka Thirty Nine Thousand One Hundred and Ninety Only".
function numberToWords(value) {
  const amount = Math.round(Number(value || 0));
  if (!amount) return "Taka Zero Only";
  const b20 = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const t10 = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const sub1000 = (n) => {
    const parts = [];
    if (n >= 100) { parts.push(`${b20[Math.floor(n / 100)]} Hundred`); n %= 100; }
    const tail = [];
    if (n >= 20) { tail.push(t10[Math.floor(n / 10)]); n %= 10; }
    if (n > 0)   tail.push(b20[n]);
    // "One Hundred and Ninety" — the "and" only appears after a hundreds part.
    if (parts.length && tail.length) return `${parts[0]} and ${tail.join(" ")}`;
    return [...parts, ...tail].join(" ");
  };
  const words = [];
  let rem = amount;
  [["Crore",10000000],["Lakh",100000],["Thousand",1000],["",1]].forEach(([label, divisor]) => {
    const unit = Math.floor(rem / divisor);
    if (unit) { words.push(`${sub1000(unit)} ${label}`.trim()); rem %= divisor; }
  });
  return `Taka ${words.join(" ")} Only`;
}

// ── Header info block ────────────────────────────────────────────────────────

function InfoRow({ label, value, labelWidth = 150, bold }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 3 }}>
      <span style={{ fontWeight: "bold", width: labelWidth, flexShrink: 0, fontSize: 10 }}>
        {label}:
      </span>
      <span style={{ fontWeight: bold ? "bold" : "normal", fontSize: 10 }}>{value ?? ""}</span>
    </div>
  );
}

// ── Main salary table ────────────────────────────────────────────────────────
//
// The printed slip rules the five columns top-to-bottom but leaves the item
// rows unseparated — only the header and the three total rows carry a
// horizontal rule. Every cell therefore draws side rules unconditionally and
// opts into a top rule.

function Cell({ children, align = "left", bold, topRule, first, indent }) {
  return (
    <td
      style={{
        borderLeft: first ? "none" : RULE,
        borderTop: topRule ? RULE : "none",
        padding: "2px 6px",
        paddingLeft: indent ? 18 : 6,
        fontSize: 10,
        fontWeight: bold ? "bold" : "normal",
        textAlign: align,
        verticalAlign: "top",
        // Only the particulars column may wrap — a wrapped figure would break
        // the row's alignment with its neighbours.
        whiteSpace: first ? "normal" : "nowrap",
      }}
    >
      {children ?? ""}
    </td>
  );
}

function ItemRow({ label, hours, rate, amount, extended, bold, topRule, indent }) {
  return (
    <tr>
      <Cell first bold={bold} topRule={topRule} indent={indent}>{label}</Cell>
      <Cell align="center" topRule={topRule}>{hours}</Cell>
      <Cell align="center" topRule={topRule}>{rate}</Cell>
      <Cell align="right" topRule={topRule}>{amount}</Cell>
      <Cell align="right" bold={bold} topRule={topRule}>{extended}</Cell>
    </tr>
  );
}

function SectionRow({ label }) {
  return (
    <tr>
      <Cell first bold>{label}</Cell>
      <Cell /><Cell /><Cell /><Cell />
    </tr>
  );
}

function TotalRow({ label, amount }) {
  return (
    <tr>
      <Cell first bold align="right" topRule>{label}</Cell>
      <Cell topRule /><Cell topRule /><Cell topRule />
      <Cell align="right" bold topRule>{amount}</Cell>
    </tr>
  );
}

// ── Rule-only sub-tables (leave / health fund / life fund) ────────────────────

function SubTable({ columns, rows, width = "100%" }) {
  return (
    <table style={{ width, borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th
              key={i}
              style={{
                borderTop: RULE,
                borderBottom: RULE,
                padding: "3px 6px",
                fontSize: 10,
                fontWeight: col.plain ? "normal" : "bold",
                fontStyle: col.italic ? "italic" : "normal",
                textAlign: col.align || (i === 0 ? "left" : "center"),
                width: col.width,
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              const isObj = cell !== null && typeof cell === "object";
              const text = isObj ? cell.text : cell;
              const bold = isObj ? cell.bold : false;
              return (
                <td
                  key={c}
                  style={{
                    borderTop: isObj && cell.topRule ? RULE : "none",
                    borderBottom: r === rows.length - 1 ? RULE : "none",
                    padding: "2px 6px",
                    fontSize: 10,
                    fontWeight: bold ? "bold" : "normal",
                    textAlign: columns[c]?.align || (c === 0 ? "left" : "center"),
                  }}
                >
                  {text ?? ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubHeading({ children, align = "center" }) {
  return (
    <div style={{ textAlign: align, fontWeight: "bold", fontSize: 10.5, marginBottom: 4 }}>
      {children}
    </div>
  );
}

// ── Payslip ──────────────────────────────────────────────────────────────────

export default function PayslipPreview({
  payroll,
  orgInfo = {},
  onClose,
  onDownload,
  downloading = false,
}) {
  const slipRef = useRef(null);

  const org = {
    orgName:               orgInfo.orgName               || "Alliance Française de Chittagong",
    orgEmail:              orgInfo.orgEmail              || "info@af-chittagong.org",
    orgPhone:              orgInfo.orgPhone              || "+88 01318896444",
    orgAddress:            orgInfo.orgAddress            || "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
    directorName:          orgInfo.directorName          || "Bruno LACRAMPE",
    directorTitle:         orgInfo.directorTitle         || "Director",
    leaveYearLabel:        orgInfo.leaveYearLabel        || "July'2025 - June'2026",
    benefitPeriodLabel:    orgInfo.benefitPeriodLabel    || "01-07-2023 to 30-06-2025",
    healthFundLabel:       orgInfo.healthFundLabel       || "Health Fund",
    bankNameForPayment:    orgInfo.bankNameForPayment    || "Brac Bank PLC",
    bankAccountForPayment: orgInfo.bankAccountForPayment || "XXXXXXXXXXXXXXX",
    orgLogo:               orgInfo.orgLogo               || REPORT_LOGO,
  };

  const emp      = payroll?.employee || {};
  const isHourly = payroll?.salaryType === "hourly";
  const month    = MONTHS[Number(payroll?.month) - 1] || "";
  const period   = `${month} ${payroll?.year || ""}`;

  const { houseRent, conveyanceAllowance } = resolveEarnings(payroll);

  const totalE = Number(payroll?.totalEarnings)
    || Number(payroll?.baseSalary || 0) + houseRent + conveyanceAllowance;
  const totalD = Number(payroll?.totalDeductions)
    || Number(payroll?.deductions || 0) + Number(payroll?.leaveDeduction || 0);
  const net = Number(payroll?.netSalary) || Math.max(0, totalE - totalD);

  const paymentInfo = payroll?.paymentMode
    || `Bank Transfer/Salary Account#${emp?.bankAccountNumber || org.bankAccountForPayment}/${emp?.bankName || org.bankNameForPayment}`;

  // Scale-point and working-hour figures are reference data carried on the
  // employee (or overridden per payroll run); they print as a dash until set.
  const scaleOfPay      = payroll?.payScale         ?? emp?.payScale;
  const scalePointValue = payroll?.scalePointValue  ?? emp?.scalePointValue;
  const monthlyHours    = payroll?.monthlyWorkingHours ?? emp?.monthlyWorkingHours;

  // Leave is managed on the employee record; org settings is only the default
  // for anyone not configured individually.
  const { annualTotal, annualTaken, sickTotal, sickTaken } = resolveLeave(
    emp,
    payroll,
    orgInfo,
  );

  // Both fund balances accrue over service, so their headings run from the
  // employee's joining date to today rather than sharing one fixed
  // organisation-wide label.
  const servicePeriod = formatServicePeriod(emp?.dateOfJoining);
  const benefitPeriodLabel = servicePeriod || org.benefitPeriodLabel;

  const healthTotal  = emp?.healthFundTotal;
  const healthTaken  = emp?.healthFundTaken;
  const healthRemain = healthTotal != null
    ? Number(healthTotal || 0) - Number(healthTaken || 0)
    : null;

  const lifeFund   = emp?.lifeFundBalance;
  const retirement = emp?.retirementBenefitBalance;
  const fundTotal  = lifeFund != null || retirement != null
    ? Number(lifeFund || 0) + Number(retirement || 0)
    : null;

  const colWidths = ["40%", "13%", "14%", "16.5%", "16.5%"];
  const colHeaders = isHourly
    ? ["Particulars", "Hours", "Payment/Hour\n(Tk.)", "Amount (Taka)", "Amount (Taka)"]
    : ["Particulars", "Extra Working\nHours", "Hourly Payment", "Amount (Taka)", "Amount (Taka)"];

  const genTime = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handlePrint = () =>
    openPrintWindow(slipRef.current, {
      title: `Payslip ${payroll?.payrollNumber || ""} — ${emp?.name || ""}`,
    });

  return (
    // No maxHeight/overflow here on purpose: the host dialog already owns a
    // scroll region, and a second one nested inside it renders two scrollbars
    // side by side. The slip grows to its natural height and the dialog
    // scrolls it.
    <div style={{ padding: 20, background: "#c8cdd6", borderRadius: 12 }}>
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
          Payslip Preview —{" "}
          <span style={{ color: "#4f46e5", fontFamily: "monospace", fontSize: 12 }}>
            {payroll?.payrollNumber || "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#fff", color: "#374151", border: "1px solid #d1d5db",
              borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={() => onDownload?.("docx")}
            disabled={!!downloading}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#fff", color: "#374151", border: "1px solid #d1d5db",
              borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            <FileType size={13} />
            {downloading === "docx" ? "Generating Word…" : "Download Word"}
          </button>
          <button
            onClick={() => onDownload?.("pdf")}
            disabled={!!downloading}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
              background: "#1e293b", color: "#fff", border: "none", borderRadius: 7,
              fontSize: 12, fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            <Download size={13} />
            {downloading === "pdf" ? "Generating PDF…" : "Download PDF"}
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
              background: "#fff", border: "1px solid #d1d5db", borderRadius: 7,
              fontSize: 12, cursor: "pointer", color: "#374151",
            }}
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* ── A4 Paper ── */}
      <div
        ref={slipRef}
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: 10,
          color: "#000",
          background: "#fff",
          width: 748,
          margin: "0 auto",
          padding: "40px 52px 32px",
          boxSizing: "border-box",
          boxShadow: "0 6px 32px rgba(0,0,0,0.22)",
          borderRadius: 3,
        }}
      >
        {/* ── Letterhead ── */}
        {/* The logo sits in a fixed box beside the titles rather than floating
            over them: the AFC mark is portrait (219×240), so sizing by width
            alone let it run down across the employee particulars. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 74, height: 64, flexShrink: 0 }}>
            <img
              src={org.orgLogo}
              alt=""
              onError={(e) => (e.target.style.display = "none")}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: "bold" }}>{org.orgName}</div>
            <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>
              Pay Slip for {period}
            </div>
          </div>
          {/* Balances the logo so the titles stay optically centred. */}
          <div style={{ width: 74, flexShrink: 0 }} aria-hidden="true" />
        </div>

        {/* ── Employee particulars ── */}
        <div style={{ display: "flex", marginBottom: 12 }}>
          <div style={{ width: "52%" }}>
            <InfoRow label="Name of the Employee" value={emp?.name} />
            <InfoRow label="Employee ID"          value={emp?.employeeCode} />
            <InfoRow label="Designation"          value={emp?.designation} />
            <InfoRow label="Date of Joining"      value={fmtDate(emp?.dateOfJoining)} />
          </div>
          <div style={{ width: "48%" }}>
            <InfoRow label="Employment Type"      labelWidth={128}
              value={isHourly ? "Paid by the Hour" : (emp?.employmentType || "Permanent")} />
            <InfoRow label="Scale of Pay"         labelWidth={128} value={fmtDecimal(scaleOfPay)} />
            <InfoRow label="Value of Scale Point" labelWidth={128} value={fmtDecimal(scalePointValue)} />
            <InfoRow label="Monthly Working Hours" labelWidth={128}
              value={monthlyHours ? String(monthlyHours) : DASH} />
          </div>
        </div>

        {/* ── Earnings & deductions ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: RULE, marginBottom: 8 }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {colHeaders.map((h, i) => (
                <th
                  key={i}
                  style={{
                    borderLeft: i === 0 ? "none" : RULE,
                    borderBottom: RULE,
                    padding: "3px 6px",
                    fontWeight: "bold",
                    fontSize: 10,
                    textAlign: "center",
                    whiteSpace: "pre-wrap",
                    verticalAlign: "middle",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionRow label={isHourly ? "Earnings - Salary" : "Earnings:"} />

            {isHourly ? (
              <>
                <ItemRow indent label="AFC"
                  hours={payroll?.workingDays || 0}
                  rate={fmtDecimal(payroll?.hourlyRate)}
                  amount={fmt(payroll?.baseSalary)} />
                <ItemRow indent label="AUW"                   hours={0}    rate={DASH} amount={DASH} />
                <ItemRow indent label="Private Class"         hours={0}    rate={DASH} amount={DASH} />
                <ItemRow indent label="DELF Exam Duty"        hours={0}    rate={DASH} amount={DASH} />
                <ItemRow indent label="DELF Answer Script"    hours={DASH} rate={DASH} amount={DASH} />
                <ItemRow indent label="Formation Initiale"    hours={0}    rate={DASH} amount={DASH} />
                <ItemRow indent label="Extra Duties - Coordination Training/Animation"
                  amount={fmt(Number(payroll?.allowances || 0) + Number(payroll?.bonus || 0))} />
              </>
            ) : (
              <>
                <ItemRow indent label="Basic Salary"         amount={fmt(payroll?.baseSalary)} />
                <ItemRow indent label="House Rent"           amount={fmt(houseRent)} />
                <ItemRow indent label="Conveyance Allowance" amount={fmt(conveyanceAllowance)} />
                <ItemRow indent label="Extra Working Hour"
                  hours={payroll?.extraWorkingHours || DASH}
                  rate={fmtDecimal(payroll?.hourlyRate)}
                  amount={fmt(payroll?.extraWorkingHourPay)} />
              </>
            )}

            <TotalRow label="Total Earnings" amount={fmt(totalE)} />

            <SectionRow label="Deductions:" />
            <ItemRow indent label="Tax Deducted at Source" amount={fmt(payroll?.deductions)} />
            {Number(payroll?.leaveDeduction) > 0 && (
              <ItemRow indent label="Leave Deduction"
                hours={payroll?.leavesTaken || 0}
                amount={fmt(payroll?.leaveDeduction)} />
            )}
            <TotalRow label="Total Deductions" amount={fmt(totalD)} />
            <TotalRow label="Net Pay"          amount={fmt(net)} />
          </tbody>
        </table>

        {/* ── In words / payment mode ── */}
        <div style={{ fontSize: 10, marginBottom: 3 }}>
          <b>In Words:</b> {numberToWords(net)}
        </div>
        <div style={{ fontSize: 10, marginBottom: 16 }}>
          <b>Mode of Payment:</b> {paymentInfo}
        </div>

        {/* ── Leave status ── */}
        <div style={{ marginBottom: 14 }}>
          <SubHeading>Leave Status ({org.leaveYearLabel})</SubHeading>
          <SubTable
            columns={[
              { label: "Leave Type",      width: "40%" },
              { label: "Total",           width: "20%" },
              { label: "Leave Taken",     width: "20%" },
              { label: "Remaining Leave", width: "20%" },
            ]}
            rows={[
              ["Annual", annualTotal, annualTaken, Math.max(0, annualTotal - annualTaken)],
              ["Sick",   sickTotal,   sickTaken,   Math.max(0, sickTotal - sickTaken)],
            ]}
          />
        </div>

        {/* ── Health fund ── */}
        <div style={{ marginBottom: 14 }}>
          <SubHeading>{servicePeriod ? `Health Fund Status: (${servicePeriod})` : "Health Fund Status"}</SubHeading>
          <SubTable
            columns={[
              { label: "",                 width: "32%" },
              { label: "Total Amount",     width: "17%" },
              { label: "Amount Taken",     width: "17%" },
              { label: "Remaining Amount", width: "17%" },
              { label: "Note",             width: "17%" },
            ]}
            rows={[[
              org.healthFundLabel,
              fmtDecimal(healthTotal),
              fmtDecimal(healthTaken),
              healthRemain != null ? fmtDecimal(healthRemain) : DASH,
              emp?.healthFundNote || "",
            ]]}
          />
        </div>

        {/* ── Life fund & signature ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <div style={{ width: 320 }}>
            <SubHeading align="left">
              Life Fund &amp; Retirement Benefit Status: ({benefitPeriodLabel})
            </SubHeading>
            <SubTable
              columns={[
                { label: "Particulars",   width: "58%" },
                { label: "Amount (Taka)", width: "42%", align: "right", plain: true, italic: true },
              ]}
              rows={[
                ["Life Fund",           fmtDecimal(lifeFund)],
                ["Retirement Benefit",  fmtDecimal(retirement)],
                [
                  { text: "Total Amount (Taka)", bold: true, topRule: true },
                  { text: fundTotal != null ? fmtDecimal(fundTotal) : DASH, bold: true, topRule: true },
                ],
              ]}
            />
          </div>

          <div style={{ textAlign: "center", minWidth: 200 }}>
            <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 56 }}>
              Authorized Signature
            </div>
            <div style={{ borderTop: RULE, paddingTop: 4 }}>
              <div style={{ fontWeight: "bold", fontSize: 10.5 }}>{org.directorName}</div>
              <div style={{ fontStyle: "italic", fontSize: 10 }}>{org.directorTitle}</div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 22, fontSize: 9, color: "#222" }}>
          <div style={{ fontWeight: "bold" }}>
            {org.orgPhone}
            {org.orgEmail ? ` – ${org.orgEmail}` : ""}
          </div>
          <div>{org.orgAddress}</div>
          <div style={{ marginTop: 6, fontSize: 8, color: "#666" }}>
            Payslip No: {payroll?.payrollNumber || "—"}
            {payroll?.referenceNumber ? `  |  Reference: ${payroll.referenceNumber}` : ""}
            {"  |  "}Generated: {genTime}
          </div>
        </div>
      </div>
    </div>
  );
}
