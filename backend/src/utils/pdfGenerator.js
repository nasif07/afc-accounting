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

  static drawPayslipHeader(doc, payroll, employee, title) {
    const logoPath = path.resolve(__dirname, "../../../frontend/public/afc-logo.jpg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 52, 36, { width: 76 });
    }

    this.drawPayslipText(doc, "Alliance Francaise de Chittagong", 150, 62, {
      width: 300,
      align: "center",
      bold: true,
      size: 16,
    });
    this.drawPayslipText(doc, title, 150, 82, {
      width: 300,
      align: "center",
      bold: true,
      size: 13,
    });

    const left = 54;
    const right = 362;
    const period = `${this.monthName(payroll.month)} ${payroll.year}`;
    this.drawPayslipText(doc, "Name of the Employee:", left, 124, { bold: true });
    this.drawPayslipText(doc, employee?.name || "", 176, 124, { width: 170 });
    this.drawPayslipText(doc, "Employee ID:", left, 140, { bold: true });
    this.drawPayslipText(doc, employee?.employeeCode || "", 128, 140, { width: 170 });
    this.drawPayslipText(doc, "Designation:", left, 156, { bold: true });
    this.drawPayslipText(doc, employee?.designation || "", 130, 156, { width: 200 });
    this.drawPayslipText(doc, "Date of Joining:", left, 172, { bold: true });
    this.drawPayslipText(doc, this.formatDate(employee?.dateOfJoining), 142, 172, {
      width: 160,
    });

    this.drawPayslipText(doc, "Employment Type:", right, 140, { bold: true });
    this.drawPayslipText(
      doc,
      payroll.salaryType === "hourly" ? "Paid by the Hour" : "Permanent",
      right + 100,
      140,
      { width: 120 },
    );
    this.drawPayslipText(doc, "Scale of Pay:", right, 156, { bold: true });
    this.drawPayslipText(doc, this.formatMoney(payroll.baseSalary), right + 84, 156, {
      width: 120,
    });
    this.drawPayslipText(doc, "Pay Period:", right, 172, { bold: true });
    this.drawPayslipText(doc, period, right + 84, 172, { width: 120 });
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

  static async generatePayslip(
    payroll,
    employee,
    schoolName = "Alliance School",
  ) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const filename = `payslip-${payroll._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        const employeeData = employee || payroll.employee || {};
        const period = `${this.monthName(payroll.month)} ${payroll.year}`;
        const isHourly = payroll.salaryType === "hourly";
        const netSalary =
          Number(payroll.netSalary || 0) ||
          Number(payroll.baseSalary || 0) +
            Number(payroll.allowances || 0) +
            Number(payroll.bonus || 0) -
            Number(payroll.deductions || 0) -
            Number(payroll.leaveDeduction || 0);
        const totalEarnings =
          Number(payroll.totalEarnings || 0) ||
          Number(payroll.baseSalary || 0) +
            Number(payroll.allowances || 0) +
            Number(payroll.bonus || 0);
        const totalDeductions =
          Number(payroll.totalDeductions || 0) ||
          Number(payroll.deductions || 0) + Number(payroll.leaveDeduction || 0);

        this.drawPayslipHeader(doc, payroll, employeeData, `Pay Slip for ${period}`);

        const x = 54;
        let y = 214;
        const cols = [
          { x, width: 178 },
          { x: x + 178, width: 62, align: "center" },
          { x: x + 240, width: 90, align: "right" },
          { x: x + 330, width: 96, align: "right" },
          { x: x + 426, width: 82, align: "right" },
        ];

        y = this.drawPayslipRow(
          doc,
          y,
          [
            { ...cols[0], text: "Particulars" },
            { ...cols[1], text: isHourly ? "Hours" : "Extra Working\nHours" },
            { ...cols[2], text: isHourly ? "Payment/Hour Tk." : "Hourly Payment" },
            { ...cols[3], text: "Amount Taka" },
            { ...cols[4], text: "Amount Taka" },
          ],
          { bold: true, height: 28 },
        );

        const addRow = (label, hours, rate, amount, total, bold = false) => {
          y = this.drawPayslipRow(
            doc,
            y,
            [
              { ...cols[0], text: label },
              { ...cols[1], text: hours ?? "" },
              { ...cols[2], text: rate ?? "" },
              { ...cols[3], text: amount ?? "" },
              { ...cols[4], text: total ?? "" },
            ],
            { bold },
          );
        };

        if (isHourly) {
          this.drawPayslipText(doc, "Earnings - Salary", x, y + 4, { bold: true });
          y += 16;
          addRow("AFC", payroll.workingDays || 0, this.formatPlainMoney(payroll.baseSalary), this.formatMoney(payroll.baseSalary), "");
          addRow("AUW", 0, "-", "-", "");
          addRow("Private Class", 0, "-", "-", "");
          addRow("DELF Exam Duty", 0, "-", "-", "");
          addRow("DELF Answer Script", "-", "-", "-", "");
          addRow("Formation Initiale", 0, "-", "-", "");
          addRow("Extra Duties-", "", "", "", this.formatMoney(Number(payroll.allowances || 0) + Number(payroll.bonus || 0)));
          addRow("Total Earnings", "", "", "", this.formatMoney(totalEarnings), true);
        } else {
          this.drawPayslipText(doc, "Earnings:", x, y + 4, { bold: true });
          y += 16;
          addRow("Basic Salary", "", "", this.formatMoney(payroll.baseSalary), "");
          addRow("House Rent", "", "", this.formatMoney(payroll.allowances), "");
          addRow("Conveyance Allowance", "", "", this.formatMoney(payroll.bonus), "");
          addRow("Extra Duties-", "", "", "-", "");
          addRow("Coordination External Courses", "", "", "-", "");
          addRow("Extra Working Hour", payroll.workingDays || 0, "-", "-", "");
          addRow("Total Earnings", "", "", "", this.formatMoney(totalEarnings), true);
        }

        this.drawPayslipText(doc, "Deductions:", x, y + 4, { bold: true });
        y += 16;
        addRow("Tax Deducted at Source", "", "", this.formatMoney(payroll.deductions), "");
        if (!isHourly) {
          addRow("Leave Deduction", payroll.leavesTaken || 0, "", this.formatMoney(payroll.leaveDeduction), "");
        }
        addRow("Total Deductions", "", "", "", this.formatMoney(totalDeductions), true);
        addRow("Net Pay", "", "", "", this.formatMoney(netSalary), true);

        y += 10;
        this.drawPayslipText(doc, "In Words:", x, y, { bold: true });
        this.drawPayslipText(doc, this.numberToWords(netSalary), x + 58, y, {
          width: 430,
        });
        y += 18;
        this.drawPayslipText(doc, "Mode of Payment:", x, y, { bold: true });
        this.drawPayslipText(
          doc,
          payroll.paymentMode ||
            `Bank Transfer/Salary Account#${employeeData.bankAccountNumber || "XXXXXXXXXXXXXXX"}/${employeeData.bankName || "Brac Bank PLC"}`,
          x + 90,
          y,
          { width: 420 },
        );

        if (!isHourly) {
          y += 34;
          this.drawPayslipText(doc, "Leave Status July'2025 - June'2026", 170, y, {
            bold: true,
            width: 250,
            align: "center",
          });
          y += 18;
          const leaveCols = [
            { x, width: 160 },
            { x: x + 160, width: 70, align: "center" },
            { x: x + 230, width: 90, align: "center" },
            { x: x + 320, width: 110, align: "center" },
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

          y += 16;
          this.drawPayslipText(doc, "Health Fund Status", 210, y, {
            bold: true,
            width: 180,
            align: "center",
          });
          y += 18;
          y = this.drawPayslipRow(doc, y, [
            { x, width: 190, text: "Health Fund July'23 - June'26" },
            { x: x + 190, width: 80, text: "Total Amount", align: "center" },
            { x: x + 270, width: 86, text: "Amount Taken", align: "center" },
            { x: x + 356, width: 92, text: "Remaining Amount", align: "center" },
            { x: x + 448, width: 60, text: "Note", align: "center" },
          ], { bold: true });
          y = this.drawPayslipRow(doc, y, [
            { x, width: 190, text: "" },
            { x: x + 190, width: 80, text: "-" },
            { x: x + 270, width: 86, text: "-" },
            { x: x + 356, width: 92, text: "-" },
            { x: x + 448, width: 60, text: "-" },
          ]);
        }

        const signatureY = isHourly ? 610 : 685;
        this.drawPayslipText(doc, "Authorized Signature", 390, signatureY, {
          bold: true,
          width: 140,
          align: "center",
        });
        this.drawPayslipText(doc, "Bruno LACRAMPE", 390, signatureY + 58, {
          width: 140,
          align: "center",
        });
        this.drawPayslipText(doc, "Director", 390, signatureY + 74, {
          width: 140,
          align: "center",
        });
        this.drawPayslipText(
          doc,
          "123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh",
          54,
          770,
          { width: 500, size: 9 },
        );

        doc.end();

        stream.on("finish", () => {
          resolve(filepath);
        });

        stream.on("error", reject);
        return;

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text(schoolName, 100, 50);
        doc.fontSize(10).font("Helvetica").text("Salary Slip", 100, 75);
        doc.moveTo(100, 90).lineTo(500, 90).stroke();

        // Payroll Details
        doc.fontSize(10).text(`Month: ${payroll.month}`, 100, 110);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 100, 130);

        // Employee Details
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Employee Details", 100, 160);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${payroll.employeeName}`, 100, 180);
        doc.text(`ID: ${payroll.employeeId}`, 100, 200);
        doc.text(`Designation: ${payroll.designation}`, 100, 220);
        doc.text(`Salary Type: ${payroll.salaryType}`, 100, 240);

        // Earnings
        doc.fontSize(12).font("Helvetica-Bold").text("Earnings", 100, 280);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Base Salary: ৳${payroll.baseSalary.toFixed(2)}`, 100, 300);
        doc.text(`Allowances: ৳${payroll.allowances.toFixed(2)}`, 100, 320);
        doc.text(`Bonus: ৳${payroll.bonus.toFixed(2)}`, 100, 340);

        // Deductions
        doc.fontSize(12).font("Helvetica-Bold").text("Deductions", 100, 380);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Deductions: ৳${payroll.deductions.toFixed(2)}`, 100, 400);
        doc.text(
          `Leave Deduction: ৳${payroll.leaveDeduction.toFixed(2)}`,
          100,
          420,
        );

        // Net Salary
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(`Net Salary: ৳${payroll.netSalary.toFixed(2)}`, 100, 470);

        // Footer
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            "This is a computer-generated payslip. No signature required.",
            100,
            550,
          );

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
