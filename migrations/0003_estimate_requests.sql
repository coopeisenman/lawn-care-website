CREATE TABLE `estimate_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`city` text,
	`service` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'new' NOT NULL,
	`owner_notes` text,
	`customer_id` text,
	`ip_hash` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `estimate_requests_status_idx` ON `estimate_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `estimate_requests_ip_idx` ON `estimate_requests` (`ip_hash`,`created_at`);