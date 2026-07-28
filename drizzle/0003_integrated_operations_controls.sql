PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `operation_token_jti` (
  `jti` text PRIMARY KEY NOT NULL,
  `subject` text NOT NULL,
  `expires_at` text NOT NULL,
  `consumed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `operation_token_jti_expiry_idx`
ON `operation_token_jti` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `connector_circuit` (
  `connector` text PRIMARY KEY NOT NULL,
  `state` text NOT NULL DEFAULT 'closed' CHECK (`state` IN ('closed','open','half_open')),
  `failures` integer NOT NULL DEFAULT 0 CHECK (`failures` >= 0),
  `opened_at` text,
  `probe_lease` text,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lead_events_created_at_idx`
ON `lead_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `prototype_audit_created_at_idx`
ON `prototype_audit_events` (`created_at`);
