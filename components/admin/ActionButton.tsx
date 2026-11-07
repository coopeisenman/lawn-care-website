"use client";

import { useFormStatus } from "react-dom";

function Inner({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "…" : children}
    </button>
  );
}

/** A one-click button that runs a server action, optionally asking "are you sure?" first. */
export default function ActionButton({
  action,
  children,
  confirm,
  className = "btn btn-outline btn-sm",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      className="inline-form"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Inner className={className}>{children}</Inner>
    </form>
  );
}
