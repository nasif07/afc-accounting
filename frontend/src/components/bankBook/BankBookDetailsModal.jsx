import Modal from "../common/Modal";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate } from "../../utils/date";
import { accountLabel, normalizeMethod } from "./bankBookHelpers";

export default function BankBookDetailsModal({ detail, onClose }) {
  if (!detail) return null;

  const fields = [
    ["Voucher No", detail.voucherNo],
    ["Date", formatDisplayDate(detail.transactionDate)],
    ["Purpose", detail.paymentPurpose],
    ["Payment Method", normalizeMethod(detail.paymentMethod)],
    ["Bank Head", accountLabel(detail.bankHead)],
    ["Income Head", accountLabel(detail.incomeHead)],
    ["Amount", formatCurrency(detail.amount)],
    ["Reference No", detail.referenceNo || "---"],
    ["Cheque Number", detail.chequeNumber || "---"],
    ["Cheque Date", detail.chequeDate ? formatDisplayDate(detail.chequeDate) : "---"],
    ["Created By", detail.createdBy?.name || "---"],
    ["Status", detail.status || detail.journalStatus],
    ["Note", detail.note || "---"],
  ];

  return (
    <Modal isOpen={!!detail} onClose={onClose} title="Student Collection Details" size="lg">
      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
            <p className="mt-1 break-words text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
