"use client";

import { BUSINESS } from "@/lib/business";

// Opens the visitor's texting app with a message to the business phone filled in.
export default function QuoteForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const message = String(f.get("message") || "");
    const body =
      "Free estimate request\n" +
      "Name: " + f.get("name") + "\n" +
      "Phone: " + f.get("phone") + "\n" +
      "Address: " + f.get("address") + "\n" +
      "Service: " + f.get("service") +
      (message ? "\n" + message : "");
    window.location.href = "sms:" + BUSINESS.phone + "?&body=" + encodeURIComponent(body);
  }

  return (
    <form id="quote-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>
      <div className="full">
        <label htmlFor="address">Property address</label>
        <input id="address" name="address" autoComplete="street-address" />
      </div>
      <div className="full">
        <label htmlFor="service">Service needed</label>
        <select id="service" name="service">
          <option>Lawn Service (mowing &amp; trimming)</option>
          <option>Leaf Cleanup</option>
          <option>Snow Removal</option>
          <option>Multiple services</option>
        </select>
      </div>
      <div className="full">
        <label htmlFor="message">Anything else we should know?</label>
        <textarea
          id="message"
          name="message"
          placeholder="Lot size, how often you'd like service, gate codes, etc."
        />
      </div>
      <div className="full">
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
          Text Us for a Free Estimate
        </button>
      </div>
      <p className="form-note full">
        This opens your texting app with your details filled in. On a computer? Just call or text{" "}
        {BUSINESS.phoneDisplay}.
      </p>
    </form>
  );
}
