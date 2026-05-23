import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../components/common/Button";
import DatePicker from "../components/common/DatePicker";
import SectionHeader from "../components/common/SectionHeader";
import {
  EmptyState,
  ErrorState,
  SectionSkeleton,
} from "../components/common/Loaders";
import PettyCashReport from "../components/reports/PettyCashReport";
import { pettyCashAPI } from "../services/apiMethods";
import { formatDisplayDate, toISODate, todayISO } from "../utils/date";

const firstDayOfCurrentMonth = () => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};

const formatAmount = (amount) => Number(amount || 0);

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnName = (index) => {
  let name = "";
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (bytes, value) => {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
};

const writeUint32 = (bytes, value) => {
  bytes.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
};

const createZip = (files) => {
  const encoder = new TextEncoder();
  const output = [];
  const centralDirectory = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, crc);
    writeUint32(output, dataBytes.length);
    writeUint32(output, dataBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...dataBytes);

    const centralOffset = offset;
    offset = output.length;

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, crc);
    writeUint32(centralDirectory, dataBytes.length);
    writeUint32(centralDirectory, dataBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, centralOffset);
    centralDirectory.push(...nameBytes);
  });

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);

  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const makeCell = (rowIndex, colIndex, value, style = 0) => {
  const ref = `${columnName(colIndex)}${rowIndex}`;
  const styleAttr = style ? ` s="${style}"` : "";

  if (typeof value === "number") {
    return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(
    value,
  )}</t></is></c>`;
};

const makeRow = (rowIndex, cells, height = null) => {
  const heightAttr = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${rowIndex}"${heightAttr}>${cells
    .map((cell, index) => makeCell(rowIndex, index + 1, cell.value, cell.style))
    .join("")}</row>`;
};

const buildPettyCashWorkbook = (report) => {
  const rows = [];
  const merges = ["A1:G1", "A2:G2"];
  const dateRange = report.dateRange || {};
  const period =
    dateRange.from && dateRange.to
      ? `${formatDisplayDate(dateRange.from)} to ${formatDisplayDate(dateRange.to)}`
      : "All approved transactions";

  rows.push(
    makeRow(1, [{ value: "Alliance Francaise de Chittagong", style: 1 }], 24),
  );
  rows.push(
    makeRow(2, [
      {
        value: `Petty Cash Account / ${period} / ${
          report.account?.accountCode || "1001"
        } - ${
          report.account?.accountName || "Petty Cash"
        }`,
        style: 2,
      },
    ], 22),
  );
  rows.push(
    makeRow(
      3,
      [
        "Date",
        "Expenditures",
        "Cash Received & Paid From",
        "Cash Received (BDT)",
        "Cash Payment (BDT)",
        "Balance (BDT)",
        "Remarks",
      ].map((value) => ({ value, style: 4 })),
      24,
    ),
  );
  rows.push(
    makeRow(4, [
      { value: dateRange.from ? formatDisplayDate(dateRange.from) : "-", style: 6 },
      { value: "Cash in Hand", style: 7 },
      { value: "Accounts", style: 6 },
      { value: "-", style: 8 },
      { value: "-", style: 8 },
      { value: formatAmount(report.openingBalance), style: 5 },
      { value: "Balance B/D", style: 7 },
    ]),
  );

  (report.transactions || []).forEach((row, index) => {
    rows.push(
      makeRow(index + 5, [
        { value: formatDisplayDate(row.date), style: 6 },
        { value: row.credit > 0 ? row.accountHead || row.counterparty || "" : "", style: 6 },
        {
          value:
            row.debit > 0
              ? row.accountHead || row.counterparty || ""
              : row.description || "",
          style: 6,
        },
        { value: row.debit > 0 ? formatAmount(row.debit) : "", style: 8 },
        { value: row.credit > 0 ? formatAmount(row.credit) : "", style: 8 },
        { value: formatAmount(row.runningBalance), style: 8 },
        { value: row.referenceNumber || row.voucherNumber || "-", style: 6 },
      ]),
    );
  });

  const totalRowIndex = rows.length + 1;
  rows.push(
    makeRow(totalRowIndex, [
      { value: "Total", style: 9 },
      { value: "", style: 9 },
      { value: "", style: 9 },
      { value: formatAmount(report.summary?.totalCashReceived), style: 10 },
      { value: formatAmount(report.summary?.totalCashPayment), style: 10 },
      { value: formatAmount(report.summary?.closingBalance), style: 10 },
      { value: "Closing Balance", style: 9 },
    ]),
  );
  merges.push(`A${totalRowIndex}:C${totalRowIndex}`);

  const summaryStart = totalRowIndex + 2;
  rows.push(makeRow(totalRowIndex + 1, []));
  rows.push(
    makeRow(summaryStart, [
      { value: "Total Cash Received", style: 11 },
      { value: formatAmount(report.summary?.totalCashReceived), style: 12 },
      { value: "Total Cash Payment", style: 11 },
      { value: formatAmount(report.summary?.totalCashPayment), style: 12 },
      { value: "Closing Balance", style: 11 },
      { value: formatAmount(report.summary?.closingBalance), style: 12 },
      { value: "", style: 0 },
    ]),
  );

  const signatureLine = summaryStart + 5;
  rows.push(makeRow(summaryStart + 1, []));
  rows.push(makeRow(summaryStart + 2, []));
  rows.push(makeRow(summaryStart + 3, []));
  rows.push(makeRow(summaryStart + 4, []));
  rows.push(
    makeRow(signatureLine, [
      { value: "Prepared By", style: 13 },
      { value: "", style: 0 },
      { value: "Checked By", style: 13 },
      { value: "", style: 0 },
      { value: "Signature Director", style: 13 },
      { value: "", style: 0 },
      { value: "", style: 0 },
    ]),
  );

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="16" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="3" width="34" customWidth="1"/>
    <col min="4" max="6" width="17" customWidth="1"/>
    <col min="7" max="7" width="22" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="${merges.length}">${merges
    .map((ref) => `<mergeCell ref="${ref}"/>`)
    .join("")}</mergeCells>
  <pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FF000000"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><color rgb="FF000000"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF08A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF111827"/></left><right style="thin"><color rgb="FF111827"/></right><top style="thin"><color rgb="FF111827"/></top><bottom style="thin"><color rgb="FF111827"/></bottom><diagonal/></border>
    <border><left/><right/><top style="thin"><color rgb="FF111827"/></top><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="4" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="4" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0"/>
    <xf numFmtId="4" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Petty Cash Report" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
    { name: "xl/styles.xml", content: styles },
  ]);
};

