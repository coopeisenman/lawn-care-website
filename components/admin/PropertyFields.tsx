type P = { address: string; city: string; state: string; zip: string | null; notes: string | null };

export default function PropertyFields({ p }: { p?: P }) {
  return (
    <>
      <div className="full">
        <label htmlFor="address">Street address</label>
        <input id="address" name="address" required defaultValue={p?.address} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="city">City</label>
        <input id="city" name="city" required defaultValue={p?.city} list="cities" />
        <datalist id="cities">
          <option value="Omaha" /><option value="Millard" /><option value="Papillion" />
          <option value="Bellevue" /><option value="Plattsmouth" />
        </datalist>
      </div>
      <div className="two">
        <div>
          <label htmlFor="state">State</label>
          <input id="state" name="state" maxLength={2} defaultValue={p?.state ?? "NE"} />
        </div>
        <div>
          <label htmlFor="zip">ZIP</label>
          <input id="zip" name="zip" inputMode="numeric" defaultValue={p?.zip ?? ""} />
        </div>
      </div>
      <div className="full">
        <label htmlFor="notes">Notes (gate code, dog in yard, etc.)</label>
        <textarea id="notes" name="notes" defaultValue={p?.notes ?? ""} />
      </div>
    </>
  );
}
