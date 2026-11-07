"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function CustomerLoginForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/portal",
      errorCallbackURL: "/login?error=link",
    });
    // Unknown emails get the same message, so nobody can use this form to
    // check who is a customer. Too many tries is the one error we show.
    setState(error?.status === 429 ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <div className="notice notice-ok">
        If that email belongs to a Westward customer, a login link is on its way. It works for 15 minutes.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {state === "error" && (
        <div className="notice notice-error">Too many tries. Please wait a minute and try again.</div>
      )}
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a login link"}
      </button>
    </form>
  );
}
