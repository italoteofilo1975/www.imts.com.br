PRAGMA foreign_keys = ON;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `correlation_id` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `next_attempt_at` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `lease_owner` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `lease_token` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `lease_expires_at` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `retention_until` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `anonymized_at` text;
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `legal_hold` integer NOT NULL DEFAULT 0 CHECK (`legal_hold` IN (0,1));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leads_correlation_id_idx` ON `leads` (`correlation_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leads_retry_due_idx` ON `leads` (`delivery_status`,`next_attempt_at`,`lease_expires_at`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `lead_events_parent_required`
BEFORE INSERT ON `lead_events`
FOR EACH ROW WHEN NOT EXISTS (SELECT 1 FROM `leads` WHERE `id` = NEW.`lead_id`)
BEGIN
  SELECT RAISE(ABORT, 'lead_events.lead_id has no parent');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `prototype_audit_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `correlation_id` text NOT NULL,
  `actor` text NOT NULL,
  `action` text NOT NULL,
  `resource` text NOT NULL,
  `outcome` text NOT NULL,
  `previous_hash` text NOT NULL,
  `event_hash` text NOT NULL UNIQUE,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `prototype_audit_correlation_idx` ON `prototype_audit_events` (`correlation_id`,`created_at`);
