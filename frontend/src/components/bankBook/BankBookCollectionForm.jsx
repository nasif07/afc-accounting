import { AlertCircle, Plus } from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import Card from "../common/Card";
import DatePicker from "../common/DatePicker";
import Input from "../common/Input";
import Select from "../common/Select";
import { formatCurrency } from "../../utils/currency";
import {
  accountLabel,
  asOptions,
  paymentMethods,
  paymentPurposes,
} from "./bankBookHelpers";

export default function BankBookCollectionForm({
  formData,
  formError,
  saving,
  bankHeadOptions,
  incomeHeadOptions,
  selectedBankHead,
  selectedIncomeHead,
  amount,
  isPreviewBalanced,
  onChange,
  onDateChange,
  onSubmit,
  onReset,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Payment Information">
          <div className="space-y-4">
            <DatePicker
              label="Date"
              name="transactionDate"
              value={formData.transactionDate}
              onChange={(value) => onDateChange("transactionDate", value)}
              required
            />
            <Select
              label="Payment Purpose"
              name="paymentPurpose"
              value={formData.paymentPurpose}
              onChange={onChange}
              options={asOptions(paymentPurposes)}
              required
            />
            <Select
              label="Payment Method"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={onChange}
              options={asOptions(paymentMethods)}
              required
            />
            <Input
              label="Amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={onChange}
              required
            />
          </div>
        </Card>

        <Card title="Account Selection">
          <div className="space-y-4">
            <Select
              label="Bank Head"
              name="bankHeadId"
              value={formData.bankHeadId}
              onChange={onChange}
              options={bankHeadOptions}
              placeholder="Select bank, cheque, or POS head"
              required
            />
            <p className="text-xs leading-5 text-slate-500">
              This account will be debited. Choose the bank, cheque, or POS
              account that received the payment.
            </p>
            <Select
              label="Income Head"
              name="incomeHeadId"
              value={formData.incomeHeadId}
              onChange={onChange}
              options={incomeHeadOptions}
              placeholder="Select income head"
              required
            />
            <p className="text-xs leading-5 text-slate-500">
              This account will be credited, such as Admission Fee Income, Exam
              Fee Income, or Book Sales Income.
            </p>
          </div>
        </Card>

        <Card title="Extra Details">
          <div className="space-y-4">
            {formData.paymentMethod === "cheque" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Input
                  label="Cheque Number"
                  name="chequeNumber"
                  value={formData.chequeNumber}
                  onChange={onChange}
                  required
                />
                <DatePicker
                  label="Cheque Date"
                  name="chequeDate"
                  value={formData.chequeDate}
                  onChange={(value) => onDateChange("chequeDate", value)}
                  required
                />
              </div>
            )}
            <Input
              label="Reference No"
              name="referenceNo"
              value={formData.referenceNo}
              onChange={onChange}
              placeholder="Optional"
            />
            <Input
              label="Note"
              name="note"
              value={formData.note}
              onChange={onChange}
              placeholder="Optional"
            />
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Journal Preview
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
              <p>
                <span className="text-slate-500">Debit:</span>{" "}
                <span className="font-medium">
                  {accountLabel(selectedBankHead)}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Credit:</span>{" "}
                <span className="font-medium">
                  {accountLabel(selectedIncomeHead)}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Amount:</span>{" "}
                <span className="font-medium">{formatCurrency(amount)}</span>
              </p>
            </div>
          </div>
          <Badge variant={isPreviewBalanced ? "success" : "warning"}>
            {isPreviewBalanced ? "Balanced" : "Incomplete"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={saving}
          className="border-slate-300 text-slate-700 hover:bg-slate-50">
          Reset
        </Button>
        <Button type="submit" loading={saving} disabled={saving}>
          <Plus size={16} />
          Save Payment
        </Button>
      </div>
    </form>
  );
}
