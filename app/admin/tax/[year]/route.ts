import { getSession } from "@/lib/session";
import { taxYear, ymdOf } from "@/lib/admin/tax";
import { PAYMENT_LABELS, SERVICE_LABELS } from "@/lib/format";

/** Spreadsheet (CSV) of every charge on invoices paid in the year. One row per charge. */
export async function GET(_req: Request, { params }: { params: Promise<{ year: string }> }) {
  const session = await getSession();
  if (session?.user.role !== "admin") return new Response("Not allowed", { status: 403 });

  const year = Number((await params).year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return new Response("Bad year", { status: 400 });
  const t = await taxYear(year);

  const rows: (string | number)[][] = [
    ["Date paid", "Invoice", "Customer", "Paid by", "Service", "Description", "Amount", "Invoice total", "Stripe fee"],
  ];
  const dollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));
  for (const { invoice: inv, customerName, items } of t.rows) {
    items.forEach((it, i) => {
      rows.push([
        ymdOf(inv.paidAt!),
        inv.id.slice(0, 8),
        customerName,
        PAYMENT_LABELS[inv.paymentMethod ?? "other"],
        it.type ? SERVICE_LABELS[it.type] : "Extra charge",
        it.item.description,
        dollars(it.item.amountCents),
        i === 0 ? dollars(inv.totalCents) : "",
        i === 0 ? dollars(inv.feeCents) : "",
      ]);
    });
  }

  // Quote every cell, and stop spreadsheet apps from treating text as a formula.
  const cell = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="westward-tax-records-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
