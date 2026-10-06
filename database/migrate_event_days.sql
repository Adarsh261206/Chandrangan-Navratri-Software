-- ----------------------------------------------------------------------------
-- Migration: 9-day Navratri system
--
-- Run this ONLY on a database that was created before the day system existed.
-- Fresh installs just run schema.sql + seed.sql.
--
--   mysql -u <user> -p <database> < database/migrate_event_days.sql
--
-- Existing participants default to Day 1 (day_id = 1).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_days (
  id          TINYINT UNSIGNED NOT NULL,
  label       VARCHAR(30)      NOT NULL,
  event_date  DATE             NOT NULL,
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_days_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO event_days (id, label, event_date, is_active) VALUES
  (1, 'Day 1', '2026-10-11', 1),
  (2, 'Day 2', '2026-10-12', 1),
  (3, 'Day 3', '2026-10-13', 1),
  (4, 'Day 4', '2026-10-14', 1),
  (5, 'Day 5', '2026-10-15', 1),
  (6, 'Day 6', '2026-10-16', 1),
  (7, 'Day 7', '2026-10-17', 1),
  (8, 'Day 8', '2026-10-18', 1),
  (9, 'Day 9', '2026-10-19', 1);

-- Add day_id to participants (existing rows land on Day 1).
-- The statement is written so it can be skipped if day_id already exists.
SET @has_day := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'participants' AND COLUMN_NAME = 'day_id'
);
SET @sql := IF(@has_day = 0,
  'ALTER TABLE participants ADD COLUMN day_id TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER normalized_name',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Foreign key to event_days (skip when it already exists).
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'participants'
    AND CONSTRAINT_NAME = 'fk_participants_day'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE participants ADD CONSTRAINT fk_participants_day FOREIGN KEY (day_id) REFERENCES event_days (id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Replace the old unique key with the day-scoped one (one winner per day/group/prize).
SET @has_old := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'participants'
    AND INDEX_NAME = 'uq_participants_group_prize'
);
SET @sql := IF(@has_old > 0, 'ALTER TABLE participants DROP INDEX uq_participants_group_prize', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_new := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'participants'
    AND INDEX_NAME = 'uq_participants_day_group_prize'
);
SET @sql := IF(@has_new = 0,
  'ALTER TABLE participants ADD UNIQUE KEY uq_participants_day_group_prize (day_id, age_group_id, prize_position)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
