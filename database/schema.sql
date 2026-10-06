-- ============================================================================
-- ChandranganXSumit Navratrotsav - MySQL / MariaDB schema
-- Compatible with Hostinger shared hosting (MariaDB 10.4+ / MySQL 5.7+)
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+05:30';
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Administrators
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username      VARCHAR(60)      NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  is_active     TINYINT(1)       NOT NULL DEFAULT 1,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Age groups (each group implicitly contains 1st / 2nd / 3rd prize sections)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS age_groups (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(60)   NOT NULL,
  description VARCHAR(255)  NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_age_groups_name (name),
  KEY idx_age_groups_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Participants
--   prize_position is the prize: 1 = 1st, 2 = 2nd, 3 = 3rd
--   The prize is decided by WHERE the participant is added - never assigned later.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  participant_code VARCHAR(16)    NOT NULL,
  name             VARCHAR(120)   NOT NULL,
  normalized_name  VARCHAR(160)   NOT NULL,
  age_group_id     INT UNSIGNED   NOT NULL,
  prize_position   TINYINT UNSIGNED NOT NULL,
  photo_path       VARCHAR(255)   NULL,
  photo_thumb_path VARCHAR(255)   NULL,
  photo_width      SMALLINT UNSIGNED NULL,
  photo_height     SMALLINT UNSIGNED NULL,
  request_id       VARCHAR(64)    NULL,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_participants_code (participant_code),
  UNIQUE KEY uq_participants_request_id (request_id),
  KEY idx_participants_normalized_name (normalized_name),
  KEY idx_participants_group_prize (age_group_id, prize_position),
  KEY idx_participants_created_at (created_at),
  CONSTRAINT fk_participants_age_group
    FOREIGN KEY (age_group_id) REFERENCES age_groups (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Counters (never-reused participant codes: NAV-0001, NAV-0002, ...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  name       VARCHAR(32)          NOT NULL,
  value      BIGINT UNSIGNED      NOT NULL DEFAULT 0,
  updated_at DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED    NULL,
  action      VARCHAR(50)     NOT NULL,
  entity_type VARCHAR(30)     NOT NULL,
  entity_id   INT UNSIGNED    NULL,
  metadata    JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created_at (created_at),
  KEY idx_audit_admin (admin_id),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_admin
    FOREIGN KEY (admin_id) REFERENCES admins (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
