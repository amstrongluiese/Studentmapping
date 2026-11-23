-- ============================================================================
-- Student Mapping & GIS Registry - High-Scaling MySQL DDL Schema
-- Compatible with MySQL 8.0+, MariaDB 10.5+, phpMyAdmin, MySQL Workbench & DBeaver
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `student_mapping` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `student_mapping`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users & Admin Accounts
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` TEXT NOT NULL,
  `role` VARCHAR(100) NOT NULL DEFAULT 'user',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Directory of Feeder Schools
DROP TABLE IF EXISTS `school_registry`;
CREATE TABLE `school_registry` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(255) NULL,
  `school_name` TEXT NOT NULL,
  `normalized_school_name` VARCHAR(255) NOT NULL DEFAULT '',
  `school_type` VARCHAR(255) NULL,
  `sector` VARCHAR(255) NULL,
  `municipality` VARCHAR(255) NOT NULL DEFAULT 'Unspecified',
  `province` VARCHAR(255) NOT NULL DEFAULT 'Laguna',
  `barangay` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `source` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  `deleted_by` INT NULL,
  INDEX `idx_school_name` (`school_name`(100)),
  INDEX `idx_municipality` (`municipality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 Master Directory of Geocoded Barangays
DROP TABLE IF EXISTS `barangay_registry`;
CREATE TABLE `barangay_registry` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `province` VARCHAR(255) NOT NULL DEFAULT 'Laguna',
  `municipality` VARCHAR(255) NOT NULL,
  `barangay_name` VARCHAR(255) NOT NULL,
  `normalized_name` VARCHAR(255) NOT NULL DEFAULT '',
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_barangay_muni` (`municipality`),
  INDEX `idx_barangay_name` (`barangay_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Referrals & Students
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_number` VARCHAR(255) NOT NULL UNIQUE,
  `name` TEXT NOT NULL,
  `referral_code` VARCHAR(255) NOT NULL UNIQUE,
  `deleted_at` DATETIME NULL,
  `deleted_by` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_id` INT NULL,
  `referred_name` TEXT NOT NULL,
  `relationship` VARCHAR(255) NOT NULL,
  `contact_number` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(100) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  `deleted_by` INT NULL,
  CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admissions Imports
DROP TABLE IF EXISTS `imports`;
CREATE TABLE `imports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `source` VARCHAR(255) NOT NULL DEFAULT 'api',
  `status` VARCHAR(100) NOT NULL DEFAULT 'completed',
  `imported_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `notes` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Raw Student Records
DROP TABLE IF EXISTS `students_raw`;
CREATE TABLE `students_raw` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `import_id` INT NULL,
  `student_number` VARCHAR(255) NOT NULL,
  `full_name` TEXT NOT NULL,
  `course` VARCHAR(255) NULL,
  `strand` VARCHAR(255) NULL,
  `last_school_name` TEXT NOT NULL,
  `last_school_type` VARCHAR(255) NULL,
  `student_type` VARCHAR(255) NULL,
  `municipality` VARCHAR(255) NOT NULL DEFAULT 'Unspecified',
  `province` VARCHAR(255) NOT NULL DEFAULT 'Laguna',
  `barangay` VARCHAR(255) NULL,
  `previous_school` TEXT NULL,
  `contact_number` VARCHAR(100) NULL,
  `schedule` VARCHAR(255) NULL,
  `iskolar_ni_kap` VARCHAR(255) NULL,
  `requirements` TEXT NULL,
  `year_level` VARCHAR(100) NULL,
  `raw_payload` TEXT NULL,
  `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_students_raw_import` FOREIGN KEY (`import_id`) REFERENCES `imports` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Student Imports Staging
