const PDFDocument = require("pdfkit");
const {
  buildPayslipModel,
  formatMoney,
  formatDecimal,
  formatDate,
  monthName,
  numberToWords,
} = require("./payslipModel");
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
  // Every payslip figure is formatted by the shared payslip model, so the
  // PDF and the Word export can never render the same value differently.
  static formatMoney(value)   { return formatMoney(value); }

  static formatDecimal(value) { return formatDecimal(value); }

  static formatDate(value)    { return formatDate(value); }

  static monthName(month)     { return monthName(month); }

  static numberToWords(value) { return numberToWords(value); }

  static drawText(doc, text, x, y, opts = {}) {
    doc
      .font(opts.bold ? "Times-Bold" : "Times-Roman")
      .fontSize(opts.size || 10)
      .fillColor(opts.color || "#111111")
      .text(text ?? "", x, y, {
        width: opts.width,
        align: opts.align || "left",
        // Off by default so a stray long value can never reflow a fixed-height
        // row; `wrap` opts in where the layout reserves room for extra lines.
        lineBreak: Boolean(opts.wrap),
      });
  }

  static drawRule(doc, x1, x2, y, opts = {}) {
    doc
      .moveTo(x1, y)
      .lineTo(x2, y)
      .lineWidth(opts.width || 0.8)
      .stroke(opts.color || "#333333");
  }

  // "Label: value" pair used throughout the payslip's particulars block.
  static drawField(doc, label, value, x, y, labelWidth, opts = {}) {
    this.drawText(doc, `${label}:`, x, y, { bold: true, size: 10 });
    this.drawText(doc, value ?? "", x + labelWidth, y, {
      width: opts.width || 160,
      size: 10,
      bold: opts.bold,
    });
  }

  // A ruled-only table (no vertical grid): a rule above and below the header
  // row and one under the final row — the styling the printed slip uses for
  // its leave / health fund / life fund blocks.
  static drawRuledTable(doc, x, y, columns, rows, opts = {}) {
    const rowHeight = opts.rowHeight || 14;
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const cellX = (index) =>
      x + columns.slice(0, index).reduce((sum, col) => sum + col.width, 0);

    const drawCells = (cells, cellY, bold) => {
      cells.forEach((cell, i) => {
        const isObj = cell !== null && typeof cell === "object";
        this.drawText(doc, isObj ? cell.text : cell, cellX(i) + 4, cellY + 3, {
          width: columns[i].width - 8,
          align: columns[i].align || (i === 0 ? "left" : "center"),
          bold: bold || (isObj && cell.bold),
          size: 9.5,
        });
      });
    };

    this.drawRule(doc, x, x + tableWidth, y);
    drawCells(columns.map((col) => col.label), y, true);
    y += rowHeight;
    this.drawRule(doc, x, x + tableWidth, y);

    rows.forEach((row) => {
      if (row.some((cell) => cell !== null && typeof cell === "object" && cell.topRule)) {
        this.drawRule(doc, x, x + tableWidth, y);
      }
      drawCells(row, y);
      y += rowHeight;
    });

    this.drawRule(doc, x, x + tableWidth, y);
    return y;
  }

  // Letterhead band: 54..541 wide, 36..86 tall. The logo is fitted inside a
  // fixed box rather than scaled by width alone — a portrait logo (the AFC
  // mark is 219×240) would otherwise run its own height and overlap the
  // employee particulars below.
  static drawPayslipHeader(doc, model) {
    // pdfkit takes a Buffer or a path; the uploaded logo is only ever a
    // Buffer, so it is tried first and the on-disk path remains the fallback.
    const { logoImage, logoPath } = model.org;
    const logoSource =
      logoImage || (logoPath && fs.existsSync(logoPath) ? logoPath : null);
    if (logoSource) {
      doc.image(logoSource, 54, 36, { fit: [64, 48], align: "left", valign: "center" });
    }

    // Centred over the space that remains to the right of the logo, so a long
    // organisation name grows away from it instead of into it.
    this.drawText(doc, model.org.orgName, 126, 42, { width: 415, align: "center", bold: true, size: 13.5 });
    this.drawText(doc, model.title,       126, 60, { width: 415, align: "center", bold: true, size: 12 });
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
        const model    = buildPayslipModel(payroll, employee, orgInfo);
        const doc      = new PDFDocument({ size: "A4", margin: 36 });
        const filename = `payslip-${payroll._id}.pdf`;
        const filepath = path.join(ensureUploadDir(), filename);
        const stream   = fs.createWriteStream(filepath);

        stream.on("finish", () => resolve(filepath));
        stream.on("error", reject);
        doc.pipe(stream);

        const x = 54;
        const contentWidth = 487;

        // ── Letterhead ───────────────────────────────────────────────────────
        this.drawPayslipHeader(doc, model);

        // ── Employee particulars ─────────────────────────────────────────────
        const rightX = 330;
        const infoY  = 100;

        model.particulars.left.forEach(([label, value], i) => {
          this.drawField(doc, label, value, x, infoY + i * 16, 112, { width: 160 });
        });
        model.particulars.right.forEach(([label, value, bold], i) => {
          this.drawField(doc, label, value, rightX, infoY + i * 16, 112, { width: 99, bold });
        });

        // ── Earnings & deductions ────────────────────────────────────────────
        //
        // The printed slip rules its five columns top-to-bottom but leaves the
        // item rows unseparated — only the header and the total rows carry a
        // horizontal rule. So rows are laid out first and the grid is stroked
        // once at the end, over the full table height.
        const tableTop  = 172;
        const rowHeight = 14;
        const colWidths = [190, 68, 74, 77, 78];
        const colX      = [];
        colWidths.reduce((left, width, i) => { colX[i] = left; return left + width; }, x);

        let y = tableTop;

        const cellText = (i, text, cellY, opts = {}) =>
          this.drawText(doc, text, colX[i] + 5, cellY + 3, {
            width: colWidths[i] - 10,
            align: opts.align || (i === 0 ? "left" : i >= 3 ? "right" : "center"),
            bold: opts.bold,
            size: 9.5,
          });

        model.salary.headers.forEach((header, i) =>
          // Wrapped so a narrow column folds its caption instead of bleeding
          // across the column rule; 26pt of header height holds two lines.
          this.drawText(doc, header, colX[i] + 5, y + 4, {
            width: colWidths[i] - 10, align: "center", bold: true, size: 9, wrap: true,
          }),
        );
        y += 26;
        this.drawRule(doc, x, x + contentWidth, y);

        const labelWidth = colWidths[0] - 21;

        model.salary.rows.forEach((row) => {
          if (row.type === "section") {
            cellText(0, row.label, y, { bold: true });
            y += rowHeight;
            return;
          }

          if (row.type === "total") {
            this.drawRule(doc, x, x + contentWidth, y);
            cellText(0, row.label,  y, { bold: true, align: "right" });
            cellText(4, row.amount, y, { bold: true });
            y += rowHeight;
            return;
          }

          // Line items sit indented under their section heading. A long label
          // (the hourly "Extra Duties…" line) wraps and grows its own row
          // rather than running over the column rule.
          doc.font("Times-Roman").fontSize(9.5);
          const height = Math.max(
            rowHeight,
            doc.heightOfString(String(row.label ?? ""), { width: labelWidth }) + 4,
          );
          this.drawText(doc, row.label, colX[0] + 16, y + 3, { width: labelWidth, size: 9.5, wrap: true });
          cellText(1, row.hours,  y);
          cellText(2, row.rate,   y);
          cellText(3, row.amount, y);
          y += height;
        });

        // Outer box + column rules, stroked once over the finished table.
        const tableBottom = y;
        doc.rect(x, tableTop, contentWidth, tableBottom - tableTop).lineWidth(0.8).stroke("#333333");
        colX.slice(1).forEach((lineX) => {
          doc.moveTo(lineX, tableTop).lineTo(lineX, tableBottom).lineWidth(0.8).stroke("#333333");
        });

        // ── In Words / Mode of Payment ───────────────────────────────────────
        y = tableBottom + 10;
        this.drawText(doc, "In Words:", x, y, { bold: true });
        this.drawText(doc, model.inWords, x + 58, y, { width: 429 });
        y += 16;
        this.drawText(doc, "Mode of Payment:", x, y, { bold: true });
        this.drawText(doc, model.paymentMode, x + 96, y, { width: 391 });

        // ── Leave Status ─────────────────────────────────────────────────────
        y += 26;
        this.drawText(doc, model.leave.heading, x, y, {
          bold: true, width: contentWidth, align: "center",
        });
        y += 14;
        y = this.drawRuledTable(
          doc, x, y,
          this.withWidths(model.leave.headers, [195, 97, 97, 98]),
          model.leave.rows,
        );

        // ── Health Fund Status ───────────────────────────────────────────────
        y += 14;
        this.drawText(doc, model.health.heading, x, y, {
          bold: true, width: contentWidth, align: "center",
        });
        y += 14;
        y = this.drawRuledTable(
          doc, x, y,
          this.withWidths(model.health.headers, [155, 78, 80, 92, 82]),
          model.health.rows,
        );

        // ── Life Fund & Retirement Benefit ───────────────────────────────────
        y += 14;
        const blockTop = y;
        this.drawText(doc, model.funds.heading, x, y, { bold: true, size: 9.5 });
        y += 14;
        y = this.drawRuledTable(
          doc, x, y,
          this.withWidths(model.funds.headers, [170, 110], { 1: "right" }),
          [
            ...model.funds.rows,
            model.funds.total.map((text) => ({ text, bold: true, topRule: true })),
          ],
        );

        // ── Authorized Signature (beside the life fund block) ────────────────
        const sigX = 341;
        const sigW = 200;
        this.drawText(doc, "Authorized Signature", sigX, blockTop, { bold: true, width: sigW, align: "center" });
        this.drawRule(doc, sigX, sigX + sigW, blockTop + 56);
        this.drawText(doc, model.org.directorName,  sigX, blockTop + 60, { bold: true, width: sigW, align: "center" });
        this.drawText(doc, model.org.directorTitle, sigX, blockTop + 74, { width: sigW, align: "center", size: 9.5 });

        // ── Page footer ──────────────────────────────────────────────────────
        const footerY = 770;
        this.drawText(doc, model.footer.contact, x, footerY,      { size: 9, bold: true, color: "#222222" });
        this.drawText(doc, model.footer.address, x, footerY + 12, { width: 400, size: 9, color: "#222222" });
        this.drawText(doc, model.footer.reference, x, footerY + 26, {
          width: contentWidth, size: 8, color: "#666666",
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Pairs the model's column captions with this renderer's point widths.
  static withWidths(headers, widths, aligns = {}) {
    return headers.map((label, i) => ({ label, width: widths[i], align: aligns[i] }));
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
