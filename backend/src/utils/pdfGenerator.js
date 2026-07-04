const PDFDocument = require("pdfkit");
const fs = require("fs");
const os = require("os");
const path = require("path");

const getUploadDir = () =>
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL
    ? path.join(os.tmpdir(), "uploads")
    : path.join(__dirname, "../../uploads"));

const ensureUploadDir = () => {
  const uploadDir = getUploadDir();
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};

class PDFGenerator {
  static formatMoney(value) {
    const n = Number(value || 0);
    return n
      ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "–";
  }

  static formatPlainMoney(value) {
    return Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  static formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka",
    });
  }

  static monthName(month) {
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];
    return months[Number(month) - 1] || month || "";
  }

  static numberToWords(value) {
    const amount = Math.round(Number(value || 0));
    if (!amount) return "Zero taka only";

    const belowTwenty = [
      "","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
      "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen",
    ];
    const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

    const wordsBelowThousand = (n) => {
      let text = "";
      if (n >= 100) { text += `${belowTwenty[Math.floor(n / 100)]} Hundred `; n %= 100; }
      if (n >= 20)  { text += `${tens[Math.floor(n / 10)]} `;                 n %= 10;  }
      if (n > 0)    text += `${belowTwenty[n]} `;
      return text.trim();
    };

    const parts = [];
    let remaining = amount;
    [["Crore",10000000],["Lakh",100000],["Thousand",1000],["",1]].forEach(([label, divisor]) => {
      const unit = Math.floor(remaining / divisor);
      if (unit) { parts.push(`${wordsBelowThousand(unit)} ${label}`.trim()); remaining %= divisor; }
    });

    return `${parts.join(" ")} taka only`;
  }

  static drawText(doc, text, x, y, opts = {}) {
    doc
      .font(opts.bold ? "Times-Bold" : "Times-Roman")
      .fontSize(opts.size || 10)
      .fillColor(opts.color || "#111111")
      .text(text ?? "", x, y, {
        width: opts.width,
        align: opts.align || "left",
        lineBreak: false,
      });
  }

  static drawRow(doc, y, cells, opts = {}) {
    const h = opts.height || 14;
    const totalW = cells[cells.length - 1].x + cells[cells.length - 1].width - cells[0].x;

    // Fill background for total/bold rows
    if (opts.fill) {
      doc.save()
        .rect(cells[0].x, y, totalW, h)
        .fill(opts.fill);
      doc.restore();
    }

    cells.forEach((cell) => {
      doc.rect(cell.x, y, cell.width, h).stroke("#555555");
      this.drawText(doc, cell.text, cell.x + 4, y + 3, {
        width: cell.width - 8,
        align: cell.align,
        bold: opts.bold || cell.bold,
        size: opts.size || 9,
      });
    });

    return y + h;
  }

  static drawHeader(doc, payroll, employee, title, orgInfo = {}) {
    const org = {
      orgName: orgInfo.orgName || "Alliance Francaise de Chittagong",
      orgLogo: orgInfo.orgLogo || "",
    };

    const logoPath =
      org.orgLogo && fs.existsSync(org.orgLogo)
        ? org.orgLogo
        : path.resolve(__dirname, "../../../frontend/public/afc-logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 52, 36, { width: 76 });
    }

    // Organisation name + pay slip title
    this.drawText(doc, org.orgName, 150, 50, { width: 300, align: "center", bold: true, size: 15 });
    this.drawText(doc, title,        150, 70, { width: 300, align: "center", bold: true, size: 12 });

    // Horizontal rule under header
    doc.moveTo(52, 96).lineTo(543, 96).lineWidth(0.8).stroke("#888888");

    // Payslip number + generated timestamp (right-aligned below rule)
    const genLine = `Payslip No: ${payroll.payrollNumber || "—"}    |    Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
    this.drawText(doc, genLine, 52, 100, { width: 491, align: "right", size: 8, color: "#555555" });

    // Employee info block
    const left  = 54;
    const right  = 340;
    let ey = 118;

    this.drawText(doc, "Name of the Employee:",         left, ey,       { bold: true });
    this.drawText(doc, employee?.name || "",             185, ey,        { width: 150 });
    this.drawText(doc, "Employee ID:",                   left, ey + 16,  { bold: true });
    this.drawText(doc, employee?.employeeCode || "",     132, ey + 16,   { width: 150 });
    this.drawText(doc, "Designation:",                   left, ey + 32,  { bold: true });
    this.drawText(doc, employee?.designation || "",      132, ey + 32,   { width: 190 });
    this.drawText(doc, "Date of Joining:",               left, ey + 48,  { bold: true });
    this.drawText(doc, this.formatDate(employee?.dateOfJoining), 148, ey + 48, { width: 160 });
    this.drawText(doc, "Scale of Pay for Coordination:", left, ey + 64,  { bold: true });

    this.drawText(doc, "Employment Type:",               right, ey,       { bold: true });
    this.drawText(
      doc,
      payroll.salaryType === "hourly" ? "Paid by the Hour" : "Permanent",
      right + 106, ey, { width: 130, bold: true },
    );
    this.drawText(doc, "Scale of Pay:",                  right, ey + 16,  { bold: true });
    this.drawText(doc, this.formatMoney(payroll.baseSalary), right + 88, ey + 16, { width: 130 });
    this.drawText(doc, "Value of Scale Point:",          right, ey + 32,  { bold: true });
  }

  // ─── Receipt ─────────────────────────────────────────────────────────────────

  static async generateReceipt(feeCollection, student, schoolName = "Alliance School") {
    return new Promise((resolve, reject) => {
      try {
        const doc      = new PDFDocument();
        const filename = `receipt-${feeCollection._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);
        const stream   = fs.createWriteStream(filepath);

        doc.pipe(stream);

        doc.fontSize(20).font("Helvetica-Bold").text(schoolName, 100, 50);
        doc.fontSize(10).font("Helvetica").text("Fee Receipt", 100, 75);
        doc.moveTo(100, 90).lineTo(500, 90).stroke();

        doc.fontSize(10).text(`Receipt No: ${feeCollection.receiptNumber}`, 100, 110);
        doc.text(`Date: ${new Date(feeCollection.date).toLocaleDateString()}`, 100, 130);

        doc.fontSize(12).font("Helvetica-Bold").text("Student Details", 100, 160);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${student.name}`, 100, 180);
        doc.text(`Roll No: ${student.rollNumber}`, 100, 200);
        doc.text(`Class: ${student.class}`, 100, 220);

        doc.fontSize(12).font("Helvetica-Bold").text("Fee Details", 100, 260);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Fee Type: ${feeCollection.feeType}`, 100, 280);
        doc.text(`Amount: ৳${feeCollection.amount.toFixed(2)}`, 100, 300);
        doc.text(`Payment Mode: ${feeCollection.paymentMode}`, 100, 320);
        doc.text(`Reference: ${feeCollection.referenceNumber}`, 100, 340);

        doc.fontSize(12).font("Helvetica-Bold")
          .text(`Total Amount: ৳${feeCollection.amount.toFixed(2)}`, 100, 380);

        doc.fontSize(8).font("Helvetica")
          .text("This is a computer-generated receipt. No signature required.", 100, 500);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 100, 520);

        doc.end();
        stream.on("finish", () => resolve(filepath));
        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─── Payslip ──────────────────────────────────────────────────────────────────

  static async generatePayslip(payroll, employee, orgInfo = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc      = new PDFDocument({ size: "A4", margin: 36 });
        const filename = `payslip-${payroll._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);
        const stream   = fs.createWriteStream(filepath);

        stream.on("finish", () => resolve(filepath));
        stream.on("error", reject);
        doc.pipe(stream);

        const emp = employee || payroll.employee || {};
        const org = {
          orgName:               orgInfo.orgName               || "Alliance Francaise de Chittagong",
          orgPhone:              orgInfo.orgPhone               || "+88 01318896444",
          orgEmail:              orgInfo.orgEmail               || "",
          orgAddress:            orgInfo.orgAddress             || "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
          directorName:          orgInfo.directorName           || "Bruno LACRAMPE",
          directorTitle:         orgInfo.directorTitle          || "Director",
          leaveYearLabel:        orgInfo.leaveYearLabel         || "July'2025 - June'2026",
          benefitPeriodLabel:    orgInfo.benefitPeriodLabel     || "01-07-2023 to 30-06-2025",
          bankNameForPayment:    orgInfo.bankNameForPayment     || "Brac Bank PLC",
          bankAccountForPayment: orgInfo.bankAccountForPayment  || "XXXXXXXXXXXXXXX",
        };

        const period   = `${this.monthName(payroll.month)} ${payroll.year}`;
        const isHourly = payroll.salaryType === "hourly";

        const totalEarnings =
          Number(payroll.totalEarnings) ||
          Number(payroll.baseSalary || 0) + Number(payroll.allowances || 0) + Number(payroll.bonus || 0);
        const totalDeductions =
          Number(payroll.totalDeductions) ||
          Number(payroll.deductions || 0) + Number(payroll.leaveDeduction || 0);
        const netSalary =
          Number(payroll.netSalary) ||
          Math.max(0, totalEarnings - totalDeductions);

        // ── Header ──────────────────────────────────────────────────────────────
        this.drawHeader(doc, payroll, emp, `Pay Slip for ${period}`, orgInfo);

        // ── Main salary table ────────────────────────────────────────────────────
        const x = 54;
        let y = 210;

        const cols = [
          { x,           width: 182 },
          { x: x + 182,  width: 60,  align: "center" },
          { x: x + 242,  width: 88,  align: "center" },
          { x: x + 330,  width: 96,  align: "right"  },
          { x: x + 426,  width: 83,  align: "right"  },
        ];

        // Column headers
        y = this.drawRow(doc, y, [
          { ...cols[0], text: "Particulars" },
          { ...cols[1], text: isHourly ? "Hours" : "Extra Working\nHours" },
          { ...cols[2], text: isHourly ? "Payment/Hour\n(Tk.)" : "Hourly Payment" },
          { ...cols[3], text: "Amount (Taka)" },
          { ...cols[4], text: "Amount (Taka)" },
        ], { bold: true, height: 26, fill: "#f0f0f0" });

        const addRow = (label, col2, col3, col4, col5, opts = {}) => {
          y = this.drawRow(doc, y, [
            { ...cols[0], text: label },
            { ...cols[1], text: col2 ?? "" },
            { ...cols[2], text: col3 ?? "" },
            { ...cols[3], text: col4 ?? "" },
            { ...cols[4], text: col5 ?? "" },
          ], opts);
        };

        const addTotal = (label, col5) => {
          y = this.drawRow(doc, y, [
            { ...cols[0], text: label },
            { ...cols[1], text: "" },
            { ...cols[2], text: "" },
            { ...cols[3], text: "" },
            { ...cols[4], text: col5 },
          ], { bold: true, fill: "#ebebeb" });
        };

        // Earnings section heading
        this.drawText(doc, isHourly ? "Earnings - Salary" : "Earnings:", x, y + 3, { bold: true });
        y += 16;

        if (isHourly) {
          addRow("AFC",                          payroll.workingDays || 0, this.formatPlainMoney(payroll.baseSalary), this.formatMoney(payroll.baseSalary), "");
          addRow("AUW",                          0,   "–",   "–", "");
          addRow("Private Class",                0, "550",   "–", "");
          addRow("DELF Exam Duty",               0,   "–",   "–", "");
          addRow("DELF Answer Script",           "–", "–",   "–", "");
          addRow("Formation Initiale",           0,   "–",   "–", "");
          addRow(
            "Extra Duties- Coordination Training/Animation",
            "", "", "",
            this.formatMoney(Number(payroll.allowances || 0) + Number(payroll.bonus || 0)),
          );
        } else {
          addRow("Basic Salary",                 "", "", this.formatMoney(payroll.baseSalary), "");
          addRow("House Rent",                   "", "", this.formatMoney(payroll.allowances), "");
          addRow("Conveyance Allowance",         "", "", this.formatMoney(payroll.bonus),      "");
          addRow("Extra Duties-",                "", "", "",                                  "");
          addRow("Coordination External Courses","", "", "–",                                 "");
          addRow("Extra Working Hour",           payroll.workingDays || 0, "–", "–",          "");
        }

        addTotal("Total Earnings", this.formatMoney(totalEarnings));

        // Deductions section heading
        this.drawText(doc, "Deductions:", x, y + 3, { bold: true });
        y += 16;

        addRow("Tax Deducted at Source", "", "", this.formatMoney(payroll.deductions), "");
        if (!isHourly && Number(payroll.leaveDeduction)) {
          addRow("Leave Deduction", payroll.leavesTaken || 0, "", this.formatMoney(payroll.leaveDeduction), "");
        }
        addTotal("Total Deductions", this.formatMoney(totalDeductions));
        addTotal("Net Pay",          this.formatMoney(netSalary));

        // ── In Words / Mode of Payment ───────────────────────────────────────────
        y += 10;
        this.drawText(doc, "In Words:",        x, y,      { bold: true });
        this.drawText(doc, this.numberToWords(netSalary), x + 62, y, { width: 426 });
        y += 16;
        this.drawText(doc, "Mode of Payment:", x, y,      { bold: true });
        this.drawText(
          doc,
          payroll.paymentMode ||
            `Bank Transfer/Salary Account#${emp.bankAccountNumber || org.bankAccountForPayment}/${emp.bankName || org.bankNameForPayment}`,
          x + 104, y, { width: 384 },
        );

        // ── Leave Status ─────────────────────────────────────────────────────────
        y += 28;
        this.drawText(doc, `Leave Status (${org.leaveYearLabel})`, 150, y, {
          bold: true, width: 300, align: "center",
        });
        y += 16;

        const leaveCols = [
          { x,          width: 160 },
          { x: x + 160, width: 80,  align: "center" },
          { x: x + 240, width: 100, align: "center" },
          { x: x + 340, width: 120, align: "center" },
        ];
        y = this.drawRow(doc, y, [
          { ...leaveCols[0], text: "Leave Type"      },
          { ...leaveCols[1], text: "Total"           },
          { ...leaveCols[2], text: "Leave Taken"     },
          { ...leaveCols[3], text: "Remaining Leave" },
        ], { bold: true, fill: "#f0f0f0" });

        ["Annual", "Sick"].forEach((type) => {
          const taken = type === "Annual" ? payroll.leavesTaken || 0 : 0;
          y = this.drawRow(doc, y, [
            { ...leaveCols[0], text: type         },
            { ...leaveCols[1], text: "0"          },
            { ...leaveCols[2], text: String(taken)},
            { ...leaveCols[3], text: "0"          },
          ]);
        });

        // ── Health Fund Status ───────────────────────────────────────────────────
        y += 12;
        this.drawText(doc, "Health Fund Status", 150, y, {
          bold: true, width: 300, align: "center",
        });
        y += 16;

        const healthCols = [
          { x,          width: 186 },
          { x: x + 186, width: 82,  align: "center" },
          { x: x + 268, width: 88,  align: "center" },
          { x: x + 356, width: 92,  align: "center" },
          { x: x + 448, width: 61,  align: "center" },
        ];
        y = this.drawRow(doc, y, [
          { ...healthCols[0], text: "Health Fund (July'23 - June'26)" },
          { ...healthCols[1], text: "Total Amount"     },
          { ...healthCols[2], text: "Amount Taken"     },
          { ...healthCols[3], text: "Remaining Amount" },
          { ...healthCols[4], text: "Note"             },
        ], { bold: true, fill: "#f0f0f0" });
        y = this.drawRow(doc, y, [
          { ...healthCols[0], text: "" },
          { ...healthCols[1], text: "–" },
          { ...healthCols[2], text: "–" },
          { ...healthCols[3], text: "–" },
          { ...healthCols[4], text: "" },
        ]);

        // ── Life Fund & Retirement Benefit ───────────────────────────────────────
        y += 12;
        this.drawText(
          doc,
          `Life Fund & Retirement Benefit Status: (${org.benefitPeriodLabel})`,
          x, y, { bold: true, size: 9 },
        );
        y += 14;

        const lifeCols = [
          { x,          width: 200 },
          { x: x + 200, width: 120, align: "right" },
        ];
        y = this.drawRow(doc, y, [
          { ...lifeCols[0], text: "Particulars"   },
          { ...lifeCols[1], text: "Amount (Taka)" },
        ], { bold: true, fill: "#f0f0f0" });

        ["Life Fund", "Retirement Benefit"].forEach((label) => {
          y = this.drawRow(doc, y, [
            { ...lifeCols[0], text: label },
            { ...lifeCols[1], text: "–"   },
          ]);
        });
        y = this.drawRow(doc, y, [
          { ...lifeCols[0], text: "Total Amount (Taka)" },
          { ...lifeCols[1], text: "–"                   },
        ], { bold: true, fill: "#ebebeb" });

        // ── Authorized Signature ─────────────────────────────────────────────────
        const sigX = 390;
        const sigY = y + 18;
        this.drawText(doc, "Authorized Signature", sigX, sigY, { bold: true, width: 152, align: "center" });
        doc.moveTo(sigX, sigY + 48).lineTo(sigX + 152, sigY + 48).lineWidth(0.8).stroke("#333333");
        this.drawText(doc, org.directorName,  sigX, sigY + 52, { bold: true, width: 152, align: "center" });
        this.drawText(doc, org.directorTitle, sigX, sigY + 66, { width: 152, align: "center", size: 9 });

        // ── Page footer ──────────────────────────────────────────────────────────
        const footerY = 776;
        doc.moveTo(x, footerY - 4).lineTo(543, footerY - 4).lineWidth(0.5).stroke("#cccccc");
        const contact = `${org.orgPhone}${org.orgEmail ? ` – ${org.orgEmail}` : ""}`;
        this.drawText(doc, contact,       x, footerY,      { size: 8.5, color: "#444444" });
        this.drawText(doc, org.orgAddress, x, footerY + 12, { width: 340, size: 8.5, color: "#444444" });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─── Financial Report ─────────────────────────────────────────────────────────

  static async generateFinancialReport(reportType, data, schoolName = "Alliance School") {
    return new Promise((resolve, reject) => {
      try {
        const doc      = new PDFDocument();
        const filename = `${reportType}-${Date.now()}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);
        const stream   = fs.createWriteStream(filepath);

        doc.pipe(stream);

        doc.fontSize(20).font("Helvetica-Bold").text(schoolName, 100, 50);
        doc.fontSize(14).font("Helvetica-Bold").text(data.title,    100, 80);
        doc.fontSize(10).font("Helvetica").text(data.subtitle,      100, 100);
        doc.moveTo(100, 120).lineTo(500, 120).stroke();

        let yPosition = 140;

        data.sections.forEach((section) => {
          doc.fontSize(12).font("Helvetica-Bold").text(section.name, 100, yPosition);
          yPosition += 25;

          section.items.forEach((item) => {
            doc.fontSize(10).font("Helvetica");
            doc.text(item.label, 120, yPosition);
            doc.text(`৳${item.value.toLocaleString()}`, 400, yPosition, { align: "right" });
            yPosition += 20;
          });

          const total = section.items.reduce((sum, item) => sum + item.value, 0);
          doc.fontSize(10).font("Helvetica-Bold");
          doc.text(`${section.name} Total`, 120, yPosition);
          doc.text(`৳${total.toLocaleString()}`, 400, yPosition, { align: "right" });
          yPosition += 30;
        });

        doc.fontSize(8).font("Helvetica")
          .text(`Generated on: ${new Date().toLocaleString()}`, 100, 700);

        doc.end();
        stream.on("finish", () => resolve(filepath));
        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;
