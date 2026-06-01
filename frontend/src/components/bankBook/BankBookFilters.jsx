import { Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import DatePicker from "../common/DatePicker";
import Input from "../common/Input";
import Select from "../common/Select";
import { asOptions, paymentMethods, paymentPurposes } from "./bankBookHelpers";

export default function BankBookFilters({
  filters,
  bankHeadOptions,
  loading,
  onFilterChange,
  onApply,
  onReset,
  onExport,
  onPrint,
}) {
  return (
    <Card
      title="Filters"
      subtitle="Select a Bank Head to generate the bank statement from journal lines">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <DatePicker
          value={filters.dateFrom}
          onChange={(value) => onFilterChange("dateFrom", value)}
        />
        <DatePicker
          value={filters.dateTo}
          onChange={(value) => onFilterChange("dateTo", value)}
        />
        <Select
          value={filters.paymentPurpose}
          onChange={(e) => onFilterChange("paymentPurpose", e.target.value)}
          options={asOptions(paymentPurposes)}
          placeholder="All purposes"
        />
        <Select
          value={filters.paymentMethod}
          onChange={(e) => onFilterChange("paymentMethod", e.target.value)}
          options={asOptions(paymentMethods)}
          placeholder="All methods"
        />
        <Select
          value={filters.bankHeadId}
          onChange={(e) => onFilterChange("bankHeadId", e.target.value)}
          options={bankHeadOptions}
          placeholder="Bank head"
        />
        <Input
          value={filters.voucherNo}
          onChange={(e) => onFilterChange("voucherNo", e.target.value)}
          placeholder="Voucher no"
        />
        <Input
          value={filters.referenceNo}
          onChange={(e) => onFilterChange("referenceNo", e.target.value)}
          placeholder="Reference no"
        />
        <div className="flex flex-wrap gap-2 lg:col-span-4 xl:col-span-6">
          <Button type="button" onClick={onApply} loading={loading}>
            <RefreshCw size={16} />
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => onExport("pdf")}>
            <Download size={16} />
            Download PDF
          </Button>
          <Button type="button" variant="outline" onClick={() => onExport("excel")}>
            <FileSpreadsheet size={16} />
            Download Excel
          </Button>
          <Button type="button" variant="outline" onClick={onPrint}>
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
}
