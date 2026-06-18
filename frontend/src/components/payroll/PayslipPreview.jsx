import { Download, X } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DEFAULT_ALIGNS = ["left", "center", "center", "right", "right"];

function fmt(value) {
  const n = Number(value || 0);
  return n
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "–";
}

function fmtDate(value) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function numberToWords(value) {
  const amount = Math.round(Number(value || 0));
  if (!amount) return "Zero taka only";
  const b20 = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const t10 = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const sub1000 = (n) => {
    let r = "";
    if (n >= 100) { r += `${b20[Math.floor(n / 100)]} Hundred `; n %= 100; }
    if (n >= 20)  { r += `${t10[Math.floor(n / 10)]} `;          n %= 10;  }
    if (n > 0)    r += `${b20[n]} `;
    return r.trim();
  };
  const parts = [];
  let rem = amount;
  [["Crore",10000000],["Lakh",100000],["Thousand",1000],["",1]].forEach(([l,d]) => {
    const u = Math.floor(rem / d);
    if (u) { parts.push(`${sub1000(u)} ${l}`.trim()); rem %= d; }
  });
  return `${parts.join(" ")} taka only`;
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
      <span style={{ fontWeight: "bold", minWidth: 172, flexShrink: 0, fontSize: 9.5 }}>
        {label}:
      </span>
      <span style={{ fontWeight: bold ? "bold" : "normal", fontSize: 9.5 }}>
        {value || ""}
      </span>
    </div>
  );
}

function TRow({ cells = [], boldRow = false, noRightBorder = false, widths }) {
  return (
    <tr>
      {cells.map((cell, i) => {
        const isObj = cell !== null && typeof cell === "object";
        const text  = isObj ? cell.text  : cell;
        const align = isObj && cell.align != null ? cell.align : DEFAULT_ALIGNS[i] || "left";
        return (
          <td
            key={i}
            style={{
              border: "1px solid #666",
              padding: "2px 5px",
              fontSize: 9,
              fontWeight: boldRow ? "bold" : "normal",
              textAlign: align,
              backgroundColor: boldRow ? "#ebebeb" : "transparent",
              width: widths ? widths[i] : "auto",
            }}
          >
            {text ?? ""}
          </td>
        );
      })}
    </tr>
  );
}

function SectionHeadingRow({ label }) {
  return (
    <tr>
      <td
        colSpan={5}
        style={{
          fontWeight: "bold",
          fontSize: 9.5,
          padding: "6px 0 2px",
          border: "none",
          backgroundColor: "transparent",
        }}
      >
        {label}
      </td>
    </tr>
  );
}

