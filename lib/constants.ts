// Lists of allowed values, shared by the database and the forms.
export const SERVICE_TYPES = ["lawn", "leaf", "snow", "other"] as const;
export const RECURRENCES = ["none", "weekly", "biweekly", "monthly"] as const;
export const SERVICE_STATUSES = ["scheduled", "completed", "canceled"] as const;
export const INVOICE_STATUSES = ["draft", "open", "paid", "void", "uncollectible"] as const;
export const PAYMENT_METHODS = ["stripe", "cash", "check", "other"] as const;
export const INVOICE_EVENT_TYPES = ["sent", "reminder", "paid", "undone"] as const;
// How something was done: sent / reminded / paid
export const CONTACT_METHODS = ["in_person", "text", "email", "phone", "mail", "other"] as const;
export const REQUEST_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export const REQUEST_SERVICES = ["lawn", "leaf", "snow", "multiple"] as const;
export const SERVICE_AREA_CITIES = ["Millard", "Papillion", "Bellevue", "Plattsmouth", "Other"] as const;
