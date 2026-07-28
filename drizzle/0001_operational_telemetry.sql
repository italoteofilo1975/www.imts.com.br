CREATE TABLE IF NOT EXISTS `site_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `event` text NOT NULL,
  `path` text DEFAULT '' NOT NULL,
  `properties` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `site_events_created_at_idx` ON `site_events` (`created_at`);
