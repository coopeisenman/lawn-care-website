"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/forms";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/** A form that shows the server's error or success message above the fields. */
export default function ActionForm({
  action,
  children,
  className = "admin-form",
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {state.error && <div className="notice notice-error full">{state.error}</div>}
      {state.ok && <div className="notice notice-ok full">{state.ok}</div>}
      {children}
    </form>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
