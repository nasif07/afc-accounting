const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require("docx");
const { buildPayslipModel } = require("./payslipModel");

// Word export of the payslip. It renders the same payslipModel the PDF does,
// laid out with real Word tables and paragraphs (no images of text), so an
// accountant can open it and edit any figure before sending it out.

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

// ── Units ────────────────────────────────────────────────────────────────────
// Word measures in twips (1/20 pt). A4 with 0.75" side margins leaves a
// content width of 9750 twips, which is what every table below adds up to.
const CONTENT_WIDTH = 9750;
const RULE = { style: BorderStyle.SINGLE, size: 4, color: "333333" };
const NONE = { style: BorderStyle.NIL };

const pt = (points) => Math.round(points * 2); // half-points, for `size`

const scaleWidths = (weights) => {
  const total = weights.reduce((sum, n) => sum + n, 0);
  const widths = weights.map((n) => Math.round((n / total) * CONTENT_WIDTH));
  // Absorb the rounding drift into the last column so the table stays exactly
  // as wide as the text block.
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((sum, n) => sum + n, 0);
  return widths;
};

const runs = (text, opts = {}) =>
  String(text ?? "")
    .split("\n")
    .map((line, i) => new TextRun({ text: line, bold: opts.bold, italics: opts.italics, size: opts.size || pt(10), color: opts.color, break: i ? 1 : 0 }));

const para = (text, opts = {}) =>
  new Paragraph({
    children: runs(text, opts),
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 0, line: 240 },
    border: opts.border,
  });

// "Label: value" with only the label in bold — the payslip's particulars style.
const fieldPara = (label, value, valueBold) =>
  new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: pt(10) }),
      new TextRun({ text: String(value ?? ""), bold: valueBold, size: pt(10) }),
    ],
    spacing: { before: 0, after: 20, line: 240 },
  });

const cell = (children, opts = {}) =>
  new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: opts.borders,
    columnSpan: opts.columnSpan,
    verticalAlign: opts.verticalAlign || VerticalAlign.TOP,
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
  });

// Ruled tables label their first column and centre the rest, unless a column
// opts into another alignment (the fund table's amounts are right-aligned).
const alignFor = (index, aligns = {}) =>
  aligns[index] || (index === 0 ? AlignmentType.LEFT : AlignmentType.CENTER);

// ── Sections ─────────────────────────────────────────────────────────────────

function letterhead(model) {
  const widths = scaleWidths([12, 76, 12]);
  const logo =
    (model.org.logoImage || (model.org.logoPath && fs.existsSync(model.org.logoPath)))
      ? new Paragraph({
          children: [
            new ImageRun({
              type: model.org.logoImageType
                ? model.org.logoImageType
                : path.extname(model.org.logoPath).slice(1).toLowerCase() === "jpg"
                ? "jpg"
                : path.extname(model.org.logoPath).slice(1).toLowerCase(),
              data: model.org.logoImage || fs.readFileSync(model.org.logoPath),
              // ImageRun forces these exact dimensions — it does not preserve
              // aspect ratio — so they track the artwork. afc-full-logo.jpg is
              // 758x564 (1.344 landscape); the previous 58x64 portrait box was
              // sized for the old square-ish mark and would squash it.
              transformation: { width: 73, height: 54 },
            }),
          ],
        })
      : para("");

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({
        children: [
          cell(logo, { width: widths[0] }),
          cell(
            [
              para(model.org.orgName, { bold: true, size: pt(13.5), align: AlignmentType.CENTER }),
              para(model.title, { bold: true, size: pt(12), align: AlignmentType.CENTER, before: 40 }),
            ],
            { width: widths[1], verticalAlign: VerticalAlign.CENTER },
          ),
          cell(para(""), { width: widths[2] }),
        ],
      }),
    ],
  });
}

function particulars(model) {
  const widths = scaleWidths([52, 48]);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({
        children: [
          cell(model.particulars.left.map(([label, value]) => fieldPara(label, value)), { width: widths[0] }),
          cell(model.particulars.right.map(([label, value, bold]) => fieldPara(label, value, bold)), { width: widths[1] }),
        ],
      }),
    ],
  });
}

