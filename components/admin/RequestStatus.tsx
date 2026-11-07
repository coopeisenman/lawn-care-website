import { REQUEST_STATUS_LABELS } from "@/lib/format";

const CLS: Record<string, string> = {
  new: "badge badge-amber",
  contacted: "badge badge-gray",
  quoted: "badge badge-gray",
  won: "badge",
  lost: "badge badge-gray",
};

export default function RequestStatus({ status }: { status: string }) {
  return <span className={CLS[status] ?? "badge"}>{REQUEST_STATUS_LABELS[status] ?? status}</span>;
}
