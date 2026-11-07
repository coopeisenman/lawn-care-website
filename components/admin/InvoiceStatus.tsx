const LABELS: Record<string, [string, string]> = {
  draft: ["Draft", "badge badge-gray"],
  open: ["Sent · unpaid", "badge badge-amber"],
  paid: ["Paid", "badge"],
  void: ["Void", "badge badge-gray"],
  uncollectible: ["Uncollectible", "badge badge-gray"],
};

export default function InvoiceStatus({ status }: { status: string }) {
  const [label, cls] = LABELS[status] ?? [status, "badge"];
  return <span className={cls}>{label}</span>;
}
