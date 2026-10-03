import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Modal, Button } from "../common";
import DirectorNotifyPicker from "./DirectorNotifyPicker";
import { useNotifyDirectors } from "../../hooks/useApprovals";
import { formatDisplayDate } from "../../utils/date";

/**
 * The standalone "chase a director" action for a request that already exists.
 *
 * Separate from the create form because the two answer different questions:
 * the form asks "who should hear about this?", this asks "who has still not
 * looked at it?". Directors already emailed are shown with the date of the
 * last send so a reminder is a deliberate act rather than an accidental
 * duplicate — they stay selectable, because chasing someone twice is exactly
 * what this is for.
 */
export default function NotifyDirectorsModal({ approval, onClose }) {
  const [selected, setSelected] = useState([]);
  const notify = useNotifyDirectors();

  // Reset whenever the modal is pointed at a different request, so a selection
  // made for one request never carries over to the next.
  useEffect(() => {
    setSelected([]);
  }, [approval?._id]);

  // Last send per director. Reduced rather than mapped: the log appends one
  // entry per send, so a director chased twice appears twice.
  const notifiedAtByDirector = useMemo(() => {
    const map = {};
    (approval?.notifications ?? []).forEach((entry) => {
      if (!entry.delivered) return;
      const id = String(entry.recipient?._id ?? entry.recipient);
      const at = new Date(entry.sentAt);
      if (!map[id] || at > map[id].at) map[id] = { at, label: formatDisplayDate(at) };
    });
    return Object.fromEntries(
      Object.entries(map).map(([id, value]) => [id, value.label]),
    );
  }, [approval?.notifications]);

  const send = async () => {
    if (selected.length === 0) return;
    try {
      await notify.mutateAsync({ id: approval._id, directorIds: selected });
      onClose();
    } catch {
      // The hook already toasted the reason; keep the modal open so the
      // selection is not lost and the user can retry.
    }
  };

  return (
    <Modal
      isOpen={!!approval}
      onClose={notify.isPending ? () => {} : onClose}
      title="Email this request"
      description={
        approval
          ? `"${approval.title}" will be sent with a link straight to it.`
          : ""
      }
      size="md">
      <div className="space-y-4">
        <DirectorNotifyPicker
          alwaysOn
          selected={selected}
          onSelectedChange={setSelected}
          disabled={notify.isPending}
          notifiedAtByDirector={notifiedAtByDirector}
        />

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button
            variant="secondary"
            fullWidth
            disabled={notify.isPending}
            onClick={onClose}>
            Cancel
          </Button>
          <Button
            fullWidth
            icon={Send}
            loading={notify.isPending}
            disabled={selected.length === 0}
            onClick={send}>
            Send
            {selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
