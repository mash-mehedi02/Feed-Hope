-- Enhanced Database Schema for Feed Hope Food Donation Workflow
-- This script adds the complete workflow system

-- Update food_donations table with new status workflow
ALTER TABLE `food_donations` 
MODIFY COLUMN `status` ENUM('pending', 'available', 'booking', 'running', 'delivered', 'rejected') DEFAULT 'pending';

-- Add new columns for workflow tracking
ALTER TABLE `food_donations` 
ADD COLUMN `admin_approved_by` INT(11) DEFAULT NULL AFTER `status`,
ADD COLUMN `admin_approved_at` DATETIME DEFAULT NULL AFTER `admin_approved_by`,
ADD COLUMN `delivery_accepted_at` DATETIME DEFAULT NULL AFTER `admin_approved_at`,
ADD COLUMN `delivery_started_at` DATETIME DEFAULT NULL AFTER `delivery_accepted_at`,
ADD COLUMN `delivery_completed_at` DATETIME DEFAULT NULL AFTER `delivery_started_at`,
ADD COLUMN `rejection_reason` TEXT DEFAULT NULL AFTER `delivery_completed_at`;

-- Create food_history table for tracking all status changes
CREATE TABLE IF NOT EXISTS `food_history` (
  `history_id` INT(11) NOT NULL AUTO_INCREMENT,
  `donation_id` INT(11) NOT NULL,
  `status_from` VARCHAR(50) DEFAULT NULL,
  `status_to` VARCHAR(50) NOT NULL,
  `changed_by_type` ENUM('user', 'admin', 'delivery_person') NOT NULL,
  `changed_by_id` INT(11) DEFAULT NULL,
  `changed_by_name` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_donation_id` (`donation_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`donation_id`) REFERENCES `food_donations`(`Fid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create delivery_bookings table for managing delivery assignments
CREATE TABLE IF NOT EXISTS `delivery_bookings` (
  `booking_id` INT(11) NOT NULL AUTO_INCREMENT,
  `donation_id` INT(11) NOT NULL,
  `delivery_person_id` INT(11) NOT NULL,
  `booking_status` ENUM('pending', 'accepted', 'rejected', 'completed') DEFAULT 'pending',
  `booking_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `idx_donation_id` (`donation_id`),
  KEY `idx_delivery_person_id` (`delivery_person_id`),
  FOREIGN KEY (`donation_id`) REFERENCES `food_donations`(`Fid`) ON DELETE CASCADE,
  FOREIGN KEY (`delivery_person_id`) REFERENCES `delivery_persons`(`Did`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Update notifications table for workflow
ALTER TABLE `notifications` 
ADD COLUMN `status_from` VARCHAR(50) DEFAULT NULL AFTER `type`,
ADD COLUMN `status_to` VARCHAR(50) DEFAULT NULL AFTER `status_from`,
ADD COLUMN `action_by_type` ENUM('user', 'admin', 'delivery_person') DEFAULT NULL AFTER `status_to`;

-- Insert sample admin user if not exists
INSERT IGNORE INTO `admin` (`name`, `email`, `password`, `location`, `address`) 
VALUES ('Feed Hope Admin', 'admin@feedhope.com', 'admin123', 'Dhaka', 'Admin Office, Dhaka');

-- Insert sample delivery person if not exists
INSERT IGNORE INTO `delivery_persons` (`name`, `email`, `password`, `city`) 
VALUES ('Test Delivery Person', 'delivery@feedhope.com', 'delivery123', 'Dhaka');

-- Create indexes for better performance
CREATE INDEX `idx_food_status` ON `food_donations` (`status`);
CREATE INDEX `idx_food_location` ON `food_donations` (`location`);
CREATE INDEX `idx_food_date` ON `food_donations` (`date`);

-- Show completion message
SELECT 'Food donation workflow database setup completed successfully!' as message;

