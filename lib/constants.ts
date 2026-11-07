// Lists of allowed values, shared by the database and the forms.
export const SERVICE_TYPES = ["lawn", "leaf", "snow", "other"] as const;
export const RECURRENCES = ["none", "weekly", "biweekly", "monthly"] as const;
export const SERVICE_STATUSES = ["scheduled", "completed", "canceled"] as const;
export const INVOICE_STATUSES = ["draft", "open", "paid", "void", "uncollectible"] as const;