// The five-column grid: columns ruled top to bottom, item rows unseparated,
// a rule under the header and above every total row.
function salaryTable(model) {
  const widths = scaleWidths([190, 68, 74, 77, 78]);
  const blank = () => para("");

  const headerRow = new TableRow({
    tableHeader: true,
    children: model.salary.headers.map((header, i) =>
      cell(para(header, { bold: true, size: pt(9), align: AlignmentType.CENTER }), {
        width: widths[i],
        borders: { bottom: RULE },
        verticalAlign: VerticalAlign.CENTER,
      }),
    ),
  });

  const bodyRows = model.salary.rows.map((row) => {
    if (row.type === "section") {
      return new TableRow({
        children: [
          cell(para(row.label, { bold: true, size: pt(9.5) }), { width: widths[0] }),
          ...widths.slice(1).map((w) => cell(blank(), { width: w })),
        ],
      });
    }

    if (row.type === "total") {
      const topRule = { top: RULE };
      return new TableRow({
        children: [
          cell(para(row.label, { bold: true, size: pt(9.5), align: AlignmentType.RIGHT }), { width: widths[0], borders: topRule }),
          ...widths.slice(1, 4).map((w) => cell(blank(), { width: w, borders: topRule })),
          cell(para(row.amount, { bold: true, size: pt(9.5), align: AlignmentType.RIGHT }), { width: widths[4], borders: topRule }),
        ],
      });
    }

    return new TableRow({
      children: [
        cell(
          new Paragraph({
            children: runs(row.label, { size: pt(9.5) }),
            indent: { left: 220 },
            spacing: { line: 240 },
          }),
          { width: widths[0] },
        ),
        cell(para(row.hours, { size: pt(9.5), align: AlignmentType.CENTER }), { width: widths[1] }),
        cell(para(row.rate,  { size: pt(9.5), align: AlignmentType.CENTER }), { width: widths[2] }),
        cell(para(row.amount, { size: pt(9.5), align: AlignmentType.RIGHT }), { width: widths[3] }),
        cell(blank(), { width: widths[4] }),
      ],
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: RULE, bottom: RULE, left: RULE, right: RULE,
      insideHorizontal: NONE, insideVertical: RULE,
    },
    rows: [headerRow, ...bodyRows],
  });
}

// Rule-only table: a rule above and below the header row, one under the last
// row, no vertical grid — the styling used for the leave / fund blocks.
function ruledTable(headers, rows, weights, { totalRow, aligns, width = CONTENT_WIDTH } = {}) {
  const widths = scaleWidths(weights).map((w) => Math.round((w * width) / CONTENT_WIDTH));

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((header, i) =>
      cell(para(header, { bold: true, size: pt(9.5), align: alignFor(i, aligns) }), {
        width: widths[i],
        borders: { bottom: RULE },
      }),
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((value, i) =>
          cell(para(value, { size: pt(9.5), align: alignFor(i, aligns) }), { width: widths[i] }),
        ),
      }),
  );

  if (totalRow) {
    bodyRows.push(
      new TableRow({
        children: totalRow.map((value, i) =>
          cell(para(value, { bold: true, size: pt(9.5), align: alignFor(i, aligns) }), {
            width: widths[i],
            borders: { top: RULE },
          }),
        ),
      }),
    );
  }

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: RULE, bottom: RULE, left: NONE, right: NONE,
      insideHorizontal: NONE, insideVertical: NONE,
    },
    rows: [headerRow, ...bodyRows],
  });
}

// Life fund table and the signature block sit side by side, as on the slip.
function fundsAndSignature(model) {
  const widths = scaleWidths([58, 42]);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({
        children: [
          cell(
            [
              para(model.funds.heading, { bold: true, size: pt(9.5), after: 60 }),
              ruledTable(model.funds.headers, model.funds.rows, [58, 42], {
                totalRow: model.funds.total,
                aligns: { 1: AlignmentType.RIGHT },
                width: Math.round(widths[0] * 0.94),
              }),
            ],
            { width: widths[0] },
          ),
          cell(
            [
              para("Authorized Signature", { bold: true, align: AlignmentType.CENTER }),
              para(""), para(""), para(""),
              // An empty paragraph with a bottom border is the signature rule.
              new Paragraph({
                children: [new TextRun({ text: "", size: pt(10) })],
                border: { bottom: RULE },
                spacing: { after: 60 },
              }),
              para(model.org.directorName, { bold: true, size: pt(10.5), align: AlignmentType.CENTER }),
              para(model.org.directorTitle, { italics: true, size: pt(10), align: AlignmentType.CENTER }),
            ],
            { width: widths[1], verticalAlign: VerticalAlign.BOTTOM },
          ),
        ],
      }),
    ],
  });
}

class DocxGenerator {
  static async generatePayslip(payroll, employee, orgInfo = {}) {
    const model = buildPayslipModel(payroll, employee, orgInfo);

    const doc = new Document({
      creator: model.org.orgName,
      title: `${model.title} — ${model.particulars.left[0][1]}`,
      description: "Payslip",
      styles: {
        default: {
          document: { run: { font: "Times New Roman", size: pt(10) } },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4 in twips
              margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
            },
          },
          children: [
            letterhead(model),
            para("", { after: 120 }),
            particulars(model),
            para("", { after: 120 }),
            salaryTable(model),
            para("", { after: 120 }),

            new Paragraph({
              children: [
                new TextRun({ text: "In Words: ", bold: true, size: pt(10) }),
                new TextRun({ text: model.inWords, size: pt(10) }),
              ],
              spacing: { after: 40, line: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Mode of Payment: ", bold: true, size: pt(10) }),
                new TextRun({ text: model.paymentMode, size: pt(10) }),
              ],
              spacing: { after: 200, line: 240 },
            }),

            para(model.leave.heading, { bold: true, align: AlignmentType.CENTER, after: 60 }),
            ruledTable(model.leave.headers, model.leave.rows, [40, 20, 20, 20]),
            para("", { after: 160 }),

            para(model.health.heading, { bold: true, align: AlignmentType.CENTER, after: 60 }),
            ruledTable(model.health.headers, model.health.rows, [32, 16, 17, 19, 16]),
            para("", { after: 200 }),

            fundsAndSignature(model),
            para("", { after: 240 }),

            para(model.footer.contact, { bold: true, size: pt(9) }),
            para(model.footer.address, { size: pt(9) }),
            para(model.footer.reference, { size: pt(8), color: "666666", before: 80 }),
          ],
        },
      ],
    });

    const buffer   = await Packer.toBuffer(doc);
    const filename = `payslip-${payroll._id}.docx`;
    const filepath = path.join(ensureUploadDir(), filename);
    await fs.promises.writeFile(filepath, buffer);
    return filepath;
  }
}

module.exports = DocxGenerator;
