import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";

export default function BankBookCancelModal({
  cancelTarget,
  cancelReason,
  saving,
  onReasonChange,
  onConfirm,
  onClose,
}) {
  return (
    <Modal isOpen={!!cancelTarget} onClose={onClose} title="Cancel Collection">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Posted collections are reversed with a journal entry so accounting reports stay
          balanced.
        </p>
        <Input
          label="Reason"
          value={cancelReason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="danger" loading={saving} onClick={onConfirm}>
            Cancel Collection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