DROP TABLE IF EXISTS `student_imports`;
CREATE TABLE `student_imports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_number` VARCHAR(255) NOT NULL,
  `full_name` TEXT NOT NULL,
  `previous_school` TEXT NULL,
  `strand` VARCHAR(255) NULL,
  `admission_type` VARCHAR(255) NULL,
  `program` VARCHAR(255) NULL,
  `scholarship` VARCHAR(255) NULL,
  `municipality` VARCHAR(255) NOT NULL DEFAULT 'Unspecified',
  `barangay` VARCHAR(255) NULL,
  `imported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `import_source` VARCHAR(255) NOT NULL,
  `import_status` VARCHAR(100) NOT NULL DEFAULT 'Pending',
  `matched_school_id` INT NULL,
  `match_confidence` INT NULL,
  `match_rule` VARCHAR(255) NULL,
  `enrollment_status` VARCHAR(100) NOT NULL DEFAULT 'Unknown',
  INDEX `idx_import_status` (`import_status`),
  INDEX `idx_student_no` (`student_number`),
  CONSTRAINT `fk_student_imports_school` FOREIGN KEY (`matched_school_id`) REFERENCES `school_registry` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Processed GIS Student Records
DROP TABLE IF EXISTS `students_processed`;
CREATE TABLE `students_processed` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `raw_id` INT NULL,
  `student_number` VARCHAR(255) NOT NULL,
  `full_name` TEXT NOT NULL,
  `course` VARCHAR(255) NULL,
  `strand` VARCHAR(255) NULL,
  `admission_type` VARCHAR(255) NULL,
  `last_school_name` TEXT NOT NULL,
  `previous_school` TEXT NULL,
  `contact_number` VARCHAR(100) NULL,
  `schedule` VARCHAR(255) NULL,
  `iskolar_ni_kap` VARCHAR(255) NULL,
  `requirements` TEXT NULL,
  `last_school_type` VARCHAR(255) NULL,
  `school_registry_id` INT NULL,
  `municipality` VARCHAR(255) NOT NULL DEFAULT 'Unspecified',
  `province` VARCHAR(255) NOT NULL DEFAULT 'Laguna',
  `barangay` VARCHAR(255) NULL,
  `year_level` VARCHAR(100) NULL,
  `enrollment_status` VARCHAR(100) NOT NULL DEFAULT 'Active',
  `enrollment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `imported_source` VARCHAR(255) NOT NULL DEFAULT 'API',
  `archived_at` DATETIME NULL,
  `mapping_status` VARCHAR(100) NOT NULL DEFAULT 'pending',
  `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_proc_school` (`school_registry_id`),
  INDEX `idx_proc_student_no` (`student_number`),
  INDEX `idx_proc_mun_course` (`municipality`, `course`),
  CONSTRAINT `fk_students_proc_raw` FOREIGN KEY (`raw_id`) REFERENCES `students_raw` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_students_proc_school` FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. College Departments
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `name` TEXT NOT NULL,
  `color` VARCHAR(50) NOT NULL,
  `target_value` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Academic Programs
DROP TABLE IF EXISTS `programs`;
CREATE TABLE `programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `department_id` INT NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `name` TEXT NOT NULL,
  `track` VARCHAR(255) NULL,
  `level` VARCHAR(100) NOT NULL DEFAULT 'Bachelor',
  `color` VARCHAR(50) NOT NULL,
  `target_value` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_programs_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. School Aliases
DROP TABLE IF EXISTS `school_aliases`;
CREATE TABLE `school_aliases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_registry_id` INT NOT NULL,
  `alias_name` TEXT NOT NULL,
  `normalized_alias` VARCHAR(255) NOT NULL UNIQUE,
  `confidence` INT NOT NULL DEFAULT 100,
  `source` VARCHAR(100) NOT NULL DEFAULT 'Manual',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_aliases_school` FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. School Match History
DROP TABLE IF EXISTS `school_match_history`;
CREATE TABLE `school_match_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `imported_name` TEXT NOT NULL,
  `official_school_id` INT NULL,
  `resolved_by` VARCHAR(100) NOT NULL DEFAULT 'Admin',
  `occurrences` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_match_hist_school` FOREIGN KEY (`official_school_id`) REFERENCES `school_registry` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. System Settings
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `key` VARCHAR(255) PRIMARY KEY,
  `value` TEXT NOT NULL,
  `description` TEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Audit Logs for DPA Compliance
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor` VARCHAR(255) NOT NULL DEFAULT 'System',
  `role` VARCHAR(100) NOT NULL DEFAULT 'User',
  `action` VARCHAR(100) NOT NULL,
  `target_resource` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(100) NULL,
  `status` VARCHAR(100) NOT NULL DEFAULT 'SUCCESS',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_actor` (`actor`),
  INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Data Access Logs for DPA Compliance (PII access)
DROP TABLE IF EXISTS `data_access_logs`;
CREATE TABLE `data_access_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action` TEXT NOT NULL,
  `target_table` TEXT NOT NULL,
  `record_id` TEXT NULL,
  `ip_address` TEXT NULL,
  `accessed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Public (Non-Student) Referrals
DROP TABLE IF EXISTS `public_referrals`;
CREATE TABLE `public_referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_name` VARCHAR(255) NOT NULL,
  `referrer_contact` VARCHAR(100) NULL,
  `referred_name` TEXT NOT NULL,
  `relationship` VARCHAR(255) NOT NULL,
  `contact_number` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(100) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  `deleted_by` INT NULL,
  INDEX `idx_public_referrals_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
