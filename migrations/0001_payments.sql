ALTER TABLE `invoices` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `fee_cents` integer;--> statement-breakpoint
CREATE INDEX `invoices_paid_at_idx` ON `invoices` (`paid_at`);