export default function PayslipPreview({
  payroll,
  orgInfo = {},
  onClose,
  onDownload,
  downloading = false,
}) {
  const org = {
    orgName:               orgInfo.orgName               || "Alliance Française de Chittagong",
    orgEmail:              orgInfo.orgEmail               || "info@af-chittagong.org",
    orgPhone:              orgInfo.orgPhone               || "+88 01318896444",
    orgAddress:            orgInfo.orgAddress             || "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
    directorName:          orgInfo.directorName           || "Bruno LACRAMPE",
    directorTitle:         orgInfo.directorTitle          || "Director",
    leaveYearLabel:        orgInfo.leaveYearLabel         || "July'2025 - June'2026",
    benefitPeriodLabel:    orgInfo.benefitPeriodLabel     || "01-07-2023 to 30-06-2025",
    bankNameForPayment:    orgInfo.bankNameForPayment     || "Brac Bank PLC",
    bankAccountForPayment: orgInfo.bankAccountForPayment  || "XXXXXXXXXXXXXXX",
    orgLogo:               orgInfo.orgLogo                || "/afc-logo.jpg",
  };

  const emp          = payroll?.employee || {};
  const isHourly     = payroll?.salaryType === "hourly";
  const month        = MONTHS[Number(payroll?.month) - 1] || "";
  const period       = `${month} ${payroll?.year || ""}`;
  const totalE       = Number(payroll?.totalEarnings)   || (Number(payroll?.baseSalary || 0) + Number(payroll?.allowances || 0) + Number(payroll?.bonus || 0));
  const totalD       = Number(payroll?.totalDeductions)  || (Number(payroll?.deductions || 0) + Number(payroll?.leaveDeduction || 0));
  const net          = Number(payroll?.netSalary)        || Math.max(0, totalE - totalD);
  const paymentInfo  = payroll?.paymentMode
    || `Bank Transfer/Salary Account#${emp?.bankAccountNumber || org.bankAccountForPayment}/${emp?.bankName || org.bankNameForPayment}`;

  const colWidths = isHourly
    ? ["40%", "11%", "16%", "16.5%", "16.5%"]
    : ["40%", "13%", "14%", "16.5%", "16.5%"];

  const colHeaders = isHourly
    ? ["Particulars", "Hours", "Payment/Hour\n(Tk.)", "Amount (Taka)", "Amount (Taka)"]
    : ["Particulars", "Extra Working\nHours", "Hourly Payment", "Amount (Taka)", "Amount (Taka)"];

  const genTime = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      style={{
        padding: 20,
        background: "#c8cdd6",
        borderRadius: 12,
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          fontFamily: "Inter, system-ui, sans-serif",
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
            onClick={onDownload}
            disabled={downloading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", background: "#1e293b", color: "#fff",
              border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            <Download size={13} />
            {downloading ? "Generating PDF…" : "Download PDF"}
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 12px", background: "#fff",
              border: "1px solid #d1d5db", borderRadius: 7,
              fontSize: 12, cursor: "pointer", color: "#374151",
            }}
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* ── A4 Paper ── */}
      <div
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: 10,
          color: "#111",
          background: "#fff",
          width: 748,
          margin: "0 auto",
          padding: "44px 54px 40px",
          boxSizing: "border-box",
          boxShadow: "0 6px 32px rgba(0,0,0,0.22)",
          borderRadius: 3,
        }}
      >
        {/* ── Company Header ── */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            paddingBottom: 10,
            marginBottom: 6,
            borderBottom: "1.5px solid #aaa",
          }}
        >
          <img
            src={org.orgLogo}
            alt="logo"
            onError={(e) => (e.target.style.display = "none")}
            style={{
              position: "absolute", left: 0, top: "50%",
              transform: "translateY(-50%)", width: 70, height: "auto",
            }}
          />
          <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 0.3 }}>
            {org.orgName}
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 4 }}>
            Pay Slip for {period}
          </div>
        </div>

        {/* Payslip meta row */}
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 8.5, color: "#555", marginBottom: 12,
            padding: "4px 0", borderBottom: "1px solid #e5e7eb",
          }}
        >
          <span>
            <b>Payslip No:</b> {payroll?.payrollNumber || "—"}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <b>Reference:</b> {payroll?.referenceNumber || "—"}
          </span>
          <span><b>Generated:</b> {genTime}</span>
        </div>

        {/* ── Employee Info ── */}
        <div style={{ display: "flex", marginBottom: 14, gap: 12 }}>
          <div style={{ flex: 1 }}>
            <InfoRow label="Name of the Employee"        value={emp?.name || ""}                         />
            <InfoRow label="Employee ID"                 value={emp?.employeeCode || ""}                 />
            <InfoRow label="Designation"                 value={emp?.designation || ""}                  />
            <InfoRow label="Date of Joining"             value={fmtDate(emp?.dateOfJoining)}             />
            <InfoRow label="Scale of Pay for Coordination" value=""                                      />
          </div>
          <div style={{ flex: 1 }}>
            <InfoRow label="Employment Type"             value={isHourly ? "Paid by the Hour" : "Permanent"} bold />
            <InfoRow label="Scale of Pay"                value={payroll?.baseSalary ? fmt(payroll.baseSalary) : "—"} />
            <InfoRow label="Value of Scale Point"        value="—"                                       />
          </div>
        </div>

        {/* ── Salary Table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr>
              {colHeaders.map((h, i) => (
                <th
                  key={i}
                  style={{
                    border: "1px solid #666",
                    padding: "4px 5px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 9,
                    whiteSpace: "pre-wrap",
                    background: "#f0f0f0",
                    width: colWidths[i],
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionHeadingRow label={isHourly ? "Earnings - Salary" : "Earnings:"} />

            {isHourly ? (
              <>
                <TRow widths={colWidths} cells={["AFC",            { text: String(payroll?.workingDays || 0) }, { text: fmt(payroll?.baseSalary) }, { text: fmt(payroll?.baseSalary) }, ""]} />
                <TRow widths={colWidths} cells={["AUW",            { text: "0" }, { text: "–" }, "–", ""]} />
                <TRow widths={colWidths} cells={["Private Class",  { text: "0" }, { text: "550" }, "–", ""]} />
                <TRow widths={colWidths} cells={["DELF Exam Duty", { text: "0" }, { text: "–" }, "–", ""]} />
                <TRow widths={colWidths} cells={["DELF Answer Script", { text: "–" }, { text: "–" }, "–", ""]} />
                <TRow widths={colWidths} cells={["Formation Initiale", { text: "0" }, { text: "–" }, "–", ""]} />
                <TRow widths={colWidths} cells={[
                  "Extra Duties- Coordination Training/Animation",
                  "", "", "",
                  { text: fmt(Number(payroll?.allowances || 0) + Number(payroll?.bonus || 0)) },
                ]} />
              </>
            ) : (
              <>
                <TRow widths={colWidths} cells={["Basic Salary",           "", "", { text: fmt(payroll?.baseSalary)  }, ""]} />
                <TRow widths={colWidths} cells={["House Rent",             "", "", { text: fmt(payroll?.allowances)  }, ""]} />
                <TRow widths={colWidths} cells={["Conveyance Allowance",   "", "", { text: fmt(payroll?.bonus)       }, ""]} />
                <TRow widths={colWidths} cells={["Extra Duties-",          "", "", "",                                  ""]} />
                <TRow widths={colWidths} cells={["Coordination External Courses", "", "", "–",                          ""]} />
                <TRow widths={colWidths} cells={["Extra Working Hour", { text: String(payroll?.workingDays || 0) }, "–", "–", ""]} />
              </>
            )}

            <TRow boldRow widths={colWidths} cells={["Total Earnings", "", "", "", { text: fmt(totalE) }]} />

            <SectionHeadingRow label="Deductions:" />
            <TRow widths={colWidths} cells={["Tax Deducted at Source", "", "", { text: fmt(payroll?.deductions) }, ""]} />
            {!isHourly && Number(payroll?.leaveDeduction) > 0 && (
              <TRow widths={colWidths} cells={[
                "Leave Deduction",
                { text: String(payroll?.leavesTaken || 0) },
                "",
                { text: fmt(payroll?.leaveDeduction) },
                "",
              ]} />
            )}
            <TRow boldRow widths={colWidths} cells={["Total Deductions", "", "", "", { text: fmt(totalD) }]} />
            <TRow boldRow widths={colWidths} cells={["Net Pay",          "", "", "", { text: fmt(net)    }]} />
          </tbody>
        </table>

        {/* In Words + Payment */}
        <div style={{ fontSize: 9.5, marginBottom: 4 }}>
          <b>In Words:</b> {numberToWords(net)}
        </div>
        <div style={{ fontSize: 9.5, marginBottom: 18 }}>
          <b>Mode of Payment:</b> {paymentInfo}
        </div>

        {/* ── Leave Status ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 9.5, marginBottom: 6 }}>
            Leave Status ({org.leaveYearLabel})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Leave Type", "Total", "Leave Taken", "Remaining Leave"].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      border: "1px solid #666", padding: "3px 5px",
                      textAlign: i === 0 ? "left" : "center",
                      fontSize: 9, fontWeight: "bold", background: "#f0f0f0",
                      width: i === 0 ? "40%" : "20%",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[["Annual", 0, payroll?.leavesTaken || 0, 0], ["Sick", 0, 0, 0]].map(
                ([type, total, taken, rem]) => (
                  <tr key={type}>
                    <td style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9 }}>{type}</td>
                    {[total, taken, rem].map((v, i) => (
                      <td key={i} style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9, textAlign: "center" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {/* ── Health Fund ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 9.5, marginBottom: 6 }}>
            Health Fund Status
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Health Fund (July'23 - June'26)",
                  "Total Amount", "Amount Taken", "Remaining Amount", "Note",
                ].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      border: "1px solid #666", padding: "3px 5px",
                      textAlign: i === 0 ? "left" : "center",
                      fontSize: 9, fontWeight: "bold", background: "#f0f0f0",
                      width: i === 0 ? "30%" : "17.5%",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9 }} />
                {["–", "–", "–", ""].map((v, i) => (
                  <td key={i} style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9, textAlign: "center" }}>
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Life Fund & Signature (side by side) ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 9.5, marginBottom: 6 }}>
              Life Fund & Retirement Benefit Status: ({org.benefitPeriodLabel})
            </div>
            <table style={{ width: 310, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #666", padding: "3px 5px", fontSize: 9, fontWeight: "bold", background: "#f0f0f0", textAlign: "left" }}>
                    Particulars
                  </th>
                  <th style={{ border: "1px solid #666", padding: "3px 5px", fontSize: 9, fontWeight: "normal", background: "#f0f0f0", textAlign: "center", fontStyle: "italic" }}>
                    Amount (Taka)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[["Life Fund", "–"], ["Retirement Benefit", "–"], ["Total Amount (Taka)", "–"]].map(
                  ([label, val], i) => (
                    <tr key={label}>
                      <td style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9, fontWeight: i === 2 ? "bold" : "normal" }}>{label}</td>
                      <td style={{ border: "1px solid #666", padding: "2px 5px", fontSize: 9, textAlign: "right", fontWeight: i === 2 ? "bold" : "normal" }}>{val}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* Authorized Signature */}
          <div style={{ textAlign: "center", minWidth: 190, marginLeft: 24 }}>
            <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 52 }}>
              Authorized Signature
            </div>
            <div style={{ borderTop: "1.5px solid #333", paddingTop: 5 }}>
              <div style={{ fontWeight: "bold", fontSize: 10 }}>{org.directorName}</div>
              <div style={{ fontStyle: "italic", fontSize: 9 }}>{org.directorTitle}</div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 24,
            borderTop: "1px solid #ccc",
            paddingTop: 8,
            fontSize: 8.5,
            color: "#444",
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            {org.orgPhone}
            {org.orgEmail ? ` – ${org.orgEmail}` : ""}
          </div>
          <div>{org.orgAddress}</div>
        </div>
      </div>
    </div>
  );
}
