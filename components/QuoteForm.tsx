"use client";

import { useActionState, useEffect, useState } from "react";
import { submitEstimateRequest } from "@/lib/estimates/submit";
import type { ActionState } from "@/lib/forms";
import { BUSINESS } from "@/lib/business";

/** The homepage "Free estimate" form. Sends the request straight to the admin Requests tab. */
export default function QuoteForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitEstimateRequest, {});
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => setStartedAt(String(Date.now())), []);

  if (state.ok) {
    return (
      <div id="quote-form" className="quote-done" role="status">
        <h3>Request sent!</h3>
        <p>{state.ok}</p>
        <p className="form-note">
          Need us sooner? Call or text <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>.
        </p>
      </div>
    );
  }

  return (
    <form id="quote-form" action={action}>
      {state.error && (
        <div className="notice notice-error full" role="alert">
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required autoComplete="name" maxLength={120} />
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" maxLength={40} />
      </div>
      <div className="full">
        <label htmlFor="address">Property address</label>
        <input id="address" name="address" autoComplete="street-address" maxLength={200} />
      </div>
      <div>
        <label htmlFor="city">City</label>
        <select id="city" name="city" defaultValue="Papillion">
          <option>Millard</option>
          <option>Papillion</option>
          <option>Bellevue</option>
          <option>Plattsmouth</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="service">Service needed</label>
        <select id="service" name="service" defaultValue="lawn">
          <option value="lawn">Lawn Service (mowing &amp; trimming)</option>
          <option value="leaf">Leaf Cleanup</option>
          <option value="snow">Snow Removal</option>
          <option value="multiple">Multiple services</option>
        </select>
      </div>
      <div className="full">
        <label htmlFor="email">Email (optional)</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} />
      </div>
      <div className="full">
        <label htmlFor="message">Anything else we should know?</label>
        <textarea
          id="message"
          name="message"
          maxLength={1000}
          placeholder="Lot size, how often you'd like service, gate codes, etc."
        />
      </div>
      {/* Spam trap: hidden from people, bots fill it in. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className="full">
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={pending}>
          {pending ? "Sending…" : "Request My Free Estimate"}
        </button>
      </div>
      <p className="form-note full">
        We&apos;ll get back to you quickly. Prefer to talk? Call or text{" "}
        <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>.
      </p>
    </form>
  );
}
