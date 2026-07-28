CREATE TABLE `lead_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` text NOT NULL,
	`event` text NOT NULL,
	`channel` text,
	`detail` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`intent` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`destination` text NOT NULL,
	`consent_version` text NOT NULL,
	`delivery_status` text DEFAULT 'accepted' NOT NULL,
	`delivery_channel` text,
	`delivery_attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
