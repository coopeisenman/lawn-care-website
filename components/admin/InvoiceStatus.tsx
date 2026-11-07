const LABELS: Record<string, [string, string]> = {
  draft: ["Draft", "badge badge-gray"],
  open: ["Sent · unpaid", "badge badge-amber"],
  paid: ["Paid", "badge"],
  void: ["Void", "badge badge-gray"],
  uncollectible: ["Uncollectible", "badge badge-gray"],
};

export default function InvoiceStatus({ status, overdue = 0 }: { status: string; overdue?: number }) {
  if (status === "open" && overdue > 0) {
    return <span className="badge badge-red">Overdue · {overdue} day{overdue === 1 ? "" : "s"}</span>;
  }
  const [label, cls] = LABELS[status] ?? [status, "badge"];
  return <span className={cls}>{label}</span>;
}
