"use client";

import { useState } from "react";
import { SERVICE_TYPES, RECURRENCES } from "@/lib/constants";
import { SERVICE_LABELS, RECURRENCE_LABELS, centsToInput } from "@/lib/format";

/** Fields for scheduling or editing a visit. Fills in the last price used at this yard. */
export default function VisitFields({
  lastPrices = {},
  initial,
  defaultDate,
}: {
  lastPrices?: Record<string, number>;
  initial?: { type: string; scheduledDate: string; priceCents: number; recurrence: string; description: string | null; notes: string | null };
  defaultDate?: string;
}) {
  const [type, setType] = useState(initial?.type ?? "lawn");
  const [price, setPrice] = useState(centsToInput(initial?.priceCents ?? lastPrices[initial?.type ?? "lawn"]));

  return (
    <>
      <div>
        <label htmlFor="type">Service</label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            if (!initial) setPrice(centsToInput(lastPrices[e.target.value]));
          }}
        >
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>{SERVICE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="price">Price for this yard ($)</label>
        <input
          id="price"
          name="price"
          inputMode="decimal"
          required
          placeholder="45.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="scheduledDate">{initial ? "Date" : "First visit"}</label>
        <input id="scheduledDate" name="scheduledDate" type="date" required defaultValue={initial?.scheduledDate ?? defaultDate} />
      </div>
      <div>
        <label htmlFor="recurrence">How often</label>
        <select id="recurrence" name="recurrence" defaultValue={initial?.recurrence ?? "none"}>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      <div className="full">
        <label htmlFor="description">Description on invoice (optional)</label>
        <input id="description" name="description" placeholder="e.g. Mow, trim & blow" defaultValue={initial?.description ?? ""} />
      </div>
      <div className="full">
        <label htmlFor="notes">Notes for you (optional)</label>
        <input id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
    </>
  );
}
