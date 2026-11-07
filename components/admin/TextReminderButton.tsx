"use client";

import { useState } from "react";
import { logReminder } from "@/lib/admin/actions";

/** Saves the reminder to the invoice history, then opens the texting app with the message filled in. */
export default function TextReminderButton({
  invoiceId,
  phone,
  message,
}: {
  invoiceId: string;
  phone: string;
  message: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-primary btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await logReminder(invoiceId, "text");
        window.location.href = `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`;
        setBusy(false);
      }}
    >
      {busy ? "Opening…" : "Text reminder"}
    </button>
  );
}
