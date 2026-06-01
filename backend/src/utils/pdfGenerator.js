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

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

class PDFGenerator {
  static formatMoney(value) {
    const amount = Number(value || 0);
    return amount
      ? amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
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
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    });
  }

  static monthName(month) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[Number(month) - 1] || month || "";
  }

  static numberToWords(value) {
    const amount = Math.round(Number(value || 0));
    if (!amount) return "Zero taka only";

    const belowTwenty = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const wordsBelowThousand = (number) => {
      let text = "";
      if (number >= 100) {
        text += `${belowTwenty[Math.floor(number / 100)]} Hundred `;
        number %= 100;
      }
      if (number >= 20) {
        text += `${tens[Math.floor(number / 10)]} `;
        number %= 10;
      }
      if (number > 0) text += `${belowTwenty[number]} `;
      return text.trim();
    };

    const parts = [];
    let remaining = amount;
    [
      ["Crore", 10000000],
      ["Lakh", 100000],
      ["Thousand", 1000],
      ["", 1],
    ].forEach(([label, divisor]) => {
      const unit = Math.floor(remaining / divisor);
      if (unit) {
        parts.push(`${wordsBelowThousand(unit)} ${label}`.trim());
        remaining %= divisor;
      }
    });

    return `${parts.join(" ")} taka only`;
  }

  static drawPayslipText(doc, text, x, y, options = {}) {
    doc
      .font(options.bold ? "Times-Bold" : "Times-Roman")
      .fontSize(options.size || 10)
      .fillColor("#111111")
      .text(text ?? "", x, y, {
        width: options.width,
        align: options.align || "left",
        lineBreak: false,
      });
  }

  static drawPayslipRow(doc, y, cells, options = {}) {
    const rowHeight = options.height || 14;
    cells.forEach((cell) => {
      if (options.border !== false) {
        doc.rect(cell.x, y, cell.width, rowHeight).stroke("#555555");
      }
      this.drawPayslipText(doc, cell.text, cell.x + 4, y + 3, {
        width: cell.width - 8,
        align: cell.align,
        bold: options.bold || cell.bold,
        size: options.size || 9,
      });
    });
    return y + rowHeight;
  }

  static drawPayslipHeader(doc, payroll, employee, title, orgInfo = {}) {
    const org = {
      orgName:    orgInfo.orgName    || "Alliance Francaise de Chittagong",
      orgLogo:    orgInfo.orgLogo    || "",
    };

    // Logo — prefer DB-stored path, fall back to bundled asset
    const logoPath = org.orgLogo && fs.existsSync(org.orgLogo)
      ? org.orgLogo
      : path.resolve(__dirname, "../../../frontend/public/afc-logo.jpg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 52, 36, { width: 76 });
    }

    this.drawPayslipText(doc, org.orgName, 150, 52, {
      width: 300, align: "center", bold: true, size: 15,
    });
    this.drawPayslipText(doc, title, 150, 72, {
      width: 300, align: "center", bold: true, size: 12,
    });

    const left = 54;
    const right = 340;
    this.drawPayslipText(doc, "Name of the Employee:", left, 110, { bold: true });
    this.drawPayslipText(doc, employee?.name || "", 180, 110, { width: 170 });
    this.drawPayslipText(doc, "Employee ID:", left, 126, { bold: true });
    this.drawPayslipText(doc, employee?.employeeCode || "", 130, 126, { width: 170 });
    this.drawPayslipText(doc, "Designation:", left, 142, { bold: true });
    this.drawPayslipText(doc, employee?.designation || "", 130, 142, { width: 190 });
    this.drawPayslipText(doc, "Date of Joining:", left, 158, { bold: true });
    this.drawPayslipText(doc, this.formatDate(employee?.dateOfJoining), 146, 158, { width: 160 });
    this.drawPayslipText(doc, "Scale of Pay for Coordination:", left, 174, { bold: true });

    this.drawPayslipText(doc, "Employment Type:", right, 110, { bold: true });
    this.drawPayslipText(
      doc,
      payroll.salaryType === "hourly" ? "Paid by the Hour" : "Permanent",
      right + 104, 110, { width: 130, bold: true },
    );
    this.drawPayslipText(doc, "Scale of Pay:", right, 126, { bold: true });
    this.drawPayslipText(doc, this.formatMoney(payroll.baseSalary), right + 86, 126, { width: 130 });
    this.drawPayslipText(doc, "Value of Scale Point:", right, 142, { bold: true });
  }

  static async generateReceipt(
    feeCollection,
    student,
    schoolName = "Alliance School",
  ) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const filename = `receipt-${feeCollection._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text(schoolName, 100, 50);
        doc.fontSize(10).font("Helvetica").text("Fee Receipt", 100, 75);
        doc.moveTo(100, 90).lineTo(500, 90).stroke();

        // Receipt Details
        doc
          .fontSize(10)
          .text(`Receipt No: ${feeCollection.receiptNumber}`, 100, 110);
        doc.text(
          `Date: ${new Date(feeCollection.date).toLocaleDateString()}`,
          100,
          130,
        );

        // Student Details
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Student Details", 100, 160);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${student.name}`, 100, 180);
        doc.text(`Roll No: ${student.rollNumber}`, 100, 200);
        doc.text(`Class: ${student.class}`, 100, 220);

        // Fee Details
        doc.fontSize(12).font("Helvetica-Bold").text("Fee Details", 100, 260);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Fee Type: ${feeCollection.feeType}`, 100, 280);
        doc.text(`Amount: ৳${feeCollection.amount.toFixed(2)}`, 100, 300);
        doc.text(`Payment Mode: ${feeCollection.paymentMode}`, 100, 320);
        doc.text(`Reference: ${feeCollection.referenceNumber}`, 100, 340);

        // Total
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(`Total Amount: ৳${feeCollection.amount.toFixed(2)}`, 100, 380);

        // Footer
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            "This is a computer-generated receipt. No signature required.",
            100,
            500,
          );
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 100, 520);

        doc.end();

        stream.on("finish", () => {
          resolve(filepath);
        });

        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generatePayslip(payroll, employee, orgInfo = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const filename = `payslip-${payroll._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);
        const stream = fs.createWriteStream(filepath);

        stream.on("finish", () => resolve(filepath));
        stream.on("error", reject);
        doc.pipe(stream);

        const emp = employee || payroll.employee || {};
        const org = {
          orgName:              orgInfo.orgName              || "Alliance Francaise de Chittagong",
          orgPhone:             orgInfo.orgPhone             || "+88 01318896444",
          orgAddress:           orgInfo.orgAddress           || "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
          directorName:         orgInfo.directorName         || "Bruno LACRAMPE",
          directorTitle:        orgInfo.directorTitle        || "Director",
          leaveYearLabel:       orgInfo.leaveYearLabel       || "July'2025 - June'2026",
          benefitPeriodLabel:   orgInfo.benefitPeriodLabel   || "01-07-2023 to 30-06-2025",
          bankNameForPayment:   orgInfo.bankNameForPayment   || "Brac Bank PLC",
          bankAccountForPayment: orgInfo.bankAccountForPayment || "XXXXXXXXXXXXXXX",
        };

        const period = `${this.monthName(payroll.month)} ${payroll.year}`;
        const isHourly = payroll.salaryType === "hourly";

        const netSalary =
          Number(payroll.netSalary) ||
          Number(payroll.baseSalary || 0) +
            Number(payroll.allowances || 0) +
            Number(payroll.bonus || 0) -
            Number(payroll.deductions || 0) -
            Number(payroll.leaveDeduction || 0);
        const totalEarnings =
          Number(payroll.totalEarnings) ||
          Number(payroll.baseSalary || 0) +
            Number(payroll.allowances || 0) +
            Number(payroll.bonus || 0);
        const totalDeductions =
          Number(payroll.totalDeductions) ||
          Number(payroll.deductions || 0) + Number(payroll.leaveDeduction || 0);

        // ── Header ──────────────────────────────────────────────────────────
        this.drawPayslipHeader(doc, payroll, emp, `Pay Slip for ${period}`, orgInfo);

        // ── Main salary table ────────────────────────────────────────────────
        const x = 54;
        let y = 200;

        const cols = [
          { x,           width: 178 },
          { x: x + 178,  width: 62,  align: "center" },
          { x: x + 240,  width: 90,  align: "center" },
          { x: x + 330,  width: 96,  align: "right"  },
          { x: x + 426,  width: 82,  align: "right"  },
        ];

        y = this.drawPayslipRow(doc, y, [
          { ...cols[0], text: "Particulars" },
          { ...cols[1], text: "Extra Working\nHours" },
          { ...cols[2], text: "Hourly Payment" },
          { ...cols[3], text: "Amount (Taka)" },
          { ...cols[4], text: "Amount (Taka)" },
        ], { bold: true, height: 28 });

        const addRow = (label, hours, rate, amount, total, bold = false) => {
          y = this.drawPayslipRow(doc, y, [
            { ...cols[0], text: label },
            { ...cols[1], text: hours ?? "" },
            { ...cols[2], text: rate  ?? "" },
            { ...cols[3], text: amount ?? "" },
            { ...cols[4], text: total ?? "" },
          ], { bold });
        };

        // Earnings
        this.drawPayslipText(doc, isHourly ? "Earnings - Salary" : "Earnings:", x, y + 3, { bold: true });
        y += 16;

        if (isHourly) {
          addRow("AFC",                          payroll.workingDays || 0, this.formatPlainMoney(payroll.baseSalary), this.formatMoney(payroll.baseSalary), "");
          addRow("AUW",                          0,   "-", "-", "");
          addRow("Private Class",                0,   "-", "-", "");
          addRow("DELF Exam Duty",               0,   "-", "-", "");
          addRow("DELF Answer Script",           "-", "-", "-", "");
          addRow("Formation Initiale",           0,   "-", "-", "");
          addRow("Extra Duties-",                "",  "",  "",  this.formatMoney(Number(payroll.allowances || 0) + Number(payroll.bonus || 0)));
          addRow("Coordination External Courses","",  "",  "-", "");
        } else {
          addRow("Basic Salary",                 "", "", this.formatMoney(payroll.baseSalary), "");
          addRow("House Rent",                   "", "", this.formatMoney(payroll.allowances), "");
          addRow("Conveyance Allowance",         "", "", this.formatMoney(payroll.bonus),      "");
          addRow("Extra Duties-",                "", "", "",                                  "");
          addRow("Coordination External Courses","", "", "-",                                 "");
          addRow("Extra Working Hour",           payroll.workingDays || 0, "-", "-",          "");
        }
        addRow("Total Earnings", "", "", "", this.formatMoney(totalEarnings), true);

        // Deductions
        this.drawPayslipText(doc, "Deductions:", x, y + 3, { bold: true });
        y += 16;
        addRow("Tax Deducted at Source", "", "", this.formatMoney(payroll.deductions), "");
        if (!isHourly && Number(payroll.leaveDeduction)) {
          addRow("Leave Deduction", payroll.leavesTaken || 0, "", this.formatMoney(payroll.leaveDeduction), "");
        }
        addRow("Total Deductions", "", "", "", this.formatMoney(totalDeductions), true);
        addRow("Net Pay",          "", "", "", this.formatMoney(netSalary),       true);

        // In Words / Mode of Payment
        y += 10;
        this.drawPayslipText(doc, "In Words:", x, y, { bold: true });
        this.drawPayslipText(doc, this.numberToWords(netSalary), x + 60, y, { width: 428 });
        y += 18;
        this.drawPayslipText(doc, "Mode of Payment:", x, y, { bold: true });
        this.drawPayslipText(
          doc,
          payroll.paymentMode ||
            `Bank Transfer/Salary Account#${emp.bankAccountNumber || org.bankAccountForPayment}/${emp.bankName || org.bankNameForPayment}`,
          x + 102, y, { width: 386 },
        );

        // ── Leave Status ─────────────────────────────────────────────────────
        y += 28;
        this.drawPayslipText(doc, `Leave Status (${org.leaveYearLabel})`, 150, y, {
          bold: true, width: 300, align: "center",
        });
        y += 16;
        const leaveCols = [
          { x,          width: 160 },
          { x: x + 160, width: 80,  align: "center" },
          { x: x + 240, width: 100, align: "center" },
          { x: x + 340, width: 120, align: "center" },
        ];
        y = this.drawPayslipRow(doc, y, [
          { ...leaveCols[0], text: "Leave Type" },
          { ...leaveCols[1], text: "Total" },
          { ...leaveCols[2], text: "Leave Taken" },
          { ...leaveCols[3], text: "Remaining Leave" },
        ], { bold: true });
        ["Annual", "Sick"].forEach((type) => {
          const taken = type === "Annual" ? payroll.leavesTaken || 0 : 0;
          y = this.drawPayslipRow(doc, y, [
            { ...leaveCols[0], text: type },
            { ...leaveCols[1], text: "0" },
            { ...leaveCols[2], text: String(taken) },
            { ...leaveCols[3], text: "0" },
          ]);
        });

        // ── Health Fund Status ───────────────────────────────────────────────
        y += 14;
        this.drawPayslipText(doc, "Health Fund Status", 150, y, {
          bold: true, width: 300, align: "center",
        });
        y += 16;
        const healthCols = [
          { x,          width: 186 },
          { x: x + 186, width: 82,  align: "center" },
          { x: x + 268, width: 88,  align: "center" },
          { x: x + 356, width: 92,  align: "center" },
          { x: x + 448, width: 60,  align: "center" },
        ];
        y = this.drawPayslipRow(doc, y, [
          { ...healthCols[0], text: "Health Fund (July'23 - June'26)" },
          { ...healthCols[1], text: "Total Amount"     },
          { ...healthCols[2], text: "Amount Taken"     },
          { ...healthCols[3], text: "Remaining Amount" },
          { ...healthCols[4], text: "Note"             },
        ], { bold: true });
        y = this.drawPayslipRow(doc, y, [
          { ...healthCols[0], text: "" },
          { ...healthCols[1], text: "-" },
          { ...healthCols[2], text: "-" },
          { ...healthCols[3], text: "-" },
          { ...healthCols[4], text: "" },
        ]);

        // ── Life Fund & Retirement Benefit ───────────────────────────────────
        y += 14;
        this.drawPayslipText(
          doc,
          `Life Fund & Retirement Benefit Status: (${org.benefitPeriodLabel})`,
          x, y, { bold: true, size: 9 },
        );
        y += 16;
        const lifeCols = [
          { x,          width: 200 },
          { x: x + 200, width: 120, align: "right" },
        ];
        y = this.drawPayslipRow(doc, y, [
          { ...lifeCols[0], text: "Particulars",   bold: true },
          { ...lifeCols[1], text: "Amount (Taka)", bold: true },
        ], { bold: true });
        ["Life Fund", "Retirement Benefit"].forEach((label) => {
          y = this.drawPayslipRow(doc, y, [
            { ...lifeCols[0], text: label },
            { ...lifeCols[1], text: "-"   },
          ]);
        });
        y = this.drawPayslipRow(doc, y, [
          { ...lifeCols[0], text: "Total Amount (Taka)" },
          { ...lifeCols[1], text: "-"                   },
        ], { bold: true });

        // ── Authorized Signature (bottom right) ──────────────────────────────
        const sigX  = 390;
        const sigY  = y + 20;
        this.drawPayslipText(doc, "Authorized Signature", sigX, sigY,          { bold: true, width: 150, align: "center" });
        doc.moveTo(sigX, sigY + 46).lineTo(sigX + 150, sigY + 46).stroke("#333333");
        this.drawPayslipText(doc, org.directorName,  sigX, sigY + 50, { bold: true, width: 150, align: "center" });
        this.drawPayslipText(doc, org.directorTitle, sigX, sigY + 64, { width: 150, align: "center", size: 9 });

        // ── Page footer ──────────────────────────────────────────────────────
        const footerY = 780;
        this.drawPayslipText(doc, `${org.orgPhone} – ${org.orgEmail || ""}`.replace(/ – $/, ""), x, footerY - 12, { size: 9 });
        this.drawPayslipText(doc, org.orgAddress, x, footerY, { width: 500, size: 9 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateFinancialReport(
    reportType,
    data,
    schoolName = "Alliance School",
  ) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const filename = `${reportType}-${Date.now()}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text(schoolName, 100, 50);
        doc.fontSize(14).font("Helvetica-Bold").text(data.title, 100, 80);
        doc.fontSize(10).font("Helvetica").text(data.subtitle, 100, 100);
        doc.moveTo(100, 120).lineTo(500, 120).stroke();

        let yPosition = 140;

        // Report Sections
        data.sections.forEach((section) => {
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(section.name, 100, yPosition);
          yPosition += 25;

          section.items.forEach((item) => {
            doc.fontSize(10).font("Helvetica");
            doc.text(item.label, 120, yPosition);
            doc.text(`৳${item.value.toLocaleString()}`, 400, yPosition, {
              align: "right",
            });
            yPosition += 20;
          });

          const total = section.items.reduce(
            (sum, item) => sum + item.value,
            0,
          );
          doc.fontSize(10).font("Helvetica-Bold");
          doc.text(`${section.name} Total`, 120, yPosition);
          doc.text(`৳${total.toLocaleString()}`, 400, yPosition, {
            align: "right",
          });
          yPosition += 30;
        });

        // Footer
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`Generated on: ${new Date().toLocaleString()}`, 100, 700);

        doc.end();

        stream.on("finish", () => {
          resolve(filepath);
        });

        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;
