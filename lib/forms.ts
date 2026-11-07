// Small helpers for reading and checking form fields on the server.

export class FormError extends Error {}

export function text(form: FormData, name: string, opts: { required?: string; max?: number } = {}) {
  const value = String(form.get(name) ?? "").trim();
  if (!value && opts.required) throw new FormError(opts.required);
  if (value.length > (opts.max ?? 2000)) throw new FormError(`That ${name} is too long.`);
  return value || null;
}

export function requiredText(form: FormData, name: string, message: string, max?: number) {
  return text(form, name, { required: message, max }) as string;
}

/** "45", "45.5", "$1,200.00" → cents. */
export function moneyToCents(form: FormData, name: string, label = "price") {
  const raw = String(form.get(name) ?? "").replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new FormError(`Enter a ${label} like 45 or 45.50.`);
  const cents = Math.round(parseFloat(raw) * 100);
  if (cents <= 0 || cents > 10_000_000) throw new FormError(`Enter a ${label} between $0.01 and $100,000.`);
  return cents;
}

export function dateField(form: FormData, name: string, message = "Pick a date.") {
  const raw = String(form.get(name) ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || isNaN(Date.parse(raw))) throw new FormError(message);
  return raw;
}

export function oneOf<T extends readonly string[]>(form: FormData, name: string, options: T, message: string): T[number] {
  const raw = String(form.get(name) ?? "");
  if (!options.includes(raw)) throw new FormError(message);
  return raw as T[number];
}

export function email(form: FormData, name: string) {
  const value = text(form, name, { max: 254 });
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new FormError("That email address doesn't look right.");
  return value.toLowerCase();
}

export type ActionState = { error?: string; ok?: string };

/** Runs a form action and turns FormErrors into a message shown on the form. */
export async function handle(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? {};
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e; // includes Next.js redirects
  }
}
