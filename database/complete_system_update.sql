-- Complete System Update for FeedHope Food Donation System
-- Run this in phpMyAdmin

USE demo;

-- 1. Add food_image column if not exists
ALTER TABLE `food_donations` 
ADD COLUMN IF NOT EXISTS `food_image` VARCHAR(255) DEFAULT NULL;

-- 2. Update status column with new values
ALTER TABLE `food_donations` 
MODIFY COLUMN `status` ENUM('pending','available','assigned','delivered','rejected') DEFAULT 'pending';

-- 3. Add admin approval columns
ALTER TABLE `food_donations` 
ADD COLUMN IF NOT EXISTS `admin_approved_by` INT(11) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `admin_approved_at` DATETIME DEFAULT NULL;

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(255) NOT NULL,
  `donation_id` INT(11) NOT NULL,
  `type` ENUM('new_order','assigned','delivered','status_update') NOT NULL,
  `message` TEXT NOT NULL,
  `status_from` VARCHAR(50) DEFAULT NULL,
  `status_to` VARCHAR(50) DEFAULT NULL,
  `action_by_type` ENUM('admin','delivery_person','user') DEFAULT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Update all existing records
UPDATE `food_donations` SET `status`='pending' WHERE `status` IS NULL;
UPDATE `food_donations` SET `assigned_to`=NULL WHERE `assigned_to`=0;

-- 6. Show results
SELECT 'System updated successfully!' AS Result;
SELECT COUNT(*) as total_donations FROM food_donations;
SELECT COUNT(*) as pending FROM food_donations WHERE status='pending';
SELECT COUNT(*) as available FROM food_donations WHERE status='available';

