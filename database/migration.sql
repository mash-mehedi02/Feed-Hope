-- Database Migration Script for Feed Hope App
-- This script safely adds new columns to existing tables
-- Run this script to update your database without losing existing data

-- Check if columns exist before adding them
-- This prevents errors if the script is run multiple times

-- Add new columns to food_donations table
SET @sql = 'ALTER TABLE `food_donations` ADD COLUMN `food_image` VARCHAR(255) DEFAULT NULL';
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'food_donations' 
     AND COLUMN_NAME = 'food_image') = 0,
    @sql,
    'SELECT "Column food_image already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `food_donations` ADD COLUMN `status` ENUM("pending", "assigned", "picked_up", "delivered") DEFAULT "pending"';
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'food_donations' 
     AND COLUMN_NAME = 'status') = 0,
    @sql,
    'SELECT "Column status already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `food_donations` ADD COLUMN `tracking_id` VARCHAR(50) DEFAULT NULL';
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'food_donations' 
     AND COLUMN_NAME = 'tracking_id') = 0,
    @sql,
    'SELECT "Column tracking_id already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `food_donations` ADD COLUMN `delivery_status` TEXT DEFAULT NULL';
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'food_donations' 
     AND COLUMN_NAME = 'delivery_status') = 0,
    @sql,
    'SELECT "Column delivery_status already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `food_donations` ADD COLUMN `delivery_timestamp` DATETIME DEFAULT NULL';
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'food_donations' 
     AND COLUMN_NAME = 'delivery_timestamp') = 0,
    @sql,
    'SELECT "Column delivery_timestamp already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `delivery_person_id` int(11) DEFAULT NULL,
  `donation_id` int(11) NOT NULL,
  `type` ENUM('assigned', 'picked_up', 'delivered', 'status_update') NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_email` (`user_email`),
  KEY `idx_donation_id` (`donation_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create delivery_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS `delivery_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `donation_id` int(11) NOT NULL,
  `delivery_person_id` int(11) NOT NULL,
  `status` ENUM('assigned', 'picked_up', 'in_transit', 'delivered') NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_donation_id` (`donation_id`),
  KEY `idx_delivery_person_id` (`delivery_person_id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Generate tracking IDs for existing donations that don't have them
UPDATE `food_donations` 
SET `tracking_id` = CONCAT('FH', DATE_FORMAT(`date`, '%Y%m%d'), LPAD(FLOOR(RAND() * 9999), 4, '0'))
WHERE `tracking_id` IS NULL OR `tracking_id` = '';

-- Set default status for existing donations
UPDATE `food_donations` 
SET `status` = 'pending'
WHERE `status` IS NULL OR `status` = '';

-- Show completion message
SELECT 'Database migration completed successfully!' as message;