export default function PettyCashReportPage() {
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonth());
  const [toDate, setToDate] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    if (!fromDate || !toDate) {
      setError("From Date and To Date are required.");
      return;
    }

    if (fromDate > toDate) {
      setError("From Date cannot be after To Date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await pettyCashAPI.getReport({
        startDate: fromDate,
        endDate: toDate,
      });

      setReport(response?.data?.data || null);
    } catch (err) {
      setReport(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load petty cash report.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printWindow = window.open("", "", "height=720,width=1080");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Petty Cash Report</title>
          <style>
            body { padding: 24px; font-family: Arial, sans-serif; color: #020617; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #020617; text-align: left; }
            table thead tr,
            table thead th {
              background: #e2f0d9 !important;
              background-color: #e2f0d9 !important;
              color: #000000 !important;
              font-weight: 700;
            }
            .bg-yellow-200 { background: #fef08a !important; }
            .bg-slate-100 { background: #f1f5f9 !important; }
            .bg-slate-50 { background: #f8fafc !important; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .uppercase { text-transform: uppercase; }
            @media print { body { margin: 0; padding: 12mm; } }
          </style>
        </head>
        <body>${reportRef.current.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    if (!report) {
      toast.error("No report content found to export");
      return;
    }

    try {
      toast.loading("Preparing PDF...", { id: "petty-cash-report-pdf" });

      const jsPDFModule = await import("jspdf");
      const { jsPDF } = jsPDFModule;

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "landscape",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const bottomMargin = 14;
      const availableWidth = pageWidth - margin * 2;
      const tableColumns = [
        { label: "Date", width: 24, align: "left" },
        { label: "Expenditures", width: 50, align: "left" },
        { label: "Cash Received & Paid From", width: 62, align: "left" },
        { label: "Cash Received (BDT)", width: 31, align: "right" },
        { label: "Cash Payment (BDT)", width: 31, align: "right" },
        { label: "Balance (BDT)", width: 31, align: "right" },
        { label: "Remarks", width: 48, align: "left" },
      ];
      const period =
        report.dateRange?.from && report.dateRange?.to
          ? `${formatDisplayDate(report.dateRange.from)} to ${formatDisplayDate(
              report.dateRange.to,
            )}`
          : "All approved transactions";

      let cursorY = margin;
      let hasDrawnTableHeader = false;

      const money = (amount) =>
        Number(amount || 0).toLocaleString("en-BD", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const pageLimit = () => pageHeight - bottomMargin;

      const drawPageHeader = (continued = false) => {
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("Alliance Francaise de Chittagong", pageWidth / 2, cursorY, {
          align: "center",
        });
        cursorY += 7;
        pdf.setFontSize(12);
        pdf.text(
          continued ? "Petty Cash Account (continued)" : "Petty Cash Account",
          pageWidth / 2,
          cursorY,
          { align: "center" },
        );
        cursorY += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(period, pageWidth / 2, cursorY, { align: "center" });
        cursorY += 5;
        pdf.text(
          `Account: ${report.account?.accountCode || "1001"} - ${
            report.account?.accountName || "Petty Cash"
          }`,
          pageWidth / 2,
          cursorY,
          { align: "center" },
        );
        cursorY += continued ? 7 : 9;
      };

      const addPage = () => {
        pdf.addPage();
        cursorY = margin;
        hasDrawnTableHeader = false;
        drawPageHeader(true);
        drawTableHeader();
      };

      const ensureSpace = (height) => {
        if (cursorY + height > pageLimit()) {
          addPage();
        }
      };

      const drawCellText = (text, x, y, width, height, align = "left") => {
        const value = String(text ?? "");
        const lines = pdf.splitTextToSize(value, width - 3);
        const textX =
          align === "right" ? x + width - 2 : align === "center" ? x + width / 2 : x + 2;

        pdf.text(lines, textX, y + 4.5, {
          align,
          baseline: "top",
          maxWidth: width - 3,
        });
      };

      const drawTableHeader = () => {
        if (hasDrawnTableHeader) return;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(226, 240, 217);
        pdf.setDrawColor(17, 24, 39);
        pdf.setLineWidth(0.15);

        let x = margin;
        tableColumns.forEach((column) => {
          pdf.setFillColor(226, 240, 217);
          pdf.setTextColor(0, 0, 0);
          pdf.rect(x, cursorY, column.width, 8, "FD");
          pdf.setTextColor(0, 0, 0);
          drawCellText(column.label, x, cursorY, column.width, 8, column.align);
          x += column.width;
        });

        cursorY += 8;
        hasDrawnTableHeader = true;
      };

      const getRowHeight = (cells) => {
        pdf.setFontSize(7.5);
        const lineCounts = cells.map((cell, index) => {
          const text = String(cell.value ?? "");
          return pdf.splitTextToSize(text, tableColumns[index].width - 3).length;
        });

        return Math.max(8, Math.max(...lineCounts) * 4 + 4);
      };

      const drawRow = (cells, options = {}) => {
        const height = getRowHeight(cells);
        ensureSpace(height);

        pdf.setFont("helvetica", options.bold ? "bold" : "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(17, 24, 39);
        pdf.setLineWidth(0.15);

        let x = margin;
        cells.forEach((cell, index) => {
          const fill = cell.fill || options.fill;
          if (fill) {
            pdf.setFillColor(...fill);
            pdf.rect(x, cursorY, tableColumns[index].width, height, "FD");
          } else {
            pdf.rect(x, cursorY, tableColumns[index].width, height);
          }

          drawCellText(
            cell.value,
            x,
            cursorY,
            tableColumns[index].width,
            height,
            cell.align || tableColumns[index].align,
          );
          x += tableColumns[index].width;
        });

        cursorY += height;
      };

      drawPageHeader(false);
      drawTableHeader();

      drawRow(
        [
          { value: report.dateRange?.from ? formatDisplayDate(report.dateRange.from) : "-" },
          { value: "Cash in Hand" },
          { value: "Accounts" },
          { value: "-", align: "right" },
          { value: "-", align: "right" },
          { value: money(report.openingBalance), fill: [254, 240, 138], align: "right" },
          { value: "Balance B/D" },
        ],
        { bold: true },
      );

      (report.transactions || []).forEach((row) => {
        drawRow([
          { value: formatDisplayDate(row.date) },
          { value: row.credit > 0 ? row.accountHead || row.counterparty || "" : "" },
          {
            value:
              row.debit > 0
                ? row.accountHead || row.counterparty || ""
                : row.description || "",
          },
          { value: row.debit > 0 ? money(row.debit) : "-", align: "right" },
          { value: row.credit > 0 ? money(row.credit) : "-", align: "right" },
          { value: money(row.runningBalance), align: "right" },
          { value: row.referenceNumber || row.voucherNumber || "-" },
        ]);
      });

      drawRow(
        [
          { value: "Total" },
          { value: "" },
          { value: "" },
          { value: money(report.summary?.totalCashReceived), align: "right" },
          { value: money(report.summary?.totalCashPayment), align: "right" },
          { value: money(report.summary?.closingBalance), align: "right" },
          { value: "Closing Balance" },
        ],
        { bold: true, fill: [241, 245, 249] },
      );

      ensureSpace(44);
      cursorY += 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      const summaryWidth = availableWidth / 3;
      [
        ["Total Cash Received", money(report.summary?.totalCashReceived)],
        ["Total Cash Payment", money(report.summary?.totalCashPayment)],
        ["Closing Balance", money(report.summary?.closingBalance)],
      ].forEach(([label, value], index) => {
        const x = margin + index * summaryWidth;
        pdf.rect(x, cursorY, summaryWidth, 13);
        pdf.text(label, x + 2, cursorY + 4.5);
        pdf.text(`BDT ${value}`, x + 2, cursorY + 9.5);
      });
      cursorY += 34;

      ensureSpace(20);
      const signatureWidth = availableWidth / 3;
      ["Prepared By", "Checked By", "Signature Director"].forEach(
        (label, index) => {
          const x = margin + index * signatureWidth + 10;
          pdf.line(x, cursorY, x + signatureWidth - 20, cursorY);
          pdf.text(label, x + (signatureWidth - 20) / 2, cursorY + 5, {
            align: "center",
          });
        },
      );

      pdf.save(`petty-cash-report-${fromDate}-to-${toDate}.pdf`);
      toast.success("Petty cash report downloaded", {
        id: "petty-cash-report-pdf",
      });
    } catch (err) {
      console.error("Petty cash PDF export error:", err);
      toast.error(err?.message || "Failed to download PDF", {
        id: "petty-cash-report-pdf",
      });
    }
  };

  const handleDownloadExcel = () => {
    if (!report) {
      toast.error("No report content found to export");
      return;
    }

    try {
      const blob = buildPettyCashWorkbook(report);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `petty-cash-report-${fromDate}-to-${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Petty cash Excel exported");
    } catch (err) {
      console.error("Petty cash Excel export error:", err);
      toast.error(err?.message || "Failed to export Excel");
    }
  };

  const hasReport = Boolean(report);
  const hasTransactions = Boolean(report?.transactions?.length);

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={FileText}
        title="Petty Cash Report"
        description="Approved journal-backed petty cash report for account code 1001."
        buttonText="Back to Petty Cash"
        onButtonClick={() => navigate("/dashboard/petty-cash")}
        buttonIcon={Wallet}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_auto_auto_auto_auto] xl:items-center">
          <DatePicker
            label="From Date"
            name="fromDate"
            value={fromDate}
            onChange={setFromDate}
            required
            disabled={loading}
          />
          <DatePicker
            label="To Date"
            name="toDate"
            value={toDate}
            onChange={setToDate}
            required
            disabled={loading}
          />
          <Button
            type="button"
            onClick={loadReport}
            loading={loading}
            disabled={!fromDate || !toDate || loading}>
            <RefreshCcw size={16} />
            Generate
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!hasReport || loading}>
            <Printer size={16} />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!hasReport || loading}>
            <Download size={16} />
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={!hasReport || loading}>
            <FileSpreadsheet size={16} />
            Excel
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadReport} />}

      {loading ? (
        <SectionSkeleton rows={8} />
      ) : hasReport ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!hasTransactions && (
            <div className="border-b border-slate-200 p-4">
              <EmptyState
                title="No period transactions"
                description="The report still shows the opening Cash in Hand balance for the selected dates."
              />
            </div>
          )}
          <PettyCashReport ref={reportRef} data={report} />
        </div>
      ) : !error ? (
        <EmptyState
          title="No report generated"
          description="Select a date range and generate the petty cash report."
          action={
            <Link
              to="/dashboard/petty-cash"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to Petty Cash
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
