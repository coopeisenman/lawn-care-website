"use client";

import { useActionState } from "react";
import { createOwnerAccount, type SetupState } from "./actions";

export default function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(createOwnerAccount, {});
  return (
    <form action={action}>
      {state.error && <div className="notice notice-error">{state.error}</div>}
      <div>
        <label htmlFor="code">Setup code</label>
        <input id="code" name="code" type="password" required autoComplete="off" />
      </div>
      <div>
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password">Password (10+ characters)</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirm">Password again</label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create owner account"}
      </button>
    </form>
  );
}
