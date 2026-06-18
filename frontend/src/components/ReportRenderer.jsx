import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Card, CardContent, Button } from './common';
import { formatCurrency } from '../utils/currency';

const ReportRenderer = React.forwardRef(
  (
    {
      title = 'Financial Report',
      reportType = 'pl', // 'pl' or 'bs'
      data = {},
      period = '',
      loading = false,
      ...props
    },
    ref
  ) => {
    const printRef = useRef();

    const handlePrint = () => {
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write('<html><head><title>Print</title></head><body></body></html>');
      printWindow.document.close();
      printWindow.document.body.appendChild(printRef.current.cloneNode(true));
      printWindow.print();
    };

    const handleDownload = async () => {
      const source = printRef.current;
      if (!source) return;

      let clone = null;
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import('html2canvas'),
          import('jspdf'),
        ]);

        clone = source.cloneNode(true);
        Object.assign(clone.style, {
          position: 'fixed', top: '0', left: '0', width: '794px',
          zIndex: '-9999', pointerEvents: 'none', opacity: '1',
          backgroundColor: '#ffffff', background: '#ffffff', overflow: 'visible',
        });

        clone.querySelectorAll('button, svg').forEach((el) => el.remove());

        const oklchRegex = /oklch\([^)]+\)/g;
        const replaceOklch = (css) => css.replace(oklchRegex, (m) => {
          try {
            const l = parseFloat(m.replace('oklch(', '').split(/[\s,/]+/)[0]);
            const g = Math.round((l > 1 ? l / 100 : l) * 255).toString(16).padStart(2, '0');
            return `#${g}${g}${g}`;
          } catch { return '#888888'; }
        });

        let allCSS = '';
        for (const sheet of Array.from(document.styleSheets)) {
          try { for (const r of Array.from(sheet.cssRules || [])) allCSS += r.cssText + '\n'; }
          catch { /* cross-origin */ }
        }
        const style = document.createElement('style');
        style.textContent = replaceOklch(allCSS);
        clone.prepend(style);
        document.body.appendChild(clone);

        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 400));

        const origNodes = Array.from(source.querySelectorAll('*'));
        const cloneNodes = Array.from(clone.querySelectorAll('*'));
        const colorProps = ['color','backgroundColor','borderColor','borderTopColor',
          'borderBottomColor','borderLeftColor','borderRightColor','fill','stroke'];
        origNodes.forEach((orig, i) => {
          const el = cloneNodes[i];
          if (!(el instanceof HTMLElement)) return;
          const cs = window.getComputedStyle(orig);
          colorProps.forEach((p) => { if (cs[p]?.includes('oklch')) el.style[p] = p === 'backgroundColor' ? '#ffffff' : '#111827'; });
        });

        clone.querySelectorAll('tr').forEach((el) => { el.style.backgroundColor = '#ffffff'; });
        clone.querySelectorAll('thead tr, tfoot tr').forEach((el) => { el.style.backgroundColor = '#f9fafb'; });
        clone.querySelectorAll('td, th').forEach((el) => { el.style.backgroundColor = 'transparent'; });
        clone.querySelectorAll('*').forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          if (el.style.backgroundColor?.includes('oklch')) el.style.backgroundColor = '#ffffff';
          const cs = window.getComputedStyle(el);
          if (parseFloat(cs.minHeight) >= 100) {
            el.style.setProperty('min-height', '0', 'important');
            el.style.setProperty('height', 'auto', 'important');
          }
        });

        await new Promise((r) => setTimeout(r, 300));

        let maxBottom = 0;
        Array.from(clone.querySelectorAll('*')).forEach((el) => {
          if (el instanceof HTMLElement) maxBottom = Math.max(maxBottom, el.getBoundingClientRect().bottom);
        });
        const contentHeight = Math.min(clone.scrollHeight, maxBottom + 32);

        const canvas = await html2canvas(clone, {
          scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
          logging: false, scrollX: 0, scrollY: 0,
          windowWidth: 794, windowHeight: contentHeight, height: contentHeight, width: 794,
        });

        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pw) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (imgH <= ph) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pw, imgH);
        } else {
          let yOff = 0, rem = imgH;
          while (rem > 0) {
            pdf.addImage(imgData, 'JPEG', 0, yOff === 0 ? 0 : -yOff, pw, imgH);
            rem -= ph;
            if (rem > 0) { pdf.addPage(); yOff += ph; }
          }
        }

        pdf.save(`${title}-${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (err) {
        console.error('PDF export error:', err);
      } finally {
        if (clone && document.body.contains(clone)) document.body.removeChild(clone);
      }
    };

    if (loading) {
      return (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-neutral-600">Loading report...</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div ref={ref} className="space-y-4" {...props}>
        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={16} />
            Download PDF
          </Button>
        </div>

        {/* Report */}
        <Card>
          <CardContent className="pt-8" ref={printRef}>
            {/* Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-neutral-900">
              <h1 className="text-2xl font-bold text-neutral-900">Alliance Française</h1>
              <p className="text-neutral-600 mt-1">Financial Management System</p>
              <h2 className="text-xl font-semibold text-neutral-900 mt-4">{title}</h2>
              {period && <p className="text-sm text-neutral-600 mt-2">For the period: {period}</p>}
            </div>

            {/* P&L Statement */}
            {reportType === 'pl' && (
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                    Income
                  </h3>
                  <table className="w-full text-sm mb-4">
                    <tbody>
                      {data.revenue?.items?.map((item, idx) => (
                        <tr key={idx} className="border-b border-neutral-200">
                          <td className="py-2 text-neutral-700">{item.name}</td>
                          <td className="py-2 text-right font-medium text-neutral-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded">
                    <span className="font-semibold text-neutral-900">Total Income</span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(data.revenue?.total || 0)}
                    </span>
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                    Expenses
                  </h3>
                  <table className="w-full text-sm mb-4">
                    <tbody>
                      {data.expenses?.items?.map((item, idx) => (
                        <tr key={idx} className="border-b border-neutral-200">
                          <td className="py-2 text-neutral-700">{item.name}</td>
                          <td className="py-2 text-right font-medium text-neutral-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded">
                    <span className="font-semibold text-neutral-900">Total Expenses</span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(data.expenses?.total || 0)}
                    </span>
                  </div>
                </div>

                {/* Net Income */}
                <div className="flex justify-between py-3 px-4 bg-mahogany-50 rounded-lg border-2 border-mahogany-700">
                  <span className="font-bold text-neutral-900">Net Income</span>
                  <span className="font-bold text-mahogany-700 text-lg">
                    {formatCurrency((data.revenue?.total || 0) - (data.expenses?.total || 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Balance Sheet */}
            {reportType === 'bs' && (
              <div className="grid grid-cols-2 gap-8">
                {/* Assets */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                    Assets
                  </h3>

                  {/* Current Assets */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-neutral-700 mb-2">Current Assets</h4>
                    <table className="w-full text-sm mb-2">
                      <tbody>
                        {data.assets?.current?.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="py-2 text-neutral-700 pl-4">{item.name}</td>
                            <td className="py-2 text-right font-medium text-neutral-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded mb-4">
                      <span className="font-semibold text-neutral-700">Subtotal</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(data.assets?.current?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Fixed Assets */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-neutral-700 mb-2">Fixed Assets</h4>
                    <table className="w-full text-sm mb-2">
                      <tbody>
                        {data.assets?.fixed?.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="py-2 text-neutral-700 pl-4">{item.name}</td>
                            <td className="py-2 text-right font-medium text-neutral-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded">
                      <span className="font-semibold text-neutral-700">Subtotal</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(data.assets?.fixed?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Total Assets */}
                  <div className="flex justify-between py-3 px-4 bg-mahogany-50 rounded-lg border-2 border-mahogany-700">
                    <span className="font-bold text-neutral-900">Total Assets</span>
                    <span className="font-bold text-mahogany-700">
                      {formatCurrency(
                        (data.assets?.current?.total || 0) + (data.assets?.fixed?.total || 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b-2 border-neutral-300">
                    Liabilities & Equity
                  </h3>

                  {/* Current Liabilities */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-neutral-700 mb-2">Current Liabilities</h4>
                    <table className="w-full text-sm mb-2">
                      <tbody>
                        {data.liabilities?.current?.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="py-2 text-neutral-700 pl-4">{item.name}</td>
                            <td className="py-2 text-right font-medium text-neutral-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded mb-4">
                      <span className="font-semibold text-neutral-700">Subtotal</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(data.liabilities?.current?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-neutral-700 mb-2">Equity</h4>
                    <table className="w-full text-sm mb-2">
                      <tbody>
                        {data.equity?.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="py-2 text-neutral-700 pl-4">{item.name}</td>
                            <td className="py-2 text-right font-medium text-neutral-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between py-2 px-4 bg-neutral-100 rounded">
                      <span className="font-semibold text-neutral-700">Subtotal</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(data.equity?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex justify-between py-3 px-4 bg-mahogany-50 rounded-lg border-2 border-mahogany-700">
                    <span className="font-bold text-neutral-900">Total Liabilities & Equity</span>
                    <span className="font-bold text-mahogany-700">
                      {formatCurrency(
                        (data.liabilities?.current?.total || 0) + (data.equity?.total || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t-2 border-neutral-900 text-center text-xs text-neutral-600">
              <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              <p>This is a computer-generated report and does not require a signature.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

ReportRenderer.displayName = 'ReportRenderer';

export default ReportRenderer;
