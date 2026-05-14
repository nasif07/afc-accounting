import React, { useState, useRef } from 'react';
import { Download, Printer, DollarSign, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import SectionHeader from '../components/common/SectionHeader';
import PettyCashReport from '../components/reports/PettyCashReport';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

export default function PettyCashReportPage() {
  const printRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    accountingStatus: '',
  });

  const accountingStatusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'posted', label: 'Posted' },
    { value: 'pending', label: 'Pending' },
    { value: 'reversed', label: 'Reversed' },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const params = {};

      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.accountingStatus) params.accountingStatus = filters.accountingStatus;

      const response = await api.get('/petty-cash/report/detailed', { params });
      setReportData(response?.data?.data || null);
      toast.success('Petty cash report generated successfully');
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to generate petty cash report';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      accountingStatus: '',
    });
    setReportData(null);
    setError(null);
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '', 'height=700,width=1000');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Petty Cash Report</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
          <style>
            body {
              padding: 24px;
              font-family: Arial, sans-serif;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    let clone = null;

    try {
      const source = printRef.current;
      if (!source) {
        toast.error('No report content found to export');
        return;
      }

      toast.info('Preparing PDF...');

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      clone = source.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '794px';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '1';
      clone.style.backgroundColor = '#ffffff';
      clone.style.background = '#ffffff';
      clone.style.overflow = 'visible';

      clone.querySelectorAll('button, svg').forEach((el) => el.remove());

      const oklchRegex = /oklch\([^)]+\)/g;

      const replaceOklch = (cssText) => {
        return cssText.replace(oklchRegex, (match) => {
          try {
            const parts = match
              .replace('oklch(', '')
              .replace(')', '')
              .split(/[\s,\/]+/)
              .map((p) => p.trim())
              .filter(Boolean);

            const lightness = parseFloat(parts[0]);
            const l = lightness > 1 ? lightness / 100 : lightness;
            const gray = Math.round(l * 255);
            const hex = gray.toString(16).padStart(2, '0');
            return `#${hex}${hex}${hex}`;
          } catch {
            return '#888888';
          }
        });
      };

      let allCSS = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            allCSS += rule.cssText + '\n';
          }
        } catch {
          // cross-origin sheets — skip
        }
      }

      const safeCSSText = replaceOklch(allCSS);
      const styleTag = document.createElement('style');
      styleTag.textContent = safeCSSText;
      clone.prepend(styleTag);

      document.body.appendChild(clone);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 400));

      const originalNodes = Array.from(source.querySelectorAll('*'));
      const cloneNodes = Array.from(clone.querySelectorAll('*'));

      originalNodes.forEach((origEl, i) => {
        const cloneEl = cloneNodes[i];
        if (!(cloneEl instanceof HTMLElement)) return;

        const computed = window.getComputedStyle(origEl);
        const props = [
          ['color', '#111827'],
          ['backgroundColor', '#ffffff'],
          ['borderColor', '#e5e7eb'],
        ];

        props.forEach(([prop, fallback]) => {
          try {
            cloneEl.style[prop] = computed[prop] || fallback;
          } catch {
            cloneEl.style[prop] = fallback;
          }
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const allChildren = Array.from(clone.querySelectorAll('*'));
      let maxBottom = 0;
      allChildren.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > maxBottom) maxBottom = r.bottom;
      });

      const contentHeight = Math.min(clone.scrollHeight, maxBottom + 32);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: contentHeight,
        height: contentHeight,
        width: 794,
        x: 0,
        y: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        let yOffset = 0;
        let remainingHeight = imgHeight;

        while (remainingHeight > 0) {
          pdf.addImage(
            imgData,
            'JPEG',
            0,
            yOffset === 0 ? 0 : -yOffset,
            imgWidth,
            imgHeight,
          );
          remainingHeight -= pageHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            yOffset += pageHeight;
          }
        }
      }

      pdf.save(`petty-cash-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(err?.message || 'Failed to export PDF');
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }
  };

  const handleDownloadCSV = () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    try {
      const { reportData: data = [], summary = {}, dateRange = {} } = reportData;

      // Prepare CSV headers
      const headers = [
        'Date',
        'Expenditures',
        'Cash Received & Paid from',
        'Cash Received (BDT)',
        'Cash Payment (BDT)',
        'Balance (BDT)',
        'Remarks',
      ];

      // Prepare CSV rows
      const rows = [];

      // Add header
      rows.push('Alliance Française de Chittagong');
      rows.push('Petty Cash Account');
      rows.push(`For the Month of ${dateRange.monthYear || 'N/A'}`);
      rows.push(''); // Empty row
      rows.push(headers.join(','));

      // Add opening balance row
      rows.push(`DD/MM/YYYY,Cash in Hand,Accounts,-,-,Balance B/D,-`);

      // Add data rows
      data.forEach((row) => {
        const csvRow = [
          row.date,
          `"${row.expenditures}"`,
          row.cashReceivedPaidFrom,
          row.cashReceived > 0 ? row.cashReceived : '-',
          row.cashPayment > 0 ? row.cashPayment : '-',
          row.balance,
          row.remarks,
        ];
        rows.push(csvRow.join(','));
      });

      // Add totals row
      if (data.length > 0) {
        rows.push('');
        rows.push(
          `TOTAL,,,${summary.totalCashReceived || 0},${summary.totalCashPayment || 0},${summary.closingBalance || 0},-`
        );
      }

      // Add summary info
      rows.push('');
      rows.push('Summary Information');
      rows.push(`Opening Balance,${data.length > 0 ? data[0].balance : 0}`);
      rows.push(`Total Cash Received,${summary.totalCashReceived || 0}`);
      rows.push(`Total Cash Payment,${summary.totalCashPayment || 0}`);
      rows.push(`Closing Balance,${summary.closingBalance || 0}`);
      rows.push(`Generated on,${new Date().toLocaleString()}`);

      // Create CSV content
      const csvContent = rows.join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `petty-cash-report-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported as CSV successfully');
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={DollarSign}
        title="Petty Cash Report"
        description="Generate detailed petty cash expense report with summaries and analytics"
        buttonText="Generate Report"
        onButtonClick={fetchReport}
        buttonIcon={DollarSign}
      />

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              From Date
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              To Date
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <Select
              value={filters.accountingStatus}
              onChange={(e) => handleFilterChange('accountingStatus', e.target.value)}
              options={accountingStatusOptions}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            onClick={fetchReport}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {/* Report Actions */}
      {reportData && (
        <div className="flex gap-2 justify-end rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download size={16} />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
            <FileText size={16} />
            Download CSV
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error generating report</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Report Content */}
      {reportData && (
        <PettyCashReport ref={printRef} data={reportData} loading={loading} />
      )}

      {/* No Report Message */}
      {!reportData && !loading && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">
            Click "Generate Report" to create a petty cash report
          </p>
        </div>
      )}
    </div>
  );
}
