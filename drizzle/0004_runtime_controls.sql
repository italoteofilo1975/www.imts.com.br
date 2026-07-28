PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limit_windows` (
  `route` text NOT NULL,
  `subject_hash` text NOT NULL,
  `window_start` text NOT NULL,
  `count` integer NOT NULL DEFAULT 0 CHECK (`count` >= 0),
  `updated_at` text NOT NULL,
  PRIMARY KEY (`route`,`subject_hash`,`window_start`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limit_windows_cleanup_idx`
ON `rate_limit_windows` (`updated_at`);
