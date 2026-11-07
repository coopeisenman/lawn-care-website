type C = { name: string; email: string | null; phone: string | null; notes: string | null };

export default function CustomerFields({ c }: { c?: C }) {
  return (
    <>
      <div className="full">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={c?.name} />
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" defaultValue={c?.phone ?? ""} />
      </div>
      <div>
        <label htmlFor="email">Email (needed for portal &amp; invoices)</label>
        <input id="email" name="email" type="email" defaultValue={c?.email ?? ""} />
      </div>
      <div className="full">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={c?.notes ?? ""} />
      </div>
    </>
  );
}